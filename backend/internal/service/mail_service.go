package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/smtp"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"tourni-backend/internal/config"
)

type otpItem struct {
	code      string
	expiresAt time.Time
}

type MailService struct {
	redis     *redis.Client
	cfg       *config.Config
	memCache  map[string]otpItem
	cacheLock sync.RWMutex
}

func NewMailService(redis *redis.Client, cfg *config.Config) *MailService {
	return &MailService{
		redis:    redis,
		cfg:      cfg,
		memCache: make(map[string]otpItem),
	}
}

// GenerateOTP creates a secure 6-digit random code
func (s *MailService) GenerateOTP() string {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "123456"
	}
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

// SendVerificationOTP generates and sends an OTP code (Resend in prod, Mailpit in local dev)
func (s *MailService) SendVerificationOTP(ctx context.Context, email string) error {
	otp := s.GenerateOTP()

	// 1. Try Redis with in-memory fallback
	savedInRedis := false
	if s.redis != nil {
		redisKey := fmt.Sprintf("otp:verify:%s", email)
		err := s.redis.Set(ctx, redisKey, otp, 3*time.Minute).Err()
		if err == nil {
			savedInRedis = true
		} else {
			log.Printf("⚠️ Redis unreachable (%v), falling back to in-memory OTP cache", err)
		}
	}

	if !savedInRedis {
		s.cacheLock.Lock()
		s.memCache[email] = otpItem{
			code:      otp,
			expiresAt: time.Now().Add(3 * time.Minute),
		}
		s.cacheLock.Unlock()
	}

	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
			<h2 style="color: #00C49A; text-align: center;">Tourni</h2>
			<p style="font-size: 16px; color: #333;">สวัสดีครับ,</p>
			<p style="font-size: 14px; color: #555;">รหัสยืนยัน OTP 6 หลักของคุณคือ:</p>
			<div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #111; border-radius: 6px; margin: 20px 0;">
				%s
			</div>
			<p style="font-size: 13px; color: #888;">รหัสนี้มีอายุการใช้งาน 3 นาที หากคุณไม่ได้ทำรายการ โปรดเพิกเฉยต่ออีเมลนี้</p>
		</div>
	`, otp)

	// 2. If Resend API Key is provided, use Resend API
	if s.cfg.ResendAPIKey != "" {
		return s.sendResendEmail(email, "Your Tourni Verification Code", htmlContent)
	}

	// 3. Otherwise, send to Mailpit via SMTP in local development
	log.Printf("📧 [DEV MODE] Sending OTP %s to %s via Mailpit", otp, email)
	return s.sendSMTPEmail(email, "Your Tourni Verification Code", htmlContent)
}

func (s *MailService) sendSMTPEmail(to, subject, htmlContent string) error {
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)

	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-version: 1.0;\r\n"+
		"Content-Type: text/html; charset=\"UTF-8\";\r\n\r\n"+
		"%s\r\n", s.cfg.ResendFromEmail, to, subject, htmlContent))

	err := smtp.SendMail(addr, nil, "no-reply@leagueflow.io", []string{to}, msg)
	if err != nil {
		log.Printf("⚠️ SMTP sending warning: %v (logged OTP to console)", err)
		return nil
	}

	log.Printf("📧 Email delivered to Mailpit for %s", to)
	return nil
}

// VerifyOTP checks if the provided OTP matches what is stored in Redis or in-memory
func (s *MailService) VerifyOTP(ctx context.Context, email, otp string) (bool, error) {
	// 1. Try Redis first if available
	if s.redis != nil {
		redisKey := fmt.Sprintf("otp:verify:%s", email)
		storedOTP, err := s.redis.Get(ctx, redisKey).Result()
		if err == nil {
			if storedOTP != otp {
				return false, errors.New("incorrect OTP code")
			}
			_ = s.redis.Del(ctx, redisKey).Err()
			verifiedKey := fmt.Sprintf("email:verified:%s", email)
			_ = s.redis.Set(ctx, verifiedKey, "true", 15*time.Minute).Err()
			return true, nil
		}
	}

	// 2. Fallback to in-memory cache
	s.cacheLock.Lock()
	defer s.cacheLock.Unlock()

	item, exists := s.memCache[email]
	if !exists || time.Now().After(item.expiresAt) {
		delete(s.memCache, email)
		return false, errors.New("OTP has expired or is invalid")
	}

	if item.code != otp {
		return false, errors.New("incorrect OTP code")
	}

	delete(s.memCache, email)
	// Mark email as verified in-memory for 15 minutes
	s.memCache["verified:"+email] = otpItem{
		code:      "true",
		expiresAt: time.Now().Add(15 * time.Minute),
	}
	return true, nil
}

// IsEmailVerified checks whether email was successfully verified by OTP recently
func (s *MailService) IsEmailVerified(ctx context.Context, email string) bool {
	if s.redis != nil {
		verifiedKey := fmt.Sprintf("email:verified:%s", email)
		val, err := s.redis.Get(ctx, verifiedKey).Result()
		if err == nil && val == "true" {
			return true
		}
	}

	s.cacheLock.RLock()
	defer s.cacheLock.RUnlock()
	item, exists := s.memCache["verified:"+email]
	return exists && time.Now().Before(item.expiresAt)
}

func (s *MailService) sendResendEmail(to, subject, htmlContent string) error {
	payload := map[string]interface{}{
		"from":    s.cfg.ResendFromEmail,
		"to":      []string{to},
		"subject": subject,
		"html":    htmlContent,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+s.cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email via Resend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("resend API error: %v", errResp)
	}

	log.Printf("📧 Email delivered via Resend API to %s", to)
	return nil
}
