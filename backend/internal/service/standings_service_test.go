package service

import (
	"testing"

	"github.com/google/uuid"

	"tourni-backend/internal/model"
)

func TestCalculateStandings(t *testing.T) {
	categoryID := uuid.New()
	teamA := uuid.New()
	teamB := uuid.New()
	teamC := uuid.New()

	t.Run("Calculates points for win, loss, and draw", func(t *testing.T) {
		matches := []*model.Match{
			{
				TournamentCategoryID: &categoryID,
				HomeTeamID:          &teamA,
				AwayTeamID:          &teamB,
				HomeScore:           3,
				AwayScore:           1,
				Status:              model.MatchCompleted,
			},
			{
				TournamentCategoryID: &categoryID,
				HomeTeamID:          &teamB,
				AwayTeamID:          &teamC,
				HomeScore:           2,
				AwayScore:           2,
				Status:              model.MatchCompleted,
			},
		}

		standings := CalculateStandings(categoryID, matches)

		if len(standings) != 3 {
			t.Fatalf("expected 3 teams in standings, got %d", len(standings))
		}

		// Team A: 1 played, 1 won, 0 drawn, 0 lost, GF: 3, GA: 1, GD: +2, PTS: 3 (Rank 1)
		// Team C: 1 played, 0 won, 1 drawn, 0 lost, GF: 2, GA: 2, GD: 0, PTS: 1 (Rank 2)
		// Team B: 2 played, 0 won, 1 drawn, 1 lost, GF: 3, GA: 5, GD: -2, PTS: 1 (Rank 3)

		if standings[0].TeamID != teamA {
			t.Errorf("expected Rank 1 to be Team A, got %s", standings[0].TeamID)
		}
		if standings[0].Points != 3 {
			t.Errorf("expected Team A points 3, got %d", standings[0].Points)
		}
		if standings[0].GoalDiff != 2 {
			t.Errorf("expected Team A goal diff 2, got %d", standings[0].GoalDiff)
		}

		if standings[1].TeamID != teamC {
			t.Errorf("expected Rank 2 to be Team C (GD 0 vs -2), got %s", standings[1].TeamID)
		}
		if standings[1].Points != 1 {
			t.Errorf("expected Team C points 1, got %d", standings[1].Points)
		}

		if standings[2].TeamID != teamB {
			t.Errorf("expected Rank 3 to be Team B, got %s", standings[2].TeamID)
		}
		if standings[2].Points != 1 {
			t.Errorf("expected Team B points 1, got %d", standings[2].Points)
		}
		if standings[2].GoalDiff != -2 {
			t.Errorf("expected Team B goal diff -2, got %d", standings[2].GoalDiff)
		}
	})

	t.Run("Tie-breaker by Goal Difference and Goals For", func(t *testing.T) {
		// Both Team A and Team B have 3 points and same GD, but Team A scored more goals
		matches := []*model.Match{
			{
				TournamentCategoryID: &categoryID,
				HomeTeamID:          &teamA,
				AwayTeamID:          &teamC,
				HomeScore:           4,
				AwayScore:           2, // GD +2, GF 4
				Status:              model.MatchCompleted,
			},
			{
				TournamentCategoryID: &categoryID,
				HomeTeamID:          &teamB,
				AwayTeamID:          &teamC,
				HomeScore:           2,
				AwayScore:           0, // GD +2, GF 2
				Status:              model.MatchCompleted,
			},
		}

		standings := CalculateStandings(categoryID, matches)

		if standings[0].TeamID != teamA {
			t.Errorf("expected Team A to be ranked above Team B due to higher Goals For (4 vs 2), got %s", standings[0].TeamID)
		}
		if standings[1].TeamID != teamB {
			t.Errorf("expected Team B to be rank 2, got %s", standings[1].TeamID)
		}
	})

	t.Run("Ignores unfinished or cancelled matches", func(t *testing.T) {
		matches := []*model.Match{
			{
				TournamentCategoryID: &categoryID,
				HomeTeamID:          &teamA,
				AwayTeamID:          &teamB,
				HomeScore:           5,
				AwayScore:           0,
				Status:              model.MatchScheduled,
			},
			{
				TournamentCategoryID: &categoryID,
				HomeTeamID:          &teamA,
				AwayTeamID:          &teamB,
				HomeScore:           4,
				AwayScore:           0,
				Status:              model.MatchCancelled,
			},
		}

		standings := CalculateStandings(categoryID, matches)

		for _, s := range standings {
			if s.Played != 0 {
				t.Errorf("expected 0 played matches, got %d", s.Played)
			}
			if s.Points != 0 {
				t.Errorf("expected 0 points, got %d", s.Points)
			}
		}
	})
}
