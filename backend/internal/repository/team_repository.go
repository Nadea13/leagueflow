package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"leagueflow-backend/internal/model"
)

type TeamRepository struct {
	db *pgxpool.Pool
}

func NewTeamRepository(db *pgxpool.Pool) *TeamRepository {
	return &TeamRepository{db: db}
}

func (r *TeamRepository) List(ctx context.Context, userID *uuid.UUID) ([]*model.Team, error) {
	query := `
		SELECT id, user_id, sport_id, name, short_name, description, logo_url, logo_img,
		       contact_name, contact_phone, contact_email, is_roster_locked, contact_info,
		       created_at, updated_at
		FROM teams
		WHERE deleted_at IS NULL
	`
	var args []interface{}
	if userID != nil {
		query += " AND user_id = $1"
		args = append(args, *userID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list teams: %w", err)
	}
	defer rows.Close()

	var teams []*model.Team
	for rows.Next() {
		var t model.Team
		var contactInfoBytes []byte

		if err := rows.Scan(
			&t.ID, &t.UserID, &t.SportID, &t.Name, &t.ShortName, &t.Description, &t.LogoURL, &t.LogoImg,
			&t.ContactName, &t.ContactPhone, &t.ContactEmail, &t.IsRosterLocked, &contactInfoBytes,
			&t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if len(contactInfoBytes) > 0 {
			_ = json.Unmarshal(contactInfoBytes, &t.ContactInfo)
		}
		if t.ContactInfo == nil {
			t.ContactInfo = make(map[string]interface{})
		}
		teams = append(teams, &t)
	}
	return teams, nil
}

func (r *TeamRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	query := `
		SELECT id, user_id, sport_id, name, short_name, description, logo_url, logo_img,
		       contact_name, contact_phone, contact_email, is_roster_locked, contact_info,
		       created_at, updated_at
		FROM teams
		WHERE id = $1 AND deleted_at IS NULL
	`
	var t model.Team
	var contactInfoBytes []byte

	err := r.db.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.UserID, &t.SportID, &t.Name, &t.ShortName, &t.Description, &t.LogoURL, &t.LogoImg,
		&t.ContactName, &t.ContactPhone, &t.ContactEmail, &t.IsRosterLocked, &contactInfoBytes,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if len(contactInfoBytes) > 0 {
		_ = json.Unmarshal(contactInfoBytes, &t.ContactInfo)
	}
	if t.ContactInfo == nil {
		t.ContactInfo = make(map[string]interface{})
	}
	return &t, nil
}

func (r *TeamRepository) Create(ctx context.Context, team *model.Team) error {
	if team.UserID != nil && team.CreatedBy == nil {
		team.CreatedBy = team.UserID
	} else if team.CreatedBy != nil && team.UserID == nil {
		team.UserID = team.CreatedBy
	}

	query := `
		INSERT INTO teams (user_id, created_by, sport_id, name, short_name, description, logo_url, logo_img,
		                   contact_name, contact_phone, contact_email, is_roster_locked, contact_info)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`
	if team.ContactInfo == nil {
		team.ContactInfo = make(map[string]interface{})
	}
	contactBytes, _ := json.Marshal(team.ContactInfo)
	return r.db.QueryRow(ctx, query,
		team.UserID, team.CreatedBy, team.SportID, team.Name, team.ShortName, team.Description, team.LogoURL, team.LogoImg,
		team.ContactName, team.ContactPhone, team.ContactEmail, team.IsRosterLocked, contactBytes,
	).Scan(&team.ID, &team.CreatedAt, &team.UpdatedAt)
}

func (r *TeamRepository) Update(ctx context.Context, team *model.Team) error {
	query := `
		UPDATE teams
		SET name = $1, short_name = $2, description = $3, logo_url = $4, logo_img = $5,
		    contact_name = $6, contact_phone = $7, contact_email = $8, updated_at = NOW()
		WHERE id = $9 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query,
		team.Name, team.ShortName, team.Description, team.LogoURL, team.LogoImg,
		team.ContactName, team.ContactPhone, team.ContactEmail, team.ID,
	)
	return err
}

func (r *TeamRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE teams SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *TeamRepository) ResolveTeamID(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	var count int
	err := r.db.QueryRow(ctx, "SELECT count(*) FROM teams WHERE id = $1 AND deleted_at IS NULL", id).Scan(&count)
	if err == nil && count > 0 {
		return id, nil
	}

	var globalTeamID uuid.UUID
	err = r.db.QueryRow(ctx, "SELECT team_id FROM tournament_teams WHERE id = $1", id).Scan(&globalTeamID)
	if err == nil {
		return globalTeamID, nil
	}

	return id, nil
}

func (r *TeamRepository) GetPlayers(ctx context.Context, teamID uuid.UUID) ([]*model.Player, error) {
	resolvedID, _ := r.ResolveTeamID(ctx, teamID)

	query := `
		SELECT p.id, p.team_id, p.first_name, p.last_name, p.jersey_number, p.position,
		       COALESCE(p.photo_url, mp.photo_url) as photo_url, p.date_of_birth, p.master_player_id,
		       mp.tel, p.created_at, p.updated_at
		FROM players p
		LEFT JOIN master_players mp ON p.master_player_id = mp.id
		WHERE p.team_id = $1
		ORDER BY p.jersey_number ASC NULLS LAST, p.first_name ASC
	`
	rows, err := r.db.Query(ctx, query, resolvedID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var players []*model.Player
	for rows.Next() {
		var p model.Player
		if err := rows.Scan(
			&p.ID, &p.TeamID, &p.FirstName, &p.LastName, &p.JerseyNumber, &p.Position,
			&p.PhotoURL, &p.DateOfBirth, &p.MasterPlayerID, &p.Tel, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		players = append(players, &p)
	}
	return players, nil
}

func (r *TeamRepository) GetPlayerByID(ctx context.Context, playerID uuid.UUID) (*model.Player, error) {
	query := `
		SELECT p.id, p.team_id, p.first_name, p.last_name, p.jersey_number, p.position,
		       COALESCE(p.photo_url, mp.photo_url) as photo_url, p.date_of_birth, p.master_player_id,
		       mp.tel, p.created_at, p.updated_at
		FROM players p
		LEFT JOIN master_players mp ON p.master_player_id = mp.id
		WHERE p.id = $1
	`
	var p model.Player
	err := r.db.QueryRow(ctx, query, playerID).Scan(
		&p.ID, &p.TeamID, &p.FirstName, &p.LastName, &p.JerseyNumber, &p.Position,
		&p.PhotoURL, &p.DateOfBirth, &p.MasterPlayerID, &p.Tel, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *TeamRepository) AddPlayer(ctx context.Context, p *model.Player) error {
	resolvedID, _ := r.ResolveTeamID(ctx, p.TeamID)
	p.TeamID = resolvedID

	query := `
		INSERT INTO players (team_id, first_name, last_name, jersey_number, position, photo_url, date_of_birth, master_player_id)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, $8)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		p.TeamID, p.FirstName, p.LastName, p.JerseyNumber, p.Position, p.PhotoURL, p.DateOfBirth, p.MasterPlayerID,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *TeamRepository) UpdatePlayer(ctx context.Context, p *model.Player) error {
	query := `
		UPDATE players
		SET first_name = COALESCE(NULLIF($1, ''), first_name),
		    last_name = COALESCE(NULLIF($2, ''), last_name),
		    jersey_number = COALESCE($3, jersey_number),
		    position = COALESCE(NULLIF($4, ''), position),
		    photo_url = COALESCE(NULLIF($5, ''), photo_url),
		    date_of_birth = COALESCE(NULLIF($6, '')::date, date_of_birth),
		    updated_at = NOW()
		WHERE id = $7
	`
	_, err := r.db.Exec(ctx, query, p.FirstName, p.LastName, p.JerseyNumber, p.Position, p.PhotoURL, p.DateOfBirth, p.ID)
	return err
}

func (r *TeamRepository) DeletePlayer(ctx context.Context, playerID uuid.UUID) error {
	query := `DELETE FROM players WHERE id = $1`
	_, err := r.db.Exec(ctx, query, playerID)
	return err
}

