package service

import (
	"fmt"
	"math"
)

type FixtureMatch struct {
	RoundNumber int    `json:"round_number"`
	MatchNumber int    `json:"match_number"`
	HomeTeamID  *string `json:"home_team_id"`
	AwayTeamID  *string `json:"away_team_id"`
	StageName   string `json:"stage_name"`
	GroupName   string `json:"group_name,omitempty"`
}

type FixtureService struct{}

func NewFixtureService() *FixtureService {
	return &FixtureService{}
}

// GenerateRoundRobin creates a round-robin schedule for a list of team IDs using Berger tables / Polygon rotation
func (s *FixtureService) GenerateRoundRobin(teamIDs []string, groupName string) []FixtureMatch {
	n := len(teamIDs)
	if n < 2 {
		return nil
	}

	teams := make([]*string, n)
	for i := range teamIDs {
		t := teamIDs[i]
		teams[i] = &t
	}

	// If odd number of teams, add a dummy bye
	hasBye := false
	if n%2 != 0 {
		teams = append(teams, nil)
		n++
		hasBye = true
	}

	rounds := n - 1
	matchesPerRound := n / 2
	var fixtures []FixtureMatch
	matchCounter := 1

	for round := 0; round < rounds; round++ {
		for i := 0; i < matchesPerRound; i++ {
			homeIdx := (round + i) % (n - 1)
			awayIdx := (n - 1 - i + round) % (n - 1)

			if i == 0 {
				awayIdx = n - 1
			}

			home := teams[homeIdx]
			away := teams[awayIdx]

			// Alternate home/away for the fixed team
			if i == 0 && round%2 != 0 {
				home, away = away, home
			}

			// Skip match if one of them is bye
			if hasBye && (home == nil || away == nil) {
				continue
			}

			fixtures = append(fixtures, FixtureMatch{
				RoundNumber: round + 1,
				MatchNumber: matchCounter,
				HomeTeamID:  home,
				AwayTeamID:  away,
				StageName:   "Group Stage",
				GroupName:   groupName,
			})
			matchCounter++
		}
	}

	return fixtures
}

// GenerateSingleElimination generates a single elimination bracket skeleton
func (s *FixtureService) GenerateSingleElimination(teamIDs []string) []FixtureMatch {
	n := len(teamIDs)
	if n < 2 {
		return nil
	}

	// Next power of 2
	power := int(math.Ceil(math.Log2(float64(n))))
	totalSlots := int(math.Pow(2, float64(power)))
	totalRounds := power

	var fixtures []FixtureMatch
	matchCounter := 1

	currentRoundMatches := totalSlots / 2
	for round := 1; round <= totalRounds; round++ {
		stageName := fmt.Sprintf("Round of %d", currentRoundMatches*2)
		if currentRoundMatches == 1 {
			stageName = "Final"
		} else if currentRoundMatches == 2 {
			stageName = "Semi-Finals"
		} else if currentRoundMatches == 4 {
			stageName = "Quarter-Finals"
		}

		for m := 1; m <= currentRoundMatches; m++ {
			var homeID, awayID *string
			if round == 1 {
				// Seed first round
				homeIdx := (m - 1) * 2
				awayIdx := homeIdx + 1
				if homeIdx < n {
					homeID = &teamIDs[homeIdx]
				}
				if awayIdx < n {
					awayID = &teamIDs[awayIdx]
				}
			}

			fixtures = append(fixtures, FixtureMatch{
				RoundNumber: round,
				MatchNumber: matchCounter,
				HomeTeamID:  homeID,
				AwayTeamID:  awayID,
				StageName:   stageName,
			})
			matchCounter++
		}

		currentRoundMatches /= 2
	}

	return fixtures
}
