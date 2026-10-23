package service

import (
	"context"
	"sort"

	"github.com/google/uuid"

	"tourni-backend/internal/model"
	"tourni-backend/internal/repository"
)

type StandingsService struct {
	standingsRepo *repository.StandingsRepository
	matchRepo     *repository.MatchRepository
}

func NewStandingsService(standingsRepo *repository.StandingsRepository, matchRepo *repository.MatchRepository) *StandingsService {
	return &StandingsService{
		standingsRepo: standingsRepo,
		matchRepo:     matchRepo,
	}
}

// GetByCategory returns standings from the database. If none exists, calculates and saves first.
func (s *StandingsService) GetByCategory(ctx context.Context, categoryID uuid.UUID) ([]*model.Standing, error) {
	standings, err := s.standingsRepo.GetByCategory(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	if len(standings) > 0 {
		return standings, nil
	}

	// Auto-recalculate and populate if empty
	return s.RecalculateAndSave(ctx, categoryID)
}

// CalculateStandings computes standings table from category matches (Points -> GD -> GF).
func CalculateStandings(categoryID uuid.UUID, matches []*model.Match) []model.Standing {
	table := make(map[uuid.UUID]*model.Standing)

	for _, m := range matches {
		if m.HomeTeamID != nil {
			if _, exists := table[*m.HomeTeamID]; !exists {
				table[*m.HomeTeamID] = &model.Standing{
					TournamentCategoryID: categoryID,
					GroupName:            "A",
					TeamID:               *m.HomeTeamID,
					Team:                 m.HomeTeam,
				}
			}
		}
		if m.AwayTeamID != nil {
			if _, exists := table[*m.AwayTeamID]; !exists {
				table[*m.AwayTeamID] = &model.Standing{
					TournamentCategoryID: categoryID,
					GroupName:            "A",
					TeamID:               *m.AwayTeamID,
					Team:                 m.AwayTeam,
				}
			}
		}

		if m.Status != model.MatchCompleted && m.Status != "finished" {
			continue
		}
		if m.HomeTeamID == nil || m.AwayTeamID == nil {
			continue
		}

		home := table[*m.HomeTeamID]
		away := table[*m.AwayTeamID]

		home.Played++
		away.Played++
		home.GoalsFor += m.HomeScore
		home.GoalsAgainst += m.AwayScore
		away.GoalsFor += m.AwayScore
		away.GoalsAgainst += m.HomeScore

		if m.HomeScore > m.AwayScore {
			home.Won++
			home.Points += 3
			away.Lost++
		} else if m.HomeScore < m.AwayScore {
			away.Won++
			away.Points += 3
			home.Lost++
		} else {
			home.Drawn++
			home.Points += 1
			away.Drawn++
			away.Points += 1
		}
	}

	var computed []model.Standing
	for _, teamStanding := range table {
		teamStanding.GoalDiff = teamStanding.GoalsFor - teamStanding.GoalsAgainst
		computed = append(computed, *teamStanding)
	}

	// Sort: Points DESC -> GoalDiff DESC -> GoalsFor DESC
	sort.Slice(computed, func(i, j int) bool {
		if computed[i].Points != computed[j].Points {
			return computed[i].Points > computed[j].Points
		}
		if computed[i].GoalDiff != computed[j].GoalDiff {
			return computed[i].GoalDiff > computed[j].GoalDiff
		}
		return computed[i].GoalsFor > computed[j].GoalsFor
	})

	for i := range computed {
		computed[i].Rank = i + 1
	}

	return computed
}

// RecalculateAndSave calculates standings from category matches, saves into Postgres, and returns the list.
func (s *StandingsService) RecalculateAndSave(ctx context.Context, categoryID uuid.UUID) ([]*model.Standing, error) {
	matches, err := s.matchRepo.GetMatchesByCategory(ctx, categoryID)
	if err != nil {
		return nil, err
	}

	computed := CalculateStandings(categoryID, matches)

	// Persist to Postgres standings table
	if err := s.standingsRepo.UpsertStandings(ctx, computed); err != nil {
		return nil, err
	}

	return s.standingsRepo.GetByCategory(ctx, categoryID)
}
