import { ActionResponse, Match } from "@/types/index";
import { SupabaseClient } from "@supabase/supabase-js";

const getScoreTotal = (scoreObj: any): number => {
    if (!scoreObj) return 0;
    if (typeof scoreObj === 'object') {
        return scoreObj.total || 0;
    }
    const val = Number(scoreObj);
    return isNaN(val) ? 0 : val;
};

export async function initTournamentStructure(tournamentId: string, supabase: SupabaseClient): Promise<ActionResponse> {
    // 1. Fetch tournament dates and pitches
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('start_date, end_date, number_of_pitches')
        .eq('id', tournamentId)
        .single();

    if (!tournament) {
        return { success: false, error: "Tournament not found" };
    }

    // 2. Fetch the category (default to the first category setup)
    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id, max_teams')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) {
        return { success: false, error: "No tournament category setup found" };
    }

    const tournamentCategoryId = category.id;
    const maxTeams = category.max_teams || 8;
    const format: string = 'knockout'; // Fallback format since it's removed from tournaments table
    const advancingTeams = 2;  // Default fallback

    // 3. Fetch registered teams for this category
    const { data: teams } = await supabase
        .from('tournament_teams')
        .select('id, team_id')
        .eq('tournament_category_id', tournamentCategoryId)
        .is('deleted_at', null);

    const fixtures: Partial<Match>[] = [];
    const startRound = 1;

    if (format === 'group_knockout') {
        // Group knockout format - fallback/simplified: Treat as knockout if no groups can be assigned
        const slotsPerGroup = Math.ceil(maxTeams / 2);
        const assignedGroups = ["Group A", "Group B"];
        const teamsInGroups: Record<string, (string | null)[]> = {
            "Group A": [],
            "Group B": []
        };

        if (teams && teams.length > 0) {
            const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
            shuffledTeams.forEach((t, index) => {
                const groupName = assignedGroups[index % assignedGroups.length];
                teamsInGroups[groupName].push(t.id);
            });
        }

        assignedGroups.forEach(g => {
            while (teamsInGroups[g].length < slotsPerGroup) {
                teamsInGroups[g].push(null);
            }
        });

        const allGroupMatches: Partial<Match>[] = [];
        assignedGroups.forEach(groupName => {
            const groupTeams = teamsInGroups[groupName];
            const groupFixtures = generateRoundRobinMatches(groupTeams, tournamentCategoryId, 'group', startRound);
            allGroupMatches.push(...groupFixtures);
        });

        const matchesByRound: Record<number, Partial<Match>[]> = {};
        allGroupMatches.forEach(m => {
            const r = m.round || startRound;
            if (!matchesByRound[r]) matchesByRound[r] = [];
            matchesByRound[r].push(m);
        });

        const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
        let globalMatchIndex = 1;
        sortedRounds.forEach(r => {
            const roundMatches = matchesByRound[r];
            roundMatches.forEach(m => {
                m.match_index = globalMatchIndex++;
                fixtures.push(m);
            });
        });

        const numGroups = assignedGroups.length;
        const knockoutTeamCount = numGroups * advancingTeams;
        
        let bracketSize = 2;
        while (bracketSize < knockoutTeamCount) {
            bracketSize *= 2;
        }

        let currentRoundMatchCount = bracketSize / 2;

        if (currentRoundMatchCount >= 1) {
            let maxGroupRound = startRound;
            fixtures.forEach(f => {
                if (f.round && f.round > maxGroupRound) maxGroupRound = f.round;
            });

            let currentRound = maxGroupRound + 1;
            let kIndex = globalMatchIndex;

            while (currentRoundMatchCount >= 1) {
                let stageName: Match['stage'];
                if (currentRoundMatchCount === 1) stageName = 'final';
                else if (currentRoundMatchCount === 2) stageName = 'semi_final';
                else if (currentRoundMatchCount === 4) stageName = 'quarter_final';
                else if (currentRoundMatchCount === 8) stageName = 'round_of_16';
                else if (currentRoundMatchCount === 16) stageName = 'round_of_32';
                else stageName = 'round_of_64';

                for (let i = 0; i < currentRoundMatchCount; i++) {
                    fixtures.push({
                        tournament_category_id: tournamentCategoryId,
                        round: currentRound,
                        stage: stageName,
                        status: 'scheduled',
                        is_manual: false,
                        match_index: kIndex++,
                        home_team_id: null,
                        away_team_id: null,
                        home_score: { total: 0 },
                        away_score: { total: 0 }
                    });
                }
                currentRound++;
                currentRoundMatchCount /= 2;
            }
        }

    } else if (format === 'knockout') {
        const totalSlots = maxTeams;
        let bracketSize = 2;
        while (bracketSize < totalSlots) {
            bracketSize *= 2;
        }

        // Shuffle teams to randomize bracket placement
        const actualTeams = teams ? [...teams].sort(() => Math.random() - 0.5) : [];
        const slots: (string | null)[] = Array(bracketSize).fill(null);
        
        actualTeams.forEach((t, i) => {
            if (i < bracketSize) slots[i] = t.id;
        });

        let currentRoundMatchCount = bracketSize / 2;
        let currentRound = startRound;
        let isFirstRound = true;
        let globalMatchIndex = 1;

        while (currentRoundMatchCount >= 1) {
            let stage: Match['stage'];
            if (currentRoundMatchCount === 1) stage = 'final';
            else if (currentRoundMatchCount === 2) stage = 'semi_final';
            else if (currentRoundMatchCount === 4) stage = 'quarter_final';
            else if (currentRoundMatchCount === 8) stage = 'round_of_16';
            else if (currentRoundMatchCount === 16) stage = 'round_of_32';
            else stage = 'round_of_64';

            for (let i = 0; i < currentRoundMatchCount; i++) {
                const match: Partial<Match> = {
                    tournament_category_id: tournamentCategoryId,
                    round: currentRound,
                    stage: stage,
                    status: 'scheduled',
                    is_manual: false,
                    match_index: globalMatchIndex++,
                    home_team_id: null,
                    away_team_id: null,
                    home_score: { total: 0 },
                    away_score: { total: 0 }
                };

                if (isFirstRound) {
                    match.home_team_id = slots[i * 2];
                    match.away_team_id = slots[i * 2 + 1];

                    if (match.home_team_id && !match.away_team_id) {
                        match.status = 'finished';
                        match.home_score = { total: 3 };
                        match.away_score = { total: 0 };
                    } else if (!match.home_team_id && match.away_team_id) {
                        match.status = 'finished';
                        match.home_score = { total: 0 };
                        match.away_score = { total: 3 };
                    }
                }
                fixtures.push(match);
            }

            currentRound++;
            currentRoundMatchCount /= 2;
            isFirstRound = false;
        }

        const roundFixtures = (r: number) => fixtures.filter(f => f.round === r).sort((a, b) => (a.match_index || 0) - (b.match_index || 0));
        for (let r = startRound; r < currentRound - 1; r++) {
            const matchesInRound = roundFixtures(r);
            const nextRoundMatches = roundFixtures(r + 1);
            matchesInRound.forEach((m: Partial<Match>, idxInRound: number) => {
                if (m.status === 'finished') {
                    const homeTotal = getScoreTotal(m.home_score);
                    const awayTotal = getScoreTotal(m.away_score);
                    const winnerId = homeTotal > awayTotal ? m.home_team_id : m.away_team_id;

                    if (winnerId) {
                        const nextMatchIdx = Math.floor(idxInRound / 2);
                        const isHome = idxInRound % 2 === 0;
                        const nextMatch = nextRoundMatches[nextMatchIdx];
                        if (nextMatch) {
                            if (isHome) nextMatch.home_team_id = winnerId;
                            else nextMatch.away_team_id = winnerId;
                        }
                    }
                }
            });
        }

    } else if (format === 'league_ha' || format === 'league') {
        const actualTeams = teams ? [...teams].sort(() => Math.random() - 0.5) : [];
        const teamIds = Array(maxTeams).fill(null).map((_, i) => actualTeams[i]?.id || null);
        const leagueFixtures = generateRoundRobinMatches(teamIds, tournamentCategoryId, 'league', startRound, format === 'league_ha');

        let globalMatchIndex = 1;
        const matchesByRound: Record<number, Partial<Match>[]> = {};
        leagueFixtures.forEach(m => {
            const r = m.round || startRound;
            if (!matchesByRound[r]) matchesByRound[r] = [];
            matchesByRound[r].push(m);
        });

        const sortedRounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
        sortedRounds.forEach(r => {
            matchesByRound[r].forEach(m => {
                m.match_index = globalMatchIndex++;
                fixtures.push(m);
            });
        });
    }

    if (tournament.start_date && fixtures.length > 0) {
        assignMatchTimes(fixtures, tournament.start_date, tournament.end_date, tournament.number_of_pitches || 1);
    }

    if (fixtures.length === 0) {
        return { success: false, error: "No fixtures generated." };
    }

    console.log(`Inserting ${fixtures.length} matches for tournament ${tournamentId} / category ${tournamentCategoryId}`);
    const { error } = await supabase.from('matches').insert(fixtures);

    if (error) {
        console.error("Fixture generation error:", error);
        return { success: false, error: "Failed to create matches: " + error.message };
    }

    return { success: true };
}

