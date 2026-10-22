package service

import (
	"testing"
)

func TestFixtureService_GenerateRoundRobin(t *testing.T) {
	svc := NewFixtureService()

	t.Run("Insufficient teams returns nil", func(t *testing.T) {
		fixtures := svc.GenerateRoundRobin([]string{"team1"}, "Group A")
		if fixtures != nil {
			t.Fatalf("expected nil for less than 2 teams, got %v", fixtures)
		}
	})

	t.Run("Even teams round robin (4 teams)", func(t *testing.T) {
		teamIDs := []string{"teamA", "teamB", "teamC", "teamD"}
		fixtures := svc.GenerateRoundRobin(teamIDs, "Group A")

		// 4 teams = 4 * 3 / 2 = 6 matches total
		if len(fixtures) != 6 {
			t.Fatalf("expected 6 matches for 4 teams, got %d", len(fixtures))
		}

		// Count matches per team
		teamMatches := make(map[string]int)
		for _, m := range fixtures {
			if m.HomeTeamID == nil || m.AwayTeamID == nil {
				t.Fatalf("unexpected nil team in even round robin match")
			}
			teamMatches[*m.HomeTeamID]++
			teamMatches[*m.AwayTeamID]++
			if m.GroupName != "Group A" {
				t.Errorf("expected Group A, got %s", m.GroupName)
			}
		}

		for _, id := range teamIDs {
			if teamMatches[id] != 3 {
				t.Errorf("expected team %s to play 3 matches, got %d", id, teamMatches[id])
			}
		}
	})

	t.Run("Odd teams round robin with byes (3 teams)", func(t *testing.T) {
		teamIDs := []string{"team1", "team2", "team3"}
		fixtures := svc.GenerateRoundRobin(teamIDs, "Group B")

		// 3 teams = 3 * 2 / 2 = 3 matches total
		if len(fixtures) != 3 {
			t.Fatalf("expected 3 matches for 3 teams, got %d", len(fixtures))
		}

		for _, m := range fixtures {
			if m.HomeTeamID == nil || m.AwayTeamID == nil {
				t.Fatalf("fixture with bye should have been omitted")
			}
		}
	})
}

func TestFixtureService_GenerateSingleElimination(t *testing.T) {
	svc := NewFixtureService()

	t.Run("Insufficient teams returns nil", func(t *testing.T) {
		fixtures := svc.GenerateSingleElimination([]string{"team1"})
		if fixtures != nil {
			t.Fatalf("expected nil, got %v", fixtures)
		}
	})

	t.Run("4 teams single elimination", func(t *testing.T) {
		teamIDs := []string{"team1", "team2", "team3", "team4"}
		fixtures := svc.GenerateSingleElimination(teamIDs)

		// 4 teams -> 2 Semi-Finals + 1 Final = 3 matches
		if len(fixtures) != 3 {
			t.Fatalf("expected 3 matches, got %d", len(fixtures))
		}

		semiCount := 0
		finalCount := 0
		for _, m := range fixtures {
			if m.StageName == "Semi-Finals" {
				semiCount++
			} else if m.StageName == "Final" {
				finalCount++
			}
		}

		if semiCount != 2 {
			t.Errorf("expected 2 Semi-Finals, got %d", semiCount)
		}
		if finalCount != 1 {
			t.Errorf("expected 1 Final, got %d", finalCount)
		}
	})

	t.Run("8 teams single elimination", func(t *testing.T) {
		teamIDs := []string{"t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"}
		fixtures := svc.GenerateSingleElimination(teamIDs)

		// 8 teams -> 4 QF + 2 SF + 1 F = 7 matches
		if len(fixtures) != 7 {
			t.Fatalf("expected 7 matches, got %d", len(fixtures))
		}

		qfCount := 0
		for _, m := range fixtures {
			if m.StageName == "Quarter-Finals" {
				qfCount++
			}
		}
		if qfCount != 4 {
			t.Errorf("expected 4 Quarter-Finals, got %d", qfCount)
		}
	})
}
