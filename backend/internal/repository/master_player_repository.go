package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"tourni-backend/internal/model"
)

type MasterPlayerRepository struct {
	db *pgxpool.Pool
}

func NewMasterPlayerRepository(db *pgxpool.Pool) *MasterPlayerRepository {
	return &MasterPlayerRepository{db: db}
}

func (r *MasterPlayerRepository) List(ctx context.Context, userID *uuid.UUID, search string) ([]*model.MasterPlayer, error) {
	query := `
		SELECT mp.id, mp.user_id, 
		       COALESCE(NULLIF(TRIM(CONCAT(mp.first_name_local, ' ', CASE WHEN mp.last_name_local = '-' THEN '' ELSE mp.last_name_local END)), ''), NULLIF(TRIM(CONCAT(mp.first_name_intl, ' ', CASE WHEN mp.last_name_intl = '-' THEN '' ELSE mp.last_name_intl END)), ''), 'Unnamed') AS name,
		       mp.first_name_local, mp.middle_name_local, mp.last_name_local,
		       mp.first_name_intl, mp.middle_name_intl, mp.last_name_intl,
		       mp.first_name_th, mp.middle_name_th, mp.last_name_th,
		       mp.first_name_en, mp.middle_name_en, mp.last_name_en,
		       mp.nickname, mp.gender::text, mp.birthday::text, mp.photo_url, mp.profile_img, mp.tel, mp.favorite_sport_id,
		       mp.preferred_hand, mp.preferred_foot, mp.status::text, mp.verified, mp.created_at, mp.updated_at,
		       u.email, u.full_name
		FROM master_players mp
		LEFT JOIN users u ON mp.user_id = u.id
		WHERE mp.deleted_at IS NULL
	`
	var args []interface{}
	argIdx := 1

	if userID != nil {
		query += fmt.Sprintf(" AND mp.user_id = $%d", argIdx)
		args = append(args, *userID)
		argIdx++
	}

	if search != "" {
		query += fmt.Sprintf(` AND (
			mp.first_name_local ILIKE $%d OR mp.last_name_local ILIKE $%d OR 
			mp.first_name_intl ILIKE $%d OR mp.last_name_intl ILIKE $%d OR 
			mp.nickname ILIKE $%d OR 
			TRIM(mp.first_name_intl || ' ' || mp.last_name_intl) ILIKE $%d OR 
			TRIM(mp.first_name_local || ' ' || mp.last_name_local) ILIKE $%d
		)`, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += " ORDER BY mp.created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list master players: %w", err)
	}
	defer rows.Close()

	var list []*model.MasterPlayer
	for rows.Next() {
		var p model.MasterPlayer
		var userEmail, userFullName *string
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.Name,
			&p.FirstNameLocal, &p.MiddleNameLocal, &p.LastNameLocal,
			&p.FirstNameIntl, &p.MiddleNameIntl, &p.LastNameIntl,
			&p.FirstNameTH, &p.MiddleNameTH, &p.LastNameTH,
			&p.FirstNameEN, &p.MiddleNameEN, &p.LastNameEN,
			&p.Nickname, &p.Gender, &p.Birthday, &p.PhotoURL, &p.ProfileImg, &p.Tel, &p.FavoriteSportID,
			&p.PreferredHand, &p.PreferredFoot, &p.Status, &p.Verified, &p.CreatedAt, &p.UpdatedAt,
			&userEmail, &userFullName,
		); err != nil {
			return nil, err
		}
		if userEmail != nil {
			p.User = &model.User{
				Email: *userEmail,
			}
			if userFullName != nil {
				p.User.FullName = *userFullName
			}
		}
		list = append(list, &p)
	}
	return list, nil
}

