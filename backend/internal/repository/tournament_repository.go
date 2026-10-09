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

type TournamentRepository struct {
	db *pgxpool.Pool
}

func NewTournamentRepository(db *pgxpool.Pool) *TournamentRepository {
	return &TournamentRepository{db: db}
}

func (r *TournamentRepository) List(ctx context.Context, status string, organizerID *uuid.UUID) ([]*model.Tournament, error) {
	query := `
		SELECT 
			t.id, t.organizer_id, t.name, t.slug, t.description, t.format, 
			CASE
				WHEN t.status IN ('upcoming', 'published') AND t.start_date IS NOT NULL AND t.end_date IS NOT NULL AND CURRENT_DATE >= t.start_date AND CURRENT_DATE <= t.end_date THEN 'ongoing'::tournament_status
				WHEN t.status = 'ongoing' AND t.end_date IS NOT NULL AND CURRENT_DATE > t.end_date THEN 'finished'::tournament_status
				ELSE t.status
			END as status,
			t.start_date::text, t.end_date::text, t.location, t.banner_url, t.logo_url, t.rules, t.settings, 
			t.created_at, t.updated_at,
			t.sport_id,
			COALESCE(t.document_deadline::text, t.settings->>'document_deadline') as doc_deadline,
			COALESCE(s.sport_name, t.settings->>'sport_name', '') as sport_name,
			COALESCE((SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id AND tt.deleted_at IS NULL AND tt.registration_status != 'rejected'), 0) as teams_count,
			COALESCE((SELECT SUM(tc.max_teams) FROM tournament_categories tc WHERE tc.tournament_id = t.id AND tc.deleted_at IS NULL), 16) as max_teams
		FROM tournaments t
		LEFT JOIN sports s ON t.sport_id = s.id
		WHERE t.deleted_at IS NULL
	`
	var args []interface{}
	argIdx := 1

	if status != "" {
		query += fmt.Sprintf(` AND (
			CASE
				WHEN t.status IN ('upcoming', 'published') AND t.start_date IS NOT NULL AND t.end_date IS NOT NULL AND CURRENT_DATE >= t.start_date AND CURRENT_DATE <= t.end_date THEN 'ongoing'
				WHEN t.status = 'ongoing' AND t.end_date IS NOT NULL AND CURRENT_DATE > t.end_date THEN 'finished'
				ELSE t.status::text
			END = $%d
		)`, argIdx)
		args = append(args, status)
		argIdx++
	}

	if organizerID != nil {
		query += fmt.Sprintf(" AND t.organizer_id = $%d", argIdx)
		args = append(args, *organizerID)
		argIdx++
	}

	query += ` ORDER BY t.created_at DESC`
	rows, err := r.db.Query(ctx, query, args...)

	if err != nil {
		return nil, fmt.Errorf("failed to query tournaments: %w", err)
	}
	defer rows.Close()

	var tournaments []*model.Tournament
	for rows.Next() {
		var t model.Tournament
		var settingsBytes []byte
		var sportID *int
		var docDeadline *string
		var sportName string
		var teamsCount int
		var maxTeams int
		err := rows.Scan(
			&t.ID, &t.OrganizerID, &t.Name, &t.Slug, &t.Description, &t.Format, &t.Status,
			&t.StartDate, &t.EndDate, &t.Location, &t.BannerURL, &t.LogoURL, &t.Rules, &settingsBytes,
			&t.CreatedAt, &t.UpdatedAt,
			&sportID, &docDeadline, &sportName, &teamsCount, &maxTeams,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan tournament: %w", err)
		}
		if len(settingsBytes) > 0 {
			_ = json.Unmarshal(settingsBytes, &t.Settings)
		}
		if t.Settings == nil {
			t.Settings = make(map[string]interface{})
		}
		t.SportID = sportID
		t.SportName = sportName
		t.TeamsCount = teamsCount
		t.MaxTeams = maxTeams
		t.DocDeadlineStr = docDeadline
		if docDeadline != nil && *docDeadline != "" {
			t.Settings["document_deadline"] = *docDeadline
		}
		if sportName != "" {
			t.Settings["sport_name"] = sportName
		}
		t.Settings["teams_count"] = teamsCount
		t.Settings["max_teams"] = maxTeams
		tournaments = append(tournaments, &t)
	}

	return tournaments, nil
}

