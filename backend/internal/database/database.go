package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Database struct {
	Pool  *pgxpool.Pool
	Redis *redis.Client
}

func ConnectPostgres(dbURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse postgres config: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	var pool *pgxpool.Pool
	maxRetries := 15
	for i := 1; i <= maxRetries; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		pool, err = pgxpool.NewWithConfig(ctx, config)
		if err == nil {
			if err = pool.Ping(ctx); err == nil {
				cancel()
				log.Println(" Connected to PostgreSQL successfully")
				return pool, nil
			}
			pool.Close()
		}
		cancel()
		log.Printf("⏳ Waiting for PostgreSQL to be ready (attempt %d/%d): %v", i, maxRetries, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to postgres after %d attempts: %w", maxRetries, err)
}

func ConnectRedis(redisURL string) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	maxRetries := 5
	for i := 1; i <= maxRetries; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		err := client.Ping(ctx).Err()
		cancel()
		if err == nil {
			log.Println(" Connected to Redis successfully")
			return client
		}
		time.Sleep(1 * time.Second)
	}

	log.Println("⚠️ Redis connection warning: continuing without redis cache")
	return client
}

// WithUserContext executes a database transaction with app.current_user_id and app.current_user_role set locally.
func WithUserContext(ctx context.Context, pool *pgxpool.Pool, userID *uuid.UUID, role string, fn func(tx pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if userID != nil {
		if _, err := tx.Exec(ctx, "SELECT set_config('app.current_user_id', $1, true), set_config('app.current_user_role', $2, true)", userID.String(), role); err != nil {
			return fmt.Errorf("failed to set user session context: %w", err)
		}
	}

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// StartPurgeWorker runs app.purge_soft_deleted_records in the background periodically.
func StartPurgeWorker(pool *pgxpool.Pool, interval time.Duration) {
	go func() {
		// Wait 1 minute after startup before initial run
		time.Sleep(1 * time.Minute)
		runPurge(pool)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			runPurge(pool)
		}
	}()
}

func runPurge(pool *pgxpool.Pool) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var result string
	err := pool.QueryRow(ctx, "SELECT app.purge_soft_deleted_records()::text").Scan(&result)
	if err != nil {
		log.Printf("⚠️ Soft-delete purge worker: %v", err)
	} else {
		log.Printf("🧹 Soft-delete purge executed successfully: %s", result)
	}
}


