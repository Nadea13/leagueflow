package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"leagueflow-backend/internal/config"
	"leagueflow-backend/internal/model"
	"leagueflow-backend/internal/repository"
)

type AuthService struct {
	userRepo *repository.UserRepository
	redis    *redis.Client
	cfg      *config.Config
}

func NewAuthService(userRepo *repository.UserRepository, redis *redis.Client, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		redis:    redis,
		cfg:      cfg,
	}
}

type RegisterInput struct {
	Email    string         `json:"email"`
	Password string         `json:"password"`
	FullName string         `json:"full_name"`
	Role     model.UserRole `json:"role"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         *model.User `json:"user"`
}

type JWTClaims struct {
	UserID uuid.UUID      `json:"user_id"`
	Email  string         `json:"email"`
	Role   model.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*AuthResponse, error) {
	existing, err := s.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email is already registered")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	role := input.Role
	if role == "" {
		role = model.RoleUser
	}

	user := &model.User{
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		FullName:     input.FullName,
		Role:         role,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return s.generateTokens(ctx, user)
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (*AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, errors.New("account is disabled")
	}

	return s.generateTokens(ctx, user)
}

func (s *AuthService) ResetPassword(ctx context.Context, email, newPassword string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user with this email does not exist")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	return s.userRepo.UpdatePassword(ctx, email, string(hashedPassword))
}

func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	return s.userRepo.UpdatePassword(ctx, user.Email, string(hashedPassword))
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string) (*AuthResponse, error) {
	// Parse refresh token
	token, err := jwt.ParseWithClaims(refreshTokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTRefreshSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired refresh token")
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	return s.generateTokens(ctx, user)
}

func (s *AuthService) generateTokens(ctx context.Context, user *model.User) (*AuthResponse, error) {
	// 1. Access Token (7 days)
	accessClaims := &JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "leagueflow-backend",
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenStr, err := accessToken.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// 2. Refresh Token (30 days)
	refreshClaims := &JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "leagueflow-backend",
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenStr, err := refreshToken.SignedString([]byte(s.cfg.JWTRefreshSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &AuthResponse{
		AccessToken:  accessTokenStr,
		RefreshToken: refreshTokenStr,
		User:         user,
	}, nil
}