func (r *TournamentRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Tournament, error) {
	query := `
		SELECT 
			t.id, t.organizer_id, t.name, t.slug, t.description, t.format, 
			CASE
				WHEN t.status IN ('upcoming', 'published') AND t.start_date IS NOT NULL AND t.end_date IS NOT NULL AND CURRENT_DATE >= t.start_date AND CURRENT_DATE <= t.end_date THEN 'ongoing'::tournament_status
				WHEN t.status = 'ongoing' AND t.end_date IS NOT NULL AND CURRENT_DATE > t.end_date THEN 'finished'::tournament_status
				ELSE t.status
			END as status,
			t.start_date::text, t.end_date::text, t.location, t.banner_url, t.logo_url, t.rules, t.settings, t.created_at, t.updated_at,
			t.sport_id,
			COALESCE(t.document_deadline::text, t.settings->>'document_deadline') as doc_deadline,
			COALESCE(s.sport_name, t.settings->>'sport_name', '') as sport_name,
			COALESCE((SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id AND tt.deleted_at IS NULL AND tt.registration_status != 'rejected'), 0) as teams_count,
			COALESCE((SELECT SUM(tc.max_teams) FROM tournament_categories tc WHERE tc.tournament_id = t.id AND tc.deleted_at IS NULL), 16) as max_teams,
			u.email, u.full_name, u.avatar_url
		FROM tournaments t
		LEFT JOIN sports s ON t.sport_id = s.id
		LEFT JOIN users u ON t.organizer_id = u.id
		WHERE t.id = $1 AND t.deleted_at IS NULL
	`
	var t model.Tournament
	var settingsBytes []byte
	var sportID *int
	var docDeadline *string
	var sportName string
	var teamsCount int
	var maxTeams int
	var organizerEmail, organizerName, organizerAvatar *string
	err := r.db.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.OrganizerID, &t.Name, &t.Slug, &t.Description, &t.Format, &t.Status,
		&t.StartDate, &t.EndDate, &t.Location, &t.BannerURL, &t.LogoURL, &t.Rules, &settingsBytes,
		&t.CreatedAt, &t.UpdatedAt,
		&sportID, &docDeadline, &sportName, &teamsCount, &maxTeams,
		&organizerEmail, &organizerName, &organizerAvatar,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get tournament: %w", err)
	}
	if len(settingsBytes) > 0 {
		_ = json.Unmarshal(settingsBytes, &t.Settings)
	}
	if t.Settings == nil {
		t.Settings = make(map[string]interface{})
	}
	t.SportID = sportID
	t.SportName = sportName
	t.TeamsCount = teamsCount
	t.MaxTeams = maxTeams
	t.DocDeadlineStr = docDeadline
	if docDeadline != nil && *docDeadline != "" {
		t.Settings["document_deadline"] = *docDeadline
	}
	if sportName != "" {
		t.Settings["sport_name"] = sportName
	}
	t.Settings["teams_count"] = teamsCount
	t.Settings["max_teams"] = maxTeams
	if organizerEmail != nil {
		t.Settings["organizer_email"] = *organizerEmail
	}
	if organizerName != nil {
		t.Settings["organizer_name"] = *organizerName
	}
	if organizerAvatar != nil {
		t.Settings["organizer_avatar"] = *organizerAvatar
	}
	return &t, nil
}

