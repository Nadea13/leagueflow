import { ActionResponse, Match } from "@/types/index";
import { SupabaseClient } from "@supabase/supabase-js";

export async function initTournamentStructure(tournamentId: string, supabase: SupabaseClient): Promise<ActionResponse> {
    // 1. Fetch tournament format and teams
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('format, start_date, end_date, number_of_pitches, max_teams, advancing_teams')
        .eq('id', tournamentId)
        .single();

    if (!tournament) {
        return { success: false, error: "Tournament not found" };
    }

    const { data: teams } = await supabase
        .from('tournament_teams')
        .select('id, team_id, group_name')
        .eq('tournament_id', tournamentId);

    const maxTeams = tournament.max_teams || 8;
    const fixtures: Partial<Match>[] = [];
    
    // We assume this is a fresh start, no matches yet. 
    // In actual server action, we might have lastRound check if they regenerate mid-way, 
    // but for "init", it's usually round 1.
    const startRound = 1;

    if (tournament.format === 'group_knockout') {
        let assignedGroups = Array.from(new Set(teams?.map((t) => t.group_name).filter(Boolean) || [])).sort();
        
        // If groups aren't defined yet, or we want to force re-distribution, 
        // we figure out how many groups we need. 
        // A simple way is to default to 2 groups if undefined.
        if (assignedGroups.length === 0) {
            assignedGroups = ["Group A", "Group B"];
        }

        const teamsInGroups: Record<string, (string | null)[]> = {};
        assignedGroups.forEach(g => teamsInGroups[g as string] = []);
        
        // *** SHUFFLE AND RE-ASSIGN LOGIC ***
        // To make "Regenerate" actually shuffle teams, we ignore their previous group_name 
        // and randomly distribute all existing teams into the available groups evenly.
        if (teams && teams.length > 0) {
            // 1. Shuffle teams
            const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
            
            // 2. Distribute evenly and collect promises
            const updatePromises = shuffledTeams.map((t, index) => {
                const groupName = assignedGroups[index % assignedGroups.length];
                teamsInGroups[groupName as string].push(t.id);
                // Return the update promise to await it properly
                return supabase.from('tournament_teams').update({ group_name: groupName }).eq('id', t.id);
            });

            // Await all group assignment updates before continuing
            const updateResults = await Promise.all(updatePromises);
            const updateError = updateResults.find(res => res.error);
            if (updateError) {
                console.error("Error updating team groups:", updateError.error);
                return { success: false, error: "Failed to distribute teams into groups." };
            }
        }

        const slotsPerGroup = Math.ceil(maxTeams / assignedGroups.length);
        assignedGroups.forEach(g => {
            while (teamsInGroups[g as string].length < slotsPerGroup) {
                teamsInGroups[g as string].push(null);
            }
        });

        const allGroupMatches: Partial<Match>[] = [];
        assignedGroups.forEach(groupName => {
            const groupTeams = teamsInGroups[groupName as string];
            const groupFixtures = generateRoundRobinMatches(groupTeams, tournamentId, 'group', startRound);
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
        const advancingTeamsPerGroup = tournament.advancing_teams || 2;
        const knockoutTeamCount = numGroups * advancingTeamsPerGroup;
        
        // Calculate required bracket size (next power of 2)
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
                        tournament_id: tournamentId,
                        round: currentRound,
                        stage: stageName,
                        status: 'scheduled',
                        is_manual: false,
                        match_index: kIndex++,
                        home_team_id: null,
                        away_team_id: null,
                    });
                }
                currentRound++;
                currentRoundMatchCount /= 2;
            }
        }

    } else if (tournament.format === 'knockout') {
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
                    tournament_id: tournamentId,
                    round: currentRound,
                    stage: stage,
                    status: 'scheduled',
                    is_manual: false,
                    match_index: globalMatchIndex++,
                    home_team_id: null,
                    away_team_id: null,
                };

                if (isFirstRound) {
                    match.home_team_id = slots[i * 2];
                    match.away_team_id = slots[i * 2 + 1];

                    if (match.home_team_id && !match.away_team_id) {
                        match.status = 'finished';
                        match.home_score = 3;
                        match.away_score = 0;
                        match.winner_id = match.home_team_id;
                    } else if (!match.home_team_id && match.away_team_id) {
                        match.status = 'finished';
                        match.home_score = 0;
                        match.away_score = 3;
                        match.winner_id = match.away_team_id;
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
                if (m.status === 'finished' && m.winner_id) {
                    const nextMatchIdx = Math.floor(idxInRound / 2);
                    const isHome = idxInRound % 2 === 0;
                    const nextMatch = nextRoundMatches[nextMatchIdx];
                    if (nextMatch) {
                        if (isHome) nextMatch.home_team_id = m.winner_id;
                        else nextMatch.away_team_id = m.winner_id;
                    }
                }
            });
        }

    } else if (tournament.format === 'league_ha' || tournament.format === 'league') {
        const actualTeams = teams ? [...teams].sort(() => Math.random() - 0.5) : [];
        const teamIds = Array(maxTeams).fill(null).map((_, i) => actualTeams[i]?.id || null);
        const leagueFixtures = generateRoundRobinMatches(teamIds, tournamentId, 'league', startRound, tournament.format === 'league_ha');

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

    console.log(`Inserting ${fixtures.length} matches for tournament ${tournamentId}`);
    if (fixtures.length > 0) {
        console.log("Sample fixture:", JSON.stringify(fixtures[0], null, 2));
        const invalidHome = fixtures.filter(f => f.home_team_id !== null && typeof f.home_team_id !== 'string');
        const invalidAway = fixtures.filter(f => f.away_team_id !== null && typeof f.away_team_id !== 'string');
        if (invalidHome.length > 0 || invalidAway.length > 0) {
            console.error("Invalid IDs found in fixtures!");
        }
    }

    const { error } = await supabase.from('matches').insert(fixtures);

    if (error) {
        console.error("Fixture generation error:", error);
        return { success: false, error: "Failed to create matches: " + error.message };
    }

    return { success: true };
}

function generateRoundRobinMatches(teamIds: (string | null)[], tournamentId: string, stage: 'league' | 'group', startRound: number = 1, doubleRoundRobin: boolean = false): Partial<Match>[] {
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
                    tournament_id: tournamentId,
                    home_team_id: home || null,
                    away_team_id: away || null,
                    round: startRound + round,
                    stage: stage,
                    status: 'scheduled',
                    is_manual: false,
                    home_score: 0,
                    away_score: 0
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
                tournament_id: tournamentId,
                home_team_id: match.away_team_id,
                away_team_id: match.home_team_id,
                round: (match.round || 0) + totalRounds,
                stage: stage,
                status: 'scheduled',
                is_manual: false,
                home_score: 0,
                away_score: 0
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
        match.match_date = currentDate.toISOString().split('T')[0];
        match.match_time = currentDate.toTimeString().split(' ')[0].substring(0, 5);
        match.venue = `Pitch ${currentPitch}`;

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
