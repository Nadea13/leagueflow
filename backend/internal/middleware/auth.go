package middleware

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"leagueflow-backend/internal/config"
	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/service"
)

type ContextKey string

const (
	ContextKeyUserID ContextKey = "user_id"
	ContextKeyRole   ContextKey = "role"
)

func GetUserFromContext(ctx context.Context) (*uuid.UUID, string) {
	if uID, ok := ctx.Value(ContextKeyUserID).(uuid.UUID); ok && uID != uuid.Nil {
		role, _ := ctx.Value(ContextKeyRole).(string)
		return &uID, role
	}
	return nil, ""
}

func Protected(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization token format (Bearer <token> required)",
			})
		}

		tokenString := parts[1]
		token, err := jwt.ParseWithClaims(tokenString, &service.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired access token",
			})
		}

		claims, ok := token.Claims.(*service.JWTClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		// Store user context
		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		userCtx := context.WithValue(c.UserContext(), ContextKeyUserID, claims.UserID)
		userCtx = context.WithValue(userCtx, ContextKeyRole, string(claims.Role))
		c.SetUserContext(userCtx)

		return c.Next()
	}
}

func OptionalAuth(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" && parts[1] != "" {
			tokenString := parts[1]
			token, err := jwt.ParseWithClaims(tokenString, &service.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(*service.JWTClaims); ok {
					c.Locals("user_id", claims.UserID)
					c.Locals("email", claims.Email)
					c.Locals("role", claims.Role)

					userCtx := context.WithValue(c.UserContext(), ContextKeyUserID, claims.UserID)
					userCtx = context.WithValue(userCtx, ContextKeyRole, string(claims.Role))
					c.SetUserContext(userCtx)
				}
			}
		}

		return c.Next()
	}
}

func RequireRole(allowedRoles ...model.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(model.UserRole)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Permission denied: unable to determine user role",
			})
		}

		for _, allowed := range allowedRoles {
			if role == allowed || role == model.RoleSuperAdmin {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Permission denied: insufficient role privileges",
		})
	}
}