func (r *TournamentRepository) Create(ctx context.Context, t *model.Tournament) error {
	query := `
		INSERT INTO tournaments (organizer_id, name, slug, description, format, status, start_date, end_date, location, banner_url, logo_url, rules, settings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`
	settingsJSON, _ := json.Marshal(t.Settings)
	err := r.db.QueryRow(
		ctx, query,
		t.OrganizerID, t.Name, t.Slug, t.Description, t.Format, t.Status,
		t.StartDate, t.EndDate, t.Location, t.BannerURL, t.LogoURL, t.Rules, settingsJSON,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create tournament: %w", err)
	}
	return nil
}

func (r *TournamentRepository) Update(ctx context.Context, t *model.Tournament) error {
	existing, err := r.GetByID(ctx, t.ID)
	if err != nil || existing == nil {
		return fmt.Errorf("tournament not found: %w", err)
	}

	if t.Name == "" {
		t.Name = existing.Name
	}
	if t.Description == nil {
		t.Description = existing.Description
	}
	if t.Format == "" {
		t.Format = existing.Format
	}
	if t.Status == "" {
		t.Status = existing.Status
	}
	if t.StartDate == "" {
		t.StartDate = existing.StartDate
	}
	if t.EndDate == "" {
		t.EndDate = existing.EndDate
	}
	if t.Location == nil {
		t.Location = existing.Location
	}
	if t.BannerURL == nil {
		t.BannerURL = existing.BannerURL
	}
	if t.LogoURL == nil {
		t.LogoURL = existing.LogoURL
	}
	if t.Rules == nil {
		t.Rules = existing.Rules
	}
	if t.Settings == nil {
		t.Settings = existing.Settings
	} else {
		if existing.Settings == nil {
			existing.Settings = make(map[string]interface{})
		}
		// Merge new settings with existing settings
		merged := make(map[string]interface{})
		for k, v := range existing.Settings {
			merged[k] = v
		}
		for k, v := range t.Settings {
			merged[k] = v
		}
		t.Settings = merged
	}

	query := `
		UPDATE tournaments
		SET name = $1, description = $2, format = $3, status = $4,
		    start_date = $5, end_date = $6, location = $7, banner_url = $8,
		    logo_url = $9, rules = $10, settings = $11, updated_at = NOW()
		WHERE id = $12
	`
	settingsJSON, _ := json.Marshal(t.Settings)
	_, err = r.db.Exec(ctx, query,
		t.Name, t.Description, t.Format, t.Status,
		t.StartDate, t.EndDate, t.Location, t.BannerURL,
		t.LogoURL, t.Rules, settingsJSON, t.ID,
	)
	return err
}

