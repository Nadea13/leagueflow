package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RunMigrations automatically scans and applies all .up.sql files in alphabetical order
func RunMigrations(pool *pgxpool.Pool, migrationsDir string) error {
	ctx := context.Background()

	// 1. Create migrations tracking table if not exists
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`
	if _, err := pool.Exec(ctx, createTableSQL); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// 2. Read migration files
	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		log.Printf("⚠️ Migrations directory not found at '%s', skipping auto-migrations: %v", migrationsDir, err)
		return nil
	}

	var upFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".up.sql") {
			upFiles = append(upFiles, f.Name())
		}
	}
	sort.Strings(upFiles)

	// 3. Apply pending migrations
	for _, file := range upFiles {
		var exists bool
		err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", file).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration status for %s: %w", file, err)
		}

		if exists {
			continue // Already applied
		}

		log.Printf(" Migrating: applying %s...", file)
		filePath := filepath.Join(migrationsDir, file)
		sqlContent, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		// Execute SQL in a transaction
		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to begin transaction for %s: %w", file, err)
		}

		if _, err := tx.Exec(ctx, string(sqlContent)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed to execute migration %s: %w", file, err)
		}

		if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", file); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed to record migration %s: %w", file, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", file, err)
		}

		log.Printf(" Migrated: %s successfully applied", file)
	}

	log.Println(" All database migrations are up to date!")
	return nil
}
