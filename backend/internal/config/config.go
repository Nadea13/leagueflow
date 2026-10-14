package config

import (
	"os"
)

type Config struct {
	Port             string
	DatabaseURL      string
	RedisURL         string
	JWTSecret        string
	JWTRefreshSecret string
	CORSOrigins      string
	ResendAPIKey     string
	ResendFromEmail  string
	SMTPHost           string
	SMTPPort           string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FrontendURL        string
	LokiURL            string
	LokiUser           string
	LokiToken          string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgrespassword@localhost:5432/leagueflow?sslmode=disable"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "leagueflow-jwt-secret-key-default"
	}

	jwtRefreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	if jwtRefreshSecret == "" {
		jwtRefreshSecret = "leagueflow-jwt-refresh-secret-key-default"
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "*"
	}

	resendAPIKey := os.Getenv("RESEND_API_KEY")
	resendFromEmail := os.Getenv("RESEND_FROM_EMAIL")
	if resendFromEmail == "" {
		resendFromEmail = "LeagueFlow <onboarding@resend.dev>"
	}

	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		smtpHost = "mailpit"
	}

	smtpPort := os.Getenv("SMTP_PORT")
	if smtpPort == "" {
		smtpPort = "1025"
	}

	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if googleRedirectURL == "" {
		googleRedirectURL = "https://leagueflow-v80x.onrender.com/api/v1/auth/google/callback"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://leagueflow.vercel.app"
	}

	return &Config{
		Port:               port,
		DatabaseURL:        dbURL,
		RedisURL:           redisURL,
		JWTSecret:          jwtSecret,
		JWTRefreshSecret:   jwtRefreshSecret,
		CORSOrigins:        corsOrigins,
		ResendAPIKey:       resendAPIKey,
		ResendFromEmail:    resendFromEmail,
		SMTPHost:           smtpHost,
		SMTPPort:           smtpPort,
		GoogleClientID:     googleClientID,
		GoogleClientSecret: googleClientSecret,
		GoogleRedirectURL:  googleRedirectURL,
		FrontendURL:        frontendURL,
		LokiURL:            os.Getenv("LOKI_URL"),
		LokiUser:           os.Getenv("LOKI_USER"),
		LokiToken:          os.Getenv("LOKI_TOKEN"),
	}
}
