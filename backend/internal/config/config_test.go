package config

import (
	"os"
	"testing"
)

func TestLoadConfigDefaults(t *testing.T) {
	// Clear relevant env vars
	os.Unsetenv("PORT")
	os.Unsetenv("JWT_SECRET")

	cfg := LoadConfig()

	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %s", cfg.Port)
	}
	if cfg.JWTSecret != "tourni-jwt-secret-key-default" {
		t.Errorf("expected default jwt secret, got %s", cfg.JWTSecret)
	}
	if cfg.FrontendURL != "https://leagueflow.vercel.app" {
		t.Errorf("expected default frontend url https://leagueflow.vercel.app, got %s", cfg.FrontendURL)
	}
}

func TestLoadConfigCustomEnv(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("JWT_SECRET", "custom-secret-key-123")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("JWT_SECRET")
	}()

	cfg := LoadConfig()

	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.Port)
	}
	if cfg.JWTSecret != "custom-secret-key-123" {
		t.Errorf("expected custom secret key, got %s", cfg.JWTSecret)
	}
}
