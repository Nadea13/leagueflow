package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"tourni-backend/internal/model"
)

type StandingsRepository struct {
	db *pgxpool.Pool
}

func NewStandingsRepository(db *pgxpool.Pool) *StandingsRepository {
	return &StandingsRepository{db: db}
}

func (r *StandingsRepository) GetByCategory(ctx context.Context, categoryID uuid.UUID) ([]*model.Standing, error) {
	query := `
		SELECT s.id, s.tournament_category_id, s.group_name, s.node_id, s.team_id,
		       s.played, s.won, s.drawn, s.lost, s.goals_for, s.goals_against, s.goal_diff,
		       s.points, s.rank, s.updated_at,
		       t.id, t.name, t.short_name, t.logo_url
		FROM standings s
		LEFT JOIN teams t ON s.team_id = t.id
		WHERE s.tournament_category_id = $1
		ORDER BY s.group_name ASC, s.rank ASC
	`
	rows, err := r.db.Query(ctx, query, categoryID)
	if err != nil {
		return nil, fmt.Errorf("failed to query standings: %w", err)
	}
	defer rows.Close()

	list := make([]*model.Standing, 0)
	for rows.Next() {
		var s model.Standing
		var tID *uuid.UUID
		var tName, tShort, tLogo *string

		if err := rows.Scan(
			&s.ID, &s.TournamentCategoryID, &s.GroupName, &s.NodeID, &s.TeamID,
			&s.Played, &s.Won, &s.Drawn, &s.Lost, &s.GoalsFor, &s.GoalsAgainst, &s.GoalDiff,
			&s.Points, &s.Rank, &s.UpdatedAt,
			&tID, &tName, &tShort, &tLogo,
		); err != nil {
			return nil, err
		}

		if tID != nil && tName != nil {
			s.Team = &model.Team{ID: *tID, Name: *tName, ShortName: tShort, LogoURL: tLogo}
		}
		list = append(list, &s)
	}
	return list, nil
}

func (r *StandingsRepository) UpsertStandings(ctx context.Context, standings []model.Standing) error {
	if len(standings) == 0 {
		return nil
	}

	query := `
		INSERT INTO standings (
			tournament_category_id, group_name, node_id, team_id,
			played, won, drawn, lost, goals_for, goals_against, goal_diff,
			points, rank, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
		ON CONFLICT (tournament_category_id, group_name, team_id) DO UPDATE SET
			node_id = EXCLUDED.node_id,
			played = EXCLUDED.played,
			won = EXCLUDED.won,
			drawn = EXCLUDED.drawn,
			lost = EXCLUDED.lost,
			goals_for = EXCLUDED.goals_for,
			goals_against = EXCLUDED.goals_against,
			goal_diff = EXCLUDED.goal_diff,
			points = EXCLUDED.points,
			rank = EXCLUDED.rank,
			updated_at = NOW()
	`

	for _, s := range standings {
		_, err := r.db.Exec(ctx, query,
			s.TournamentCategoryID, s.GroupName, s.NodeID, s.TeamID,
			s.Played, s.Won, s.Drawn, s.Lost, s.GoalsFor, s.GoalsAgainst, s.GoalDiff,
			s.Points, s.Rank,
		)
		if err != nil {
			return fmt.Errorf("failed to upsert standing for team %s: %w", s.TeamID, err)
		}
	}

	return nil
}
