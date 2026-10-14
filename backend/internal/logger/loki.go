package logger

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type lokiStream struct {
	Stream map[string]string `json:"stream"`
	Values [][]string        `json:"values"`
}

type lokiPushPayload struct {
	Streams []lokiStream `json:"streams"`
}

type LokiClient struct {
	url        string
	authHeader string
	buffer     []lokiStream
	mu         sync.Mutex
	httpClient *http.Client
	stopChan   chan struct{}
}

var (
	globalLoki *LokiClient
	once       sync.Once
)

// InitLoki initializes the background log forwarder to Grafana Loki
func InitLoki(rawURL, user, token string) *LokiClient {
	if rawURL == "" || user == "" || token == "" {
		return nil
	}

	pushURL := strings.TrimRight(rawURL, "/")
	if !strings.HasSuffix(pushURL, "/loki/api/v1/push") {
		pushURL = pushURL + "/loki/api/v1/push"
	}

	auth := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", user, token)))

	client := &LokiClient{
		url:        pushURL,
		authHeader: "Basic " + auth,
		buffer:     make([]lokiStream, 0, 50),
		httpClient: &http.Client{Timeout: 5 * time.Second},
		stopChan:   make(chan struct{}),
	}

	// Start background batch flusher (every 3 seconds)
	go client.startFlusher()

	globalLoki = client
	return client
}

func (l *LokiClient) Push(level, message string, labels map[string]string) {
	if l == nil {
		return
	}

	streamLabels := map[string]string{
		"app":    "leagueflow",
		"env":    "production",
		"source": "backend",
		"level":  level,
	}
	for k, v := range labels {
		streamLabels[k] = v
	}

	nanoTime := fmt.Sprintf("%d", time.Now().UnixNano())

	l.mu.Lock()
	l.buffer = append(l.buffer, lokiStream{
		Stream: streamLabels,
		Values: [][]string{{nanoTime, message}},
	})
	shouldFlush := len(l.buffer) >= 30
	l.mu.Unlock()

	if shouldFlush {
		go l.flush()
	}
}

func (l *LokiClient) startFlusher() {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			l.flush()
		case <-l.stopChan:
			l.flush()
			return
		}
	}
}

func (l *LokiClient) flush() {
	l.mu.Lock()
	if len(l.buffer) == 0 {
		l.mu.Unlock()
		return
	}
	payload := lokiPushPayload{Streams: l.buffer}
	l.buffer = make([]lokiStream, 0, 50)
	l.mu.Unlock()

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return
	}

	req, err := http.NewRequest(http.MethodPost, l.url, bytes.NewReader(bodyBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", l.authHeader)

	resp, err := l.httpClient.Do(req)
	if err == nil && resp != nil {
		_ = resp.Body.Close()
	}
}

// FiberMiddleware logs HTTP requests and flushes errors to Loki asynchronously
func FiberMiddleware(l *LokiClient) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		latency := time.Since(start)

		if l != nil {
			status := c.Response().StatusCode()
			method := c.Method()
			path := c.Path()

			level := "info"
			if status >= 400 && status < 500 {
				level = "warn"
			} else if status >= 500 {
				level = "error"
			}

			msg := fmt.Sprintf("[%s] %s | %d | %v | IP: %s", method, path, status, latency, c.IP())
			labels := map[string]string{
				"method": method,
				"status": fmt.Sprintf("%d", status),
			}

			l.Push(level, msg, labels)
		}

		return err
	}
}
