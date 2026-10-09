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
	SMTPHost         string
	SMTPPort         string
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

	return &Config{
		Port:             port,
		DatabaseURL:      dbURL,
		RedisURL:         redisURL,
		JWTSecret:        jwtSecret,
		JWTRefreshSecret: jwtRefreshSecret,
		CORSOrigins:      corsOrigins,
		ResendAPIKey:     resendAPIKey,
		ResendFromEmail:  resendFromEmail,
		SMTPHost:         smtpHost,
		SMTPPort:         smtpPort,
	}
}