func (r *TournamentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM tournaments WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *TournamentRepository) GetOrCreateAgeCategory(ctx context.Context, name string, minAge, maxAge *int) (int, error) {
	// Try to find existing
	var id int
	query := `SELECT id FROM age_categories WHERE LOWER(TRIM(category_name)) = LOWER(TRIM($1)) LIMIT 1`
	err := r.db.QueryRow(ctx, query, name).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != pgx.ErrNoRows {
		return 0, err
	}

	// Insert new
	insertQuery := `
		INSERT INTO age_categories (category_name, min_age, max_age)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	err = r.db.QueryRow(ctx, insertQuery, name, minAge, maxAge).Scan(&id)
	if err != nil {
		// Fallback in case of race condition
		err2 := r.db.QueryRow(ctx, query, name).Scan(&id)
		if err2 == nil {
			return id, nil
		}
		return 0, fmt.Errorf("failed to create age category: %w", err)
	}
	return id, nil
}

func (r *TournamentRepository) GetCategories(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentCategory, error) {
	query := `
		SELECT tc.id, tc.tournament_id, COALESCE(tc.name, ac.category_name, 'General'),
		       COALESCE(NULLIF(tc.team_limit, 0), NULLIF(tc.max_teams, 0), 16),
		       COALESCE(tc.canvas_data, '{}'::jsonb),
		       COALESCE(tc.rules_config, '{}'::jsonb),
		       COALESCE(NULLIF(tc.max_teams, 0), NULLIF(tc.team_limit, 0), 16),
		       COALESCE(tc.registration_fee, 0),
		       COALESCE(tc.gender_type, 'open'), tc.age_category_id,
		       ac.id, ac.category_name, ac.min_age, ac.max_age,
		       tc.created_at, tc.updated_at
		FROM tournament_categories tc
		LEFT JOIN age_categories ac ON tc.age_category_id = ac.id
		WHERE tc.tournament_id = $1 AND tc.deleted_at IS NULL
		ORDER BY tc.created_at ASC
	`
	rows, err := r.db.Query(ctx, query, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	var categories []*model.TournamentCategory
	for rows.Next() {
		var c model.TournamentCategory
		var canvasBytes []byte
		var rulesConfigBytes []byte
		var acID *int
		var acName *string
		var acMinAge, acMaxAge *int
		err := rows.Scan(
			&c.ID, &c.TournamentID, &c.Name, &c.TeamLimit,
			&canvasBytes, &rulesConfigBytes, &c.MaxTeams, &c.RegistrationFee,
			&c.GenderType, &c.AgeCategoryID,
			&acID, &acName, &acMinAge, &acMaxAge,
			&c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if len(canvasBytes) > 0 {
			_ = json.Unmarshal(canvasBytes, &c.CanvasData)
		}
		if c.CanvasData == nil {
			c.CanvasData = make(map[string]interface{})
		}
		if len(rulesConfigBytes) > 0 {
			_ = json.Unmarshal(rulesConfigBytes, &c.RulesConfig)
		}
		if c.RulesConfig == nil {
			c.RulesConfig = make(map[string]interface{})
		}
		if acID != nil && acName != nil {
			c.AgeCategories = &model.AgeCategory{
				ID:           *acID,
				CategoryName: *acName,
				MinAge:       acMinAge,
				MaxAge:       acMaxAge,
			}
			c.CategoryName = *acName
		} else {
			c.CategoryName = c.Name
		}
		categories = append(categories, &c)
	}
	return categories, nil
}

func (r *TournamentRepository) GetCategoryByID(ctx context.Context, categoryID uuid.UUID) (*model.TournamentCategory, error) {
	query := `
		SELECT tc.id, tc.tournament_id, COALESCE(tc.name, ac.category_name, 'General'),
		       COALESCE(NULLIF(tc.team_limit, 0), NULLIF(tc.max_teams, 0), 16),
		       COALESCE(tc.canvas_data, '{}'::jsonb),
		       COALESCE(tc.rules_config, '{}'::jsonb),
		       COALESCE(NULLIF(tc.max_teams, 0), NULLIF(tc.team_limit, 0), 16),
		       COALESCE(tc.registration_fee, 0),
		       COALESCE(tc.gender_type, 'open'), tc.age_category_id,
		       ac.id, ac.category_name, ac.min_age, ac.max_age,
		       tc.created_at, tc.updated_at
		FROM tournament_categories tc
		LEFT JOIN age_categories ac ON tc.age_category_id = ac.id
		WHERE tc.id = $1 AND tc.deleted_at IS NULL
	`
	var c model.TournamentCategory
	var canvasBytes []byte
	var rulesConfigBytes []byte
	var acID *int
	var acName *string
	var acMinAge, acMaxAge *int
	err := r.db.QueryRow(ctx, query, categoryID).Scan(
		&c.ID, &c.TournamentID, &c.Name, &c.TeamLimit,
		&canvasBytes, &rulesConfigBytes, &c.MaxTeams, &c.RegistrationFee,
		&c.GenderType, &c.AgeCategoryID,
		&acID, &acName, &acMinAge, &acMaxAge,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if len(canvasBytes) > 0 {
		_ = json.Unmarshal(canvasBytes, &c.CanvasData)
	}
	if c.CanvasData == nil {
		c.CanvasData = make(map[string]interface{})
	}
	if len(rulesConfigBytes) > 0 {
		_ = json.Unmarshal(rulesConfigBytes, &c.RulesConfig)
	}
	if c.RulesConfig == nil {
		c.RulesConfig = make(map[string]interface{})
	}
	if acID != nil && acName != nil {
		c.AgeCategories = &model.AgeCategory{
			ID:           *acID,
			CategoryName: *acName,
			MinAge:       acMinAge,
			MaxAge:       acMaxAge,
		}
		c.CategoryName = *acName
	} else {
		c.CategoryName = c.Name
	}
	return &c, nil
}

func (r *TournamentRepository) CreateCategory(ctx context.Context, cat *model.TournamentCategory) error {
	query := `
		INSERT INTO tournament_categories (tournament_id, name, team_limit, max_teams, registration_fee, gender_type, age_category_id, canvas_data, rules_config)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	var canvasJSON []byte
	if cat.CanvasData != nil {
		canvasJSON, _ = json.Marshal(cat.CanvasData)
	}
	if len(canvasJSON) == 0 || string(canvasJSON) == "null" {
		canvasJSON = []byte("{}")
	}

	var rulesConfigJSON []byte
	if cat.RulesConfig != nil {
		rulesConfigJSON, _ = json.Marshal(cat.RulesConfig)
	}
	if len(rulesConfigJSON) == 0 || string(rulesConfigJSON) == "null" {
		rulesConfigJSON = []byte("{}")
	}

	if cat.MaxTeams == 0 {
		cat.MaxTeams = cat.TeamLimit
	}
	if cat.MaxTeams == 0 {
		cat.MaxTeams = 16
	}
	if cat.TeamLimit == 0 {
		cat.TeamLimit = cat.MaxTeams
	}
	if cat.GenderType == "" {
		cat.GenderType = "open"
	}

	err := r.db.QueryRow(ctx, query,
		cat.TournamentID, cat.Name, cat.TeamLimit, cat.MaxTeams, cat.RegistrationFee,
		cat.GenderType, cat.AgeCategoryID, canvasJSON, rulesConfigJSON,
	).Scan(&cat.ID, &cat.CreatedAt, &cat.UpdatedAt)
	return err
}

