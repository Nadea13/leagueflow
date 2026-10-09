package database

import (
	"context"
	"fmt"
	"log"
	"time"

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
