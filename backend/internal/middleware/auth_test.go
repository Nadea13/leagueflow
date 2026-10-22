package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"leagueflow-backend/internal/config"
	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/service"
)

func generateTestToken(secret string, userID uuid.UUID, email string, role model.UserRole, expiry time.Duration) string {
	claims := &service.JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))
	return tokenStr
}

func TestProtectedMiddleware(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "super-secret-test-key-12345",
	}

	app := fiber.New()
	app.Get("/protected", Protected(cfg), func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"user_id": c.Locals("user_id"),
			"email":   c.Locals("email"),
			"role":    c.Locals("role"),
		})
	})

	t.Run("Missing Authorization Header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("Malformed Authorization Header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "InvalidFormat123")
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("Expired JWT Token", func(t *testing.T) {
		token := generateTestToken(cfg.JWTSecret, uuid.New(), "expired@test.com", model.RoleOrganizer, -1*time.Hour)
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("Invalid Secret Signature", func(t *testing.T) {
		token := generateTestToken("wrong-secret-signature", uuid.New(), "hacker@test.com", model.RoleOrganizer, 1*time.Hour)
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", resp.StatusCode)
		}
	})

	t.Run("Valid Token Access", func(t *testing.T) {
		userID := uuid.New()
		token := generateTestToken(cfg.JWTSecret, userID, "user@test.com", model.RoleOrganizer, 1*time.Hour)
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})
}

func TestRequireRoleMiddleware(t *testing.T) {
	app := fiber.New()
	app.Get("/admin-only", func(c *fiber.Ctx) error {
		role := c.Get("X-Mock-Role")
		if role != "" {
			c.Locals("role", model.UserRole(role))
		}
		return c.Next()
	}, RequireRole(model.RoleOrganizer), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	t.Run("No Role In Context", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin-only", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("expected status 403, got %d", resp.StatusCode)
		}
	})

	t.Run("Forbidden Role", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin-only", nil)
		req.Header.Set("X-Mock-Role", string(model.RoleUser))
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("expected status 403, got %d", resp.StatusCode)
		}
	})

	t.Run("Allowed Role (Organizer)", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin-only", nil)
		req.Header.Set("X-Mock-Role", string(model.RoleOrganizer))
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("SuperAdmin Always Allowed", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin-only", nil)
		req.Header.Set("X-Mock-Role", string(model.RoleSuperAdmin))
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != fiber.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})
}