func (r *TournamentRepository) UpdateCategory(ctx context.Context, cat *model.TournamentCategory) error {
	var rulesConfigJSON []byte
	if cat.RulesConfig != nil {
		rulesConfigJSON, _ = json.Marshal(cat.RulesConfig)
	}

	query := `
		UPDATE tournament_categories
		SET name = COALESCE(NULLIF($1, ''), name),
		    max_teams = CASE WHEN $2 > 0 THEN $2 ELSE max_teams END,
		    team_limit = CASE WHEN $2 > 0 THEN $2 ELSE team_limit END,
		    registration_fee = COALESCE($3, registration_fee),
		    gender_type = COALESCE(NULLIF($4, ''), gender_type),
		    age_category_id = COALESCE($5, age_category_id),
		    rules_config = CASE WHEN $6::jsonb IS NOT NULL THEN $6::jsonb ELSE rules_config END,
		    updated_at = NOW()
		WHERE id = $7
	`
	_, err := r.db.Exec(ctx, query,
		cat.Name, cat.MaxTeams, cat.RegistrationFee, cat.GenderType, cat.AgeCategoryID,
		rulesConfigJSON, cat.ID,
	)
	return err
}

func (r *TournamentRepository) UpdateCategoryCanvasData(ctx context.Context, categoryID uuid.UUID, canvasData map[string]interface{}) error {
	query := `
		UPDATE tournament_categories
		SET canvas_data = $1, updated_at = NOW()
		WHERE id = $2
	`
	canvasJSON, _ := json.Marshal(canvasData)
	_, err := r.db.Exec(ctx, query, canvasJSON, categoryID)
	return err
}

func (r *TournamentRepository) DeleteCategory(ctx context.Context, categoryID uuid.UUID) error {
	query := `UPDATE tournament_categories SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, categoryID)
	return err
}