func (r *MasterPlayerRepository) FindByName(ctx context.Context, firstName, lastName string) (*model.MasterPlayer, error) {
	query := `
		SELECT id, user_id, 
		       COALESCE(NULLIF(TRIM(CONCAT(first_name_local, ' ', CASE WHEN last_name_local = '-' THEN '' ELSE last_name_local END)), ''), NULLIF(TRIM(CONCAT(first_name_intl, ' ', CASE WHEN last_name_intl = '-' THEN '' ELSE last_name_intl END)), ''), 'Unnamed') AS name,
		       first_name_local, middle_name_local, last_name_local, first_name_intl, middle_name_intl, last_name_intl,
		       nickname, birthday::text, photo_url, tel, favorite_sport_id,
		       preferred_hand, preferred_foot, created_at, updated_at
		FROM master_players
		WHERE deleted_at IS NULL
		  AND (
		      (LOWER(first_name_local) = LOWER($1) AND (last_name_local IS NULL OR last_name_local = '-' OR LOWER(last_name_local) = LOWER($2)))
		      OR
		      (LOWER(first_name_intl) = LOWER($1) AND (last_name_intl IS NULL OR last_name_intl = '-' OR LOWER(last_name_intl) = LOWER($2)))
		  )
		LIMIT 1
	`
	var p model.MasterPlayer
	err := r.db.QueryRow(ctx, query, firstName, lastName).Scan(
		&p.ID, &p.UserID, &p.Name,
		&p.FirstNameLocal, &p.MiddleNameLocal, &p.LastNameLocal,
		&p.FirstNameIntl, &p.MiddleNameIntl, &p.LastNameIntl,
		&p.Nickname, &p.Birthday, &p.PhotoURL, &p.Tel, &p.FavoriteSportID,
		&p.PreferredHand, &p.PreferredFoot, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *MasterPlayerRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.MasterPlayer, error) {
	query := `
		SELECT mp.id, mp.user_id, 
		       COALESCE(NULLIF(TRIM(CONCAT(mp.first_name_local, ' ', CASE WHEN mp.last_name_local = '-' THEN '' ELSE mp.last_name_local END)), ''), NULLIF(TRIM(CONCAT(mp.first_name_intl, ' ', CASE WHEN mp.last_name_intl = '-' THEN '' ELSE mp.last_name_intl END)), ''), 'Unnamed') AS name,
		       mp.first_name_local, mp.middle_name_local, mp.last_name_local,
		       mp.first_name_intl, mp.middle_name_intl, mp.last_name_intl,
		       mp.first_name_th, mp.middle_name_th, mp.last_name_th,
		       mp.first_name_en, mp.middle_name_en, mp.last_name_en,
		       mp.nickname, mp.gender::text, mp.birthday::text, mp.photo_url, mp.profile_img, mp.tel, mp.favorite_sport_id,
		       mp.preferred_hand, mp.preferred_foot, mp.status::text, mp.verified, mp.created_at, mp.updated_at,
		       u.email, u.full_name
		FROM master_players mp
		LEFT JOIN users u ON mp.user_id = u.id
		WHERE mp.id = $1 AND mp.deleted_at IS NULL
	`
	var p model.MasterPlayer
	var userEmail, userFullName *string
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.UserID, &p.Name,
		&p.FirstNameLocal, &p.MiddleNameLocal, &p.LastNameLocal,
		&p.FirstNameIntl, &p.MiddleNameIntl, &p.LastNameIntl,
		&p.FirstNameTH, &p.MiddleNameTH, &p.LastNameTH,
		&p.FirstNameEN, &p.MiddleNameEN, &p.LastNameEN,
		&p.Nickname, &p.Gender, &p.Birthday, &p.PhotoURL, &p.ProfileImg, &p.Tel, &p.FavoriteSportID,
		&p.PreferredHand, &p.PreferredFoot, &p.Status, &p.Verified, &p.CreatedAt, &p.UpdatedAt,
		&userEmail, &userFullName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if userEmail != nil {
		p.User = &model.User{
			Email: *userEmail,
		}
		if userFullName != nil {
			p.User.FullName = *userFullName
		}
	}
	return &p, nil
}

func (r *MasterPlayerRepository) Create(ctx context.Context, p *model.MasterPlayer) error {
	query := `
		INSERT INTO master_players (user_id, first_name_local, middle_name_local, last_name_local,
		                            first_name_intl, middle_name_intl, last_name_intl,
		                            nickname, birthday, photo_url, tel, favorite_sport_id,
		                            preferred_hand, preferred_foot, gender, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::date, $10, $11, $12, $13, $14, 'unspecified', 'active')
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		p.UserID, p.FirstNameLocal, p.MiddleNameLocal, p.LastNameLocal,
		p.FirstNameIntl, p.MiddleNameIntl, p.LastNameIntl,
		p.Nickname, p.Birthday, p.PhotoURL, p.Tel, p.FavoriteSportID,
		p.PreferredHand, p.PreferredFoot,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *MasterPlayerRepository) Update(ctx context.Context, p *model.MasterPlayer) error {
	query := `
		UPDATE master_players
		SET first_name_local = COALESCE($1, first_name_local), middle_name_local = COALESCE($2, middle_name_local), last_name_local = COALESCE($3, last_name_local),
		    first_name_intl = COALESCE($4, first_name_intl), middle_name_intl = COALESCE($5, middle_name_intl), last_name_intl = COALESCE($6, last_name_intl),
		    nickname = COALESCE($7, nickname),
		    birthday = COALESCE(NULLIF($8, '')::date, birthday),
		    photo_url = COALESCE($9, photo_url), tel = COALESCE($10, tel),
		    favorite_sport_id = COALESCE($11, favorite_sport_id), preferred_hand = COALESCE($12, preferred_hand),
		    preferred_foot = COALESCE($13, preferred_foot), updated_at = NOW()
		WHERE id = $14 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(ctx, query,
		p.FirstNameLocal, p.MiddleNameLocal, p.LastNameLocal,
		p.FirstNameIntl, p.MiddleNameIntl, p.LastNameIntl,
		p.Nickname, p.Birthday, p.PhotoURL, p.Tel,
		p.FavoriteSportID, p.PreferredHand, p.PreferredFoot, p.ID,
	)
	return err
}

func (r *MasterPlayerRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE master_players SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
