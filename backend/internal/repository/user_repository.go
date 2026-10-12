package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"leagueflow-backend/internal/model"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (email, password_hash, full_name, avatar_url, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, is_active, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query, user.Email, user.PasswordHash, user.FullName, user.AvatarURL, user.Role).
		Scan(&user.ID, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, avatar_url, role, phone, is_active, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	var user model.User
	err := r.db.QueryRow(ctx, query, email).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.AvatarURL, &user.Role, &user.Phone, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, avatar_url, role, phone, is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user model.User
	err := r.db.QueryRow(ctx, query, id).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.AvatarURL, &user.Role, &user.Phone, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}
	return &user, nil
}

func (r *UserRepository) UpdatePassword(ctx context.Context, email, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = NOW()
		WHERE email = $2
	`
	result, err := r.db.Exec(ctx, query, passwordHash, email)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("user with email %s not found", email)
	}
	return nil
}

func (r *UserRepository) UpdateProfile(ctx context.Context, id uuid.UUID, fullName string, phone *string, avatarURL *string) (*model.User, error) {
	query := `
		UPDATE users
		SET full_name = $1, phone = $2, avatar_url = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING id, email, password_hash, full_name, avatar_url, role, phone, is_active, created_at, updated_at
	`
	var user model.User
	err := r.db.QueryRow(ctx, query, fullName, phone, avatarURL, id).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.AvatarURL, &user.Role, &user.Phone, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update user profile: %w", err)
	}
	return &user, nil
}