function generateRoundRobinMatches(teamIds: (string | null)[], tournamentCategoryId: string, stage: 'league' | 'group', startRound: number = 1, doubleRoundRobin: boolean = false): Partial<Match>[] {
    const fixtures: Partial<Match>[] = [];
    const leagueTeams = [...teamIds];

    if (leagueTeams.length % 2 !== 0) {
        leagueTeams.push(null);
    }
    const rotatingTeams = leagueTeams;

    const totalRounds = rotatingTeams.length - 1;
    const matchesPerRound = rotatingTeams.length / 2;

    for (let round = 0; round < totalRounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
            let home = rotatingTeams[match];
            let away = rotatingTeams[rotatingTeams.length - 1 - match];

            if (round % 2 === 1) {
                const temp = home;
                home = away;
                away = temp;
            }

            if (home !== null || away !== null) {
                fixtures.push({
                    tournament_category_id: tournamentCategoryId,
                    home_team_id: home || null,
                    away_team_id: away || null,
                    round: startRound + round,
                    stage: stage,
                    status: 'scheduled',
                    is_manual: false,
                    home_score: { total: 0 },
                    away_score: { total: 0 }
                });
            }
        }

        if (rotatingTeams.length > 1) {
            const lastTeam = rotatingTeams.pop();
            if (lastTeam !== undefined) {
                rotatingTeams.splice(1, 0, lastTeam);
            }
        }
    }

    if (doubleRoundRobin) {
        const firstLegCount = fixtures.length;
        for (let i = 0; i < firstLegCount; i++) {
            const match = fixtures[i];
            fixtures.push({
                tournament_category_id: tournamentCategoryId,
                home_team_id: match.away_team_id,
                away_team_id: match.home_team_id,
                round: (match.round || 0) + totalRounds,
                stage: stage,
                status: 'scheduled',
                is_manual: false,
                home_score: { total: 0 },
                away_score: { total: 0 }
            });
        }
    }

    return fixtures;
}

function assignMatchTimes(fixtures: Partial<Match>[], startDateStr: string, endDateStr: string | null | undefined, numberOfPitches: number) {
    if (!startDateStr) return;

    const currentDate = new Date(startDateStr);
    currentDate.setHours(8, 0, 0, 0);

    const START_HOUR = 8;
    const END_HOUR = 20;
    const MATCH_DURATION_MINS = 120;

    let currentPitch = 1;

    for (const match of fixtures) {
        match.scheduled_at = currentDate.toISOString();

        if (currentPitch < numberOfPitches) {
            currentPitch++;
        } else {
            currentPitch = 1;
            currentDate.setMinutes(currentDate.getMinutes() + MATCH_DURATION_MINS);

            if (currentDate.getHours() >= END_HOUR) {
                currentDate.setDate(currentDate.getDate() + 1);
                currentDate.setHours(START_HOUR, 0, 0, 0);
            }
        }
    }
}
