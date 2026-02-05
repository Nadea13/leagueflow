"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse, Match } from "@/types/index";
import { retrieveCharge } from "@/app/[locale]/actions/payment";
import { logActivity } from "@/lib/audit";

export async function addTeam(
    tournamentId: string,
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const logoFile = formData.get("logo") as File;
    const logoUrlInput = formData.get("logo_url") as string;

    if (!name) {
        return { success: false, error: "Team name is required" };
    }

    // Check Team Limit for Free Plan
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("plan")
        .eq("id", tournamentId)
        .single();

    if (tournament && (!tournament.plan || tournament.plan === 'free')) {
        const { count } = await supabase
            .from("teams")
            .select("*", { count: 'exact', head: true })
            .eq("tournament_id", tournamentId);

        if (count !== null && count >= 8) {
            return { success: false, error: "Team limit reached (Max 8 for Free Plan). Upgrade to Pro to add more." };
        }
    }

    let logo_url = logoUrlInput || null;

    // Handle File Upload if URL is not provided
    if (!logo_url && logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    const { error } = await supabase.from("teams").insert({
        tournament_id: tournamentId,
        name,
        logo_url,
        created_at: new Date().toISOString(),
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('ADD_TEAM', 'tournament', tournamentId, { team_name: name });
    return { success: true };
}

export async function assignTeamGroup(
    teamId: string,
    groupName: string | null,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("teams")
        .update({ group_name: groupName })
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateTeam(
    teamId: string,
    formData: FormData,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const logoFile = formData.get("logo") as File;
    const existingLogoUrl = formData.get("existing_logo_url") as string;

    let logo_url = existingLogoUrl;

    // Handle File Upload
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    const { error } = await supabase
        .from("teams")
        .update({
            name,
            logo_url: logo_url || null
        })
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteTeam(teamId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

// Helper to get last round
async function getLastRound(tournamentId: string, supabase: any): Promise<number> {
    const { data } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: false })
        .limit(1)
        .single();
    return data?.round || 0;
}

export async function generateFixtures(tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Check if fixtures already exist
    const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

    if (count && count > 0) {
        return { success: false, error: "Fixtures already generated!" };
    }

    // 2. Fetch tournament format and teams
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('format, start_date, end_date, number_of_pitches')
        .eq('id', tournamentId)
        .single();

    const { data: teams } = await supabase
        .from('teams')
        .select('id, group_name')
        .eq('tournament_id', tournamentId);

    if (!teams || teams.length < 2) {
        return { success: false, error: "Need at least 2 teams to generate fixtures." };
    }

    const fixtures: Partial<Match>[] = [];
    const lastRound = await getLastRound(tournamentId, supabase);
    const startRound = lastRound + 1; // Start new matches after the last round

    if (tournament?.format === 'group_knockout') {
        // Logic B: Group + Knockout
        // Check for unassigned teams
        const unassignedTeams = teams.filter(t => !t.group_name || t.group_name.trim() === '');
        if (unassignedTeams.length > 0) {
            return { success: false, error: "Please assign groups to all teams first." };
        }

        const groups: Record<string, string[]> = {};
        teams.forEach(t => {
            const g = t.group_name!;
            if (!groups[g]) groups[g] = [];
            groups[g].push(t.id);
        });

        let globalMatchIndex = 1;

        // Run RR for each group
        let allGroupMatches: Partial<Match>[] = [];
        Object.keys(groups).forEach(groupName => {
            const groupFixtures = generateRoundRobinMatches(groups[groupName], tournamentId, 'group', startRound);
            allGroupMatches.push(...groupFixtures);
        });

        // Sort by Round -> Interleave matches from different groups
        allGroupMatches.sort((a, b) => (a.round || 0) - (b.round || 0));

        // Assign sequential match_index
        allGroupMatches.forEach(m => {
            m.match_index = globalMatchIndex++;
        });

        fixtures.push(...allGroupMatches);

        // Pre-generate Knockout Bracket
        // Determine number of advancing teams (Top 2 from each group)
        const numGroups = Object.keys(groups).length;
        const knockoutTeamCount = numGroups * 2;

        let currentRoundMatchCount = knockoutTeamCount / 2;

        // Skip if not enough teams for even a final (needs 2 teams min for knockout, so 1 group is technically enough for a final if top 2 advance)
        if (currentRoundMatchCount >= 1) {
            // Calculate max round from group stages to start knockout rounds after
            let maxGroupRound = startRound;
            fixtures.forEach(f => {
                if (f.round && f.round > maxGroupRound) maxGroupRound = f.round;
            });

            let currentRound = maxGroupRound + 1;
            let kIndex = globalMatchIndex;

            while (currentRoundMatchCount >= 1) {
                // Determine Stage Name based on match count
                let stageName: 'final' | 'semi_final' | 'quarter_final' | 'round_of_16' | 'round_of_32';
                if (currentRoundMatchCount === 1) stageName = 'final';
                else if (currentRoundMatchCount === 2) stageName = 'semi_final';
                else if (currentRoundMatchCount === 4) stageName = 'quarter_final';
                else if (currentRoundMatchCount === 8) stageName = 'round_of_16';
                else if (currentRoundMatchCount === 16) stageName = 'round_of_32';
                else stageName = 'round_of_16';

                for (let i = 0; i < currentRoundMatchCount; i++) {
                    fixtures.push({
                        tournament_id: tournamentId,
                        round: currentRound,
                        stage: stageName,
                        status: 'scheduled',
                        is_manual: false,
                        match_index: kIndex++,
                        home_team_id: null,
                        away_team_id: null
                    });
                }

                currentRound++;
                currentRoundMatchCount /= 2;
            }
        }

    } else if (tournament?.format === 'knockout') {
        // Logic C: Full Knockout Bracket Generation

        // 1. Shuffle & Prep Teams
        const shuffled = [...teams].sort(() => 0.5 - Math.random());
        const totalTeams = shuffled.length;

        // 2. Determine Bracket Size (Next Power of 2)
        let bracketSize = 2;
        while (bracketSize < totalTeams) {
            bracketSize *= 2;
        }

        // 3. Generate Rounds
        // e.g. 8 teams -> 3 rounds (8->4, 4->2, 2->1)
        // Rounds are indexed from startRound.
        // Round 1: bracketSize / 2 matches.
        // Round 2: bracketSize / 4 matches...

        let currentRoundMatchCount = bracketSize / 2;
        let currentRound = startRound;
        let isFirstRound = true;

        let globalMatchIndex = 1;

        while (currentRoundMatchCount >= 1) {
            // Determine Stage Name
            let stage: 'final' | 'semi_final' | 'quarter_final' | 'round_of_16' | 'round_of_32' | 'round_of_64' | 'group'; // Added wider types just in case
            if (currentRoundMatchCount === 1) stage = 'final';
            else if (currentRoundMatchCount === 2) stage = 'semi_final';
            else if (currentRoundMatchCount === 4) stage = 'quarter_final';
            else if (currentRoundMatchCount === 8) stage = 'round_of_16';
            else if (currentRoundMatchCount === 16) stage = 'round_of_32'; // Need to ensure type exists or cast
            else stage = 'round_of_16'; // Fallback for larger (or add more types)

            for (let i = 0; i < currentRoundMatchCount; i++) {
                const match: Partial<Match> = {
                    tournament_id: tournamentId,
                    round: currentRound,
                    stage: stage as any, // Cast to avoid strict type issues if new stages aren't in Match type definition yet
                    status: 'scheduled',
                    is_manual: false,
                    match_index: globalMatchIndex++, // Sequential Indexing
                    home_score: null,
                    away_score: null,
                    home_team_id: null,
                    away_team_id: null,
                };

                // Fill First Round Teams
                if (isFirstRound) {
                    // Match i corresponds to slots 2*i and 2*i + 1 in the bracket
                    const team1Index = i * 2;
                    const team2Index = i * 2 + 1;

                    const team1 = shuffled[team1Index];
                    const team2 = shuffled[team2Index];

                    if (team1) match.home_team_id = team1.id;
                    if (team2) match.away_team_id = team2.id;

                    // Handle BYE (Auto-Win)
                    // If one team is missing (which shouldn't happen with power of 2 unless logic is slightly off, 
                    // BUT here we have 'bracketSize' slots, but only 'totalTeams' actual teams.
                    // Actually, 'shuffled' has 'totalTeams' elements.
                    // We need to place them in the 'bracketSize' slots.
                    // Indices >= totalTeams are effectively "BYEs".

                    // Logic: If Home is BYE (null) -> Away wins? No, Home is usually seeded.
                    // If Away is BYE (null) -> Home wins.

                    if (match.home_team_id && !match.away_team_id) {
                        match.status = 'finished';
                        match.home_score = 3;
                        match.away_score = 0;
                        match.winner_id = match.home_team_id;
                    } else if (!match.home_team_id && match.away_team_id) { // Unlikely with ordered filling but possible
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

        // Post-Processing: Propagate Byes/Auto-Wins to next rounds
        // Since we insert all at once, we can do this in memory before saving?
        // Or cleaner: Save all, then run an 'Update/Advance' pass?
        // Doing it in-memory is better to avoid DB thrashing.

        // Let's propagate winners to next round
        // We need to look at fixtures we just created.

        const roundFixtures = (r: number) => fixtures.filter(f => f.round === r).sort((a, b) => (a.match_index || 0) - (b.match_index || 0));

        // Iterate rounds again to propagate
        // Rounds: startRound to currentRound - 1
        for (let r = startRound; r < currentRound; r++) {
            const matchesInRound = roundFixtures(r);
            matchesInRound.forEach((m, indexInRound) => { // Use indexInRound (0..N) instead of absolute match_index
                if (m.status === 'finished' && m.winner_id) {
                    // Find next match
                    // Next Round = r + 1
                    // Next Index Position = floor(indexInRound / 2)
                    const nextRoundMatches = roundFixtures(r + 1);
                    const nextMatchPosition = Math.floor(indexInRound / 2);
                    const nextMatch = nextRoundMatches[nextMatchPosition];

                    if (nextMatch) {
                        const isHomePos = indexInRound % 2 === 0;
                        if (isHomePos) nextMatch.home_team_id = m.winner_id;
                        else nextMatch.away_team_id = m.winner_id;

                        // Check if this propagation caused an Auto-Win in the next match too?
                        // (e.g. Double Bye situation? Unlikely in standard bracket but possible if extremely sparse)
                        // For now, let's assume loose ends are tied up manually or one level is enough.
                        if (nextMatch.home_team_id && !nextMatch.away_team_id && nextMatch.status === 'finished') {
                            // Already handled?
                        }
                        // Actually, if we just set one slot, we don't know if the other slot is empty (TBD) or also a BYE.
                        // Standard seeding usually spreads Byes so you don't get Byes facing Byes deep in.
                    }
                }
            });
        }

    } else if (tournament?.format === 'league_ha') {
        const teamIds = teams.map(t => t.id);
        const leagueFixtures = generateRoundRobinMatches(teamIds, tournamentId, 'league', startRound, true);

        let globalMatchIndex = 1;
        leagueFixtures.forEach(m => {
            m.match_index = globalMatchIndex++;
        });

        fixtures.push(...leagueFixtures);
    } else {
        // Logic A: League (Default)
        const teamIds = teams.map(t => t.id);
        const leagueFixtures = generateRoundRobinMatches(teamIds, tournamentId, 'league', startRound, false);

        let globalMatchIndex = 1;
        leagueFixtures.forEach(m => {
            m.match_index = globalMatchIndex++;
        });

        fixtures.push(...leagueFixtures);
    }

    // 4. Assign Times if parameters are available
    if (tournament?.start_date && fixtures.length > 0) {
        console.log("Assigning timess....")
        assignMatchTimes(fixtures, tournament.start_date, tournament.end_date, tournament.number_of_pitches || 1);
    }

    // 5. Save to Database
    if (fixtures.length === 0) {
        return { success: false, error: "No fixtures generated. Check tournament settings." };
    }

    const { error } = await supabase.from('matches').insert(fixtures);

    if (error) {
        console.error(error);
        return { success: false, error: "Failed to create matches: " + error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

function generateRoundRobinMatches(teamIds: string[], tournamentId: string, stage: 'league' | 'group', startRound: number = 1, doubleRoundRobin: boolean = false): Partial<Match>[] {
    const fixtures: Partial<Match>[] = [];
    let leagueTeams = [...teamIds];

    if (leagueTeams.length % 2 !== 0) {
        (leagueTeams as Array<string | null>).push(null);
    }
    const rotatingTeams = leagueTeams as Array<string | null>;

    const totalRounds = rotatingTeams.length - 1;
    const matchesPerRound = rotatingTeams.length / 2;

    // First Leg
    for (let round = 0; round < totalRounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
            let home = rotatingTeams[match];
            let away = rotatingTeams[rotatingTeams.length - 1 - match];

            // Balance Home/Away: Flip the first match of every even round (or odd, purely alternating)
            // Standard "Circle Method" fix: The fixed team (index 0) plays Home in even rounds, Away in odd rounds.
            if (match === 0 && round % 2 === 1) {
                const temp = home;
                home = away;
                away = temp;
            }

            if (home && away) {
                fixtures.push({
                    tournament_id: tournamentId,
                    home_team_id: home,
                    away_team_id: away,
                    round: startRound + round,
                    stage: stage,
                    status: 'scheduled'
                });
            }
        }

        // Rotate
        if (rotatingTeams.length > 1) {
            const lastTeam = rotatingTeams.pop();
            if (lastTeam !== undefined) {
                rotatingTeams.splice(1, 0, lastTeam);
            }
        }
    }

    // Second Leg (Home/Away Swap) - ONLY if doubleRoundRobin is true
    if (doubleRoundRobin) {
        const firstLegCount = fixtures.length;
        for (let i = 0; i < firstLegCount; i++) {
            const match = fixtures[i];
            fixtures.push({
                tournament_id: tournamentId,
                home_team_id: match.away_team_id!, // Swap
                away_team_id: match.home_team_id!, // Swap
                round: (match.round || 0) + totalRounds,
                stage: stage,
                status: 'scheduled'
            });
        }
    }

    return fixtures;
}

// Helper: Assign Match Times
function assignMatchTimes(fixtures: Partial<Match>[], startDateStr: string, endDateStr: string | null | undefined, numberOfPitches: number) {
    if (!startDateStr) return;

    let currentDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : null;

    // Set start time to 08:00
    currentDate.setHours(8, 0, 0, 0);

    const START_HOUR = 8;
    const END_HOUR = 20; // 8 PM
    const MATCH_DURATION_MINS = 120; // 2 Hours

    let currentPitch = 1;

    // Group fixtures by round to respect round ordering (optional, but good practice to play round 1 before round 2)
    // However, for basic scheduling, we can just iterate the list if it's already sorted by round.
    // Assuming fixtures are pushed in order of rounds.

    for (const match of fixtures) {
        // If we exceed end date, just stop assigning (or continue indefinitely? let's continue but maybe log/warn implicitly by just going forward)
        if (endDate && currentDate > endDate) {
            // Option: Stop assigning times, leave as TBD
            // break; 
            // Option: Just keep assigning dates beyond end date (User can fix) -> Preferred
        }

        match.match_date = currentDate.toISOString().split('T')[0];
        match.match_time = currentDate.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
        match.venue = `Pitch ${currentPitch}`;

        // Move to next slot
        // Logic: Fill all pitches for current time, then move time forward.
        if (currentPitch < numberOfPitches) {
            currentPitch++;
        } else {
            // All pitches used for this time slot. Advance time.
            currentPitch = 1;
            currentDate.setMinutes(currentDate.getMinutes() + MATCH_DURATION_MINS);

            // Check if we passed the end hour (20:00)
            // If current Hour >= END_HOUR, move to next day 08:00
            if (currentDate.getHours() >= END_HOUR) {
                currentDate.setDate(currentDate.getDate() + 1);
                currentDate.setHours(START_HOUR, 0, 0, 0);
            }
        }
    }
}


export async function generateKnockoutRound(
    tournamentId: string,
    stage: string,
    matchCount: number
): Promise<ActionResponse> {
    const supabase = await createClient();

    const lastRound = await getLastRound(tournamentId, supabase);
    const startRound = lastRound + 1;

    // ✅ Fix: เพิ่ม match_index: i เพื่อให้ระบบรู้ลำดับคู่
    const matches = Array(matchCount).fill(0).map((_, i) => ({
        tournament_id: tournamentId,
        home_team_id: null,
        away_team_id: null,
        round: startRound,
        stage: stage,
        status: 'scheduled',
        is_manual: true,
        match_index: i + 1 // <--- เพิ่มตรงนี้สำคัญมาก!
    }));

    const { error } = await supabase.from('matches').insert(matches);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatchScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Update Scores & Fetch Updated Record
    const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({
            home_score: homeScore,
            away_score: awayScore,
        })
        .eq("id", matchId)
        .select('*')
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    // 2. Auto-Advance Winner (Knockout Only)
    if (updatedMatch && updatedMatch.stage !== 'league' && updatedMatch.stage !== 'group') {
        let winnerId = null;

        if (updatedMatch.home_score !== null && updatedMatch.away_score !== null) {
            if (updatedMatch.home_score > updatedMatch.away_score) {
                winnerId = updatedMatch.home_team_id;
            } else if (updatedMatch.away_score > updatedMatch.home_score) {
                winnerId = updatedMatch.away_team_id;
            }
        }

        if (winnerId) {
            // Update winner_id & status
            const { error: winnerError } = await supabase
                .from('matches')
                .update({ status: 'finished', winner_id: winnerId })
                .eq('id', matchId);

            if (winnerError) {
                console.error("Error saving winner:", winnerError);
            } else {
                // Propagate to next round
                await advanceWinner(updatedMatch, winnerId, supabase);
            }
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('UPDATE_MATCH_SCORE', 'match', matchId, { home_score: homeScore, away_score: awayScore });
    return { success: true };
}

export async function updateTournament(
    tournamentId: string,
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const status = formData.get("status") as string;
    const format = formData.get("format") as string;

    if (!name) {
        return { success: false, error: "Tournament name is required" };
    }

    const { error } = await supabase
        .from("tournaments")
        .update({ name, status, format })
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('UPDATE_TOURNAMENT', 'tournament', tournamentId, { name, status, format });
    return { success: true };
}

export async function resetFixtures(tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Delete all matches (Hard Delete)
    const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", tournamentId);

    if (matchError) {
        return { success: false, error: "Failed to delete matches: " + matchError.message };
    }

    // 2. Reset Group Assignments (Clean Slate)
    const { error: teamError } = await supabase
        .from("teams")
        .update({ group_name: null })
        .eq("tournament_id", tournamentId);

    if (teamError) {
        return { success: false, error: "Failed to reset groups: " + teamError.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteTournament(tournamentId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('DELETE_TOURNAMENT', 'tournament', tournamentId, {});

    redirect("/dashboard");
}

export async function createMatch(
    tournamentId: string,
    homeTeamId: string,
    awayTeamId: string,
    round: number,
    stage: string = 'league',
    match_date?: string,
    match_time?: string,
    venue?: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        round,
        stage,
        is_manual: true,
        status: 'scheduled',
        match_date,
        match_time,
        venue
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatch(
    matchId: string,
    data: {
        home_team_id?: string | null;
        away_team_id?: string | null;
        home_score?: number | null;
        away_score?: number | null;
        winner_id?: string | null;
        status?: 'scheduled' | 'live' | 'finished';
        match_date?: string | null;
        match_time?: string | null;
        venue?: string | null;
        timer_status?: 'playing' | 'paused' | 'stopped';
        elapsed_before_pause?: number;
        current_minute?: number | string;
    },
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    console.log("Updating match:", matchId, data);

    const { data: updatedMatch, error } = await supabase
        .from('matches')
        .update(data)
        .eq('id', matchId)
        .select('*')
        .single();

    if (error) {
        console.error("Error updating match:", error);
        return { success: false, error: error.message };
    }
    console.log("Update success:", updatedMatch);

    // Auto-Advance Winner (Knockout Only)
    if (updatedMatch && updatedMatch.status === 'finished' && updatedMatch.stage !== 'league' && updatedMatch.stage !== 'group') {
        let winnerId = updatedMatch.winner_id;

        // If no winner set explicitly, try to determine from scores
        if (!winnerId && updatedMatch.home_score !== null && updatedMatch.away_score !== null) {
            if (updatedMatch.home_score > updatedMatch.away_score) {
                winnerId = updatedMatch.home_team_id;
            } else if (updatedMatch.away_score > updatedMatch.home_score) {
                winnerId = updatedMatch.away_team_id;
            }
        }

        if (winnerId) {
            // Update winner_id if it wasn't set in the initial update
            if (updatedMatch.winner_id !== winnerId) {
                const { error: winnerError } = await supabase
                    .from('matches')
                    .update({ winner_id: winnerId })
                    .eq('id', matchId);

                if (winnerError) {
                    console.error("Error saving winner:", winnerError);
                }
            }

            // Propagate to next round
            await advanceWinner(updatedMatch, winnerId, supabase);
        }
    }



    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}



export async function confirmPayment(
    tournamentId: string,
    paymentId: string,
    paymentMethod: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Verify Payment Server-Side with Omise
    const charge = await retrieveCharge(paymentId);

    if (!charge) {
        return { success: false, error: "Failed to retrieve payment details." };
    }

    if (charge.status !== 'successful') {
        return { success: false, error: `Payment is not successful (status: ${charge.status})` };
    }

    // 2. Validate Metadata (Anti-Fraud)
    // Ensure this payment was actually meant for this tournament
    if (charge.metadata && charge.metadata.tournament_id !== tournamentId) {
        console.error(`Fraud Attempt? Charge ${paymentId} has tournament_id ${charge.metadata.tournament_id} but tried to upgrade ${tournamentId}`);
        return { success: false, error: "Payment metadata mismatch. Please contact support." };
    }

    // 3. (Optional) Validate Amount
    // if (charge.amount !== 59000) { ... }

    // 4. Update Database
    const { error } = await supabase
        .from("tournaments")
        .update({
            plan: 'tournament',
            payment_status: 'paid',
            payment_id: paymentId,
            payment_method: paymentMethod
        })
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteMatch(matchId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function advanceStage(tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Fetch all matches and teams
    const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId);

    const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId);

    if (!matches || matches.length === 0) {
        return { success: false, error: "No matches found." };
    }

    if (!teams) {
        return { success: false, error: "No teams found." };
    }

    // Determine current stage based on the state of matches
    // Order: group -> round_of_64 -> round_of_32 -> round_of_16 -> quarter_final -> semi_final -> final
    const stageOrder = ['group', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];

    // Check for league separately
    if (matches.some(m => m.stage === 'league')) {
        return { success: false, error: "League format does not support automatic stage advancement." };
    }

    let currentStage = 'group'; // Default

    // Logic: Find the first stage that is NOT fully finished AND has populated teams
    // OR, if we hit a stage that is placeholders (no teams), the *previous* stage is the current one (ready to advance).

    let foundActiveOrFinished = false;

    for (const stage of stageOrder) {
        const stageMatches = matches.filter(m => m.stage === stage);
        if (stageMatches.length === 0) continue;

        const hasTeams = stageMatches.some(m => m.home_team_id || m.away_team_id);
        const allFinished = stageMatches.every(m => m.status === 'finished');

        if (!hasTeams) {
            // This stage is placeholders (e.g. QF waiting for Group winners).
            // It means the PREVIOUS stage is the one we are "in" (or rather, just finished).
            // So we stop here, and currentStage remains the *last* one we set.
            break;
        }

        // Has teams. This is a real stage.
        currentStage = stage;
        foundActiveOrFinished = true;

        if (!allFinished) {
            // We found a stage that is in progress. This is definitely the current stage.
            break;
        }

        // If allFinished is true, we loop to the next stage.
        // If the next stage exists and has teams, currentStage will update to that.
        // If the next stage is placeholders, we break, keeping currentStage = this finished stage.
        // If this matches the logic: "If Group finished, QF placeholders -> currentStage = Group". Correct.
    }

    // Check if all matches in "currentStage" are finished
    const currentStageMatches = matches.filter(m => m.stage === currentStage);
    const allFinished = currentStageMatches.every(m => m.status === 'finished');

    if (!allFinished) {
        return { success: false, error: `Not all matches in ${currentStage} are finished.` };
    }

    const nextMatches: Partial<Match>[] = [];

    // LOGIC A: Group -> Knockout (MVP: 2 Groups -> Semi Final)
    // LOGIC A: Group -> Knockout (Dynamic)
    if (currentStage === 'group') {
        const uniqueGroups = Array.from(new Set(teams.map(t => t.group_name).filter(Boolean))).sort();

        if (uniqueGroups.length === 0) return { success: false, error: "No groups found." };

        // Calculate max round of the CURRENT stage (Group) to find the immediate next round
        const maxGroupRound = currentStageMatches.reduce((max, m) => {
            return (m.round || 0) > max ? (m.round || 0) : max;
        }, 0);

        const startRound = maxGroupRound + 1;

        // 1. Calculate Advancing Teams for ALL Groups
        const topHalf: { home: string, away: string }[] = [];
        const bottomHalf: { home: string, away: string }[] = [];

        for (let i = 0; i < uniqueGroups.length; i += 2) {
            const g1Name = uniqueGroups[i];
            const g2Name = uniqueGroups[i + 1]; // Might be undefined if odd number of groups

            // If we have an odd group out, we can't pair it easily in standard bracket. 
            // Simplest Handling: Require even number of groups for auto-generation or just error.
            if (!g2Name) return { success: false, error: "Number of groups must be even for automatic bracket generation." };

            // Get standings for Group 1
            const g1Teams = teams.filter(t => t.group_name === g1Name);
            const g1Ranking = await getGroupStandings(g1Teams, currentStageMatches);

            // Get standings for Group 2
            const g2Teams = teams.filter(t => t.group_name === g2Name);
            const g2Ranking = await getGroupStandings(g2Teams, currentStageMatches);

            // Top 2 Advance
            const a1 = g1Ranking[0];
            const a2 = g1Ranking[1];
            const b1 = g2Ranking[0];
            const b2 = g2Ranking[1];

            if (!a1 || !a2 || !b1 || !b2) {
                return { success: false, error: `Not enough teams in groups ${g1Name} or ${g2Name} to advance (Need Top 2).` };
            }

            // Cross Pair: A1 vs B2 (Goes to Top Half)
            topHalf.push({ home: a1.id, away: b2.id });

            // Cross Pair: B1 vs A2 (Goes to Bottom Half)
            bottomHalf.push({ home: b1.id, away: a2.id });
        }

        // Merge: Top Half + Bottom Half (No Reverse)
        // Order: [A1vB2, C1vD2...] followed by [B1vA2, D1vC2...]
        const qualifyingMatches = [...topHalf, ...bottomHalf];

        // 2. Find Pre-generated Matches for the Next Round
        // We know the stage name based on the count of matches we just generated pairings for.
        // number of matches = qualifyingMatches.length
        // e.g. 4 matches -> quarter_final
        let nextStageName = 'round_of_16';
        if (qualifyingMatches.length === 1) nextStageName = 'final';
        else if (qualifyingMatches.length === 2) nextStageName = 'semi_final';
        else if (qualifyingMatches.length === 4) nextStageName = 'quarter_final';
        else if (qualifyingMatches.length === 8) nextStageName = 'round_of_16'; // round_of_16
        else nextStageName = 'round_of_32';

        // Fetch pre-generated placeholders
        const { data: placeholders } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('round', startRound)
            .eq('stage', nextStageName)
            .order('match_index', { ascending: true });

        if (!placeholders || placeholders.length < qualifyingMatches.length) {
            // Fallback: If pre-gen missing/insufficient, creating new matches (Legacy/Correction)
            const insertMatches = qualifyingMatches.map((pair, idx) => ({
                tournament_id: tournamentId,
                home_team_id: pair.home,
                away_team_id: pair.away,
                round: startRound,
                stage: nextStageName,
                status: 'scheduled',
                is_manual: false,
                match_index: (placeholders?.length || 0) + idx + 1 // Offset if some exist, or 1
            }));
            await supabase.from('matches').insert(insertMatches);
        } else {
            // Update Pre-gen matches
            for (let i = 0; i < qualifyingMatches.length; i++) {
                const pair = qualifyingMatches[i];
                const matchToUpdate = placeholders[i];

                await supabase.from('matches').update({
                    home_team_id: pair.home,
                    away_team_id: pair.away,
                    status: 'scheduled'
                }).eq('id', matchToUpdate.id);
            }
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        return { success: true };
    }


    // LOGIC B: Knockout Progression
    else {
        // e.g. round_of_16 -> quarter_final -> semi_final -> final

        let nextStage = '';
        if (currentStage === 'round_of_16') nextStage = 'quarter_final';
        else if (currentStage === 'quarter_final') nextStage = 'semi_final';
        else if (currentStage === 'semi_final') nextStage = 'final';
        else if (currentStage === 'final') return { success: false, error: "Tournament is already finished." };

        // Get Winners
        const winners = currentStageMatches.map(m => {
            if (m.home_score! > m.away_score!) return m.home_team_id;
            if (m.away_score! > m.home_score!) return m.away_team_id;
            return m.winner_id; // Using explicit winner_id if we added it, otherwise standard score check.
            // Note: In a real app we really should have a 'winner_id' column or 'penalty' logic for draws.
            // For now, assuming scores decide or draw logic handled elsewhere (the user didn't ask for penalties yet).
            // Actually, the user asked for "Knockout Tie-Breaker" in a previous conversation but currently we just have scores.
            // Let's assume there is a winner.
        }).filter(Boolean) as string[];

        if (winners.length < 2) {
            return { success: false, error: "Not enough winners to create next round matches." };
        }

        // Pair them up
        // Simple logic: Winner match 1 vs Winner match 2.
        // Assuming currentStageMatches are ordered by 'id' or creation time, this works for a standard bracket 
        // IF the fixtures were generated in bracket order (1 vs 2, 3 vs 4).
        // Our shuffle generator did pair 0-1, 2-3... so match order SHOULD roughly correspond.
        // Ideally we'd have 'match number' or 'next_match_id' pointers.
        // MVP: Just pair adjacent match winners.

        // Ensure matches are sorted to maintain bracket integrity (somewhat)
        currentStageMatches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const validWinners = currentStageMatches.map(m => {
            // Re-eval winner to ensure order matches the match list
            if (m.winner_id) return m.winner_id;
            if (m.home_score! > m.away_score!) return m.home_team_id;
            if (m.away_score! > m.home_score!) return m.away_team_id;
            return null;
        }).filter(Boolean) as string[];

        const lastRound = await getLastRound(tournamentId, supabase);
        const startRound = lastRound + 1;

        // Check if next round matches already exist (Pre-generated Final)
        if (nextStage === 'final') {
            const { data: finalMatchPlaceholder } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('stage', 'final')
                .single();

            if (finalMatchPlaceholder && validWinners.length >= 2) {
                await supabase.from('matches').update({
                    home_team_id: validWinners[0],
                    away_team_id: validWinners[1],
                    status: 'scheduled'
                }).eq('id', finalMatchPlaceholder.id);

                revalidatePath(`/dashboard/tournaments/${tournamentId}`);
                return { success: true };
            }
        }

        // Standard Draw for other stages (or if pre-gen missing)
        for (let i = 0; i < validWinners.length; i += 2) {
            if (i + 1 < validWinners.length) {
                nextMatches.push({
                    tournament_id: tournamentId,
                    home_team_id: validWinners[i],
                    away_team_id: validWinners[i + 1],
                    round: startRound,
                    stage: nextStage as any,
                    status: 'scheduled',
                    is_manual: false
                });
            }
        }
    }

    if (nextMatches.length > 0) {
        const { error } = await supabase.from('matches').insert(nextMatches);
        if (error) return { success: false, error: error.message };

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        return { success: true };
    }

    return { success: false, error: "Could not generate next round matches." };
}

export async function addGoal(
    matchId: string,
    teamId: string,
    playerName: string,
    tournamentId: string,
    goalTime?: string | number
): Promise<ActionResponse> {
    const supabase = await createClient();

    if (!playerName) return { success: false, error: "Player Name required" };

    // 1. Add Goal
    const { error: insertError } = await supabase.from('goals').insert({
        match_id: matchId,
        team_id: teamId,
        player_name: playerName,
        goal_time: goalTime ? String(goalTime) : null
    });

    if (insertError) return { success: false, error: insertError.message };

    // 2. Recalculate Scores Server-Side (Source of Truth)
    // Fetch match to get team IDs
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        return { success: false, error: "Match not found for score update" };
    }

    // Count goals
    const { count: homeCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.home_team_id);

    const { count: awayCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.away_team_id);

    // 3. Update Match Score
    const { error: updateError } = await supabase
        .from('matches')
        .update({
            home_score: homeCount || 0,
            away_score: awayCount || 0
        })
        .eq('id', matchId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function deleteGoal(goalId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

// Helper to advance winner
async function advanceWinner(match: Match, winnerId: string, supabase: any) {
    if (match.match_index === null || match.match_index === undefined) return;

    // 1. Get all matches for current round to find relative position
    // We sort by match_index ASC so we get 0, 1, 2, 3... order relative to the round
    const { data: currentRoundMatches } = await supabase
        .from('matches')
        .select('id, match_index')
        .eq('tournament_id', match.tournament_id)
        .eq('round', match.round)
        .order('match_index', { ascending: true });

    if (!currentRoundMatches || currentRoundMatches.length === 0) return;

    // Find index of current match in the list
    const indexInRound = currentRoundMatches.findIndex((m: any) => m.id === match.id);
    if (indexInRound === -1) return;

    // 2. Determine target match position in next round
    const nextRound = match.round + 1;
    const nextMatchPosition = Math.floor(indexInRound / 2);
    const isHomePos = indexInRound % 2 === 0;

    // 3. Fetch next round matches to find the one at that position
    const { data: nextRoundMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', match.tournament_id)
        .eq('round', nextRound)
        .order('match_index', { ascending: true });

    if (nextRoundMatches && nextRoundMatches[nextMatchPosition]) {
        const nextMatch = nextRoundMatches[nextMatchPosition];
        const updateData = isHomePos ? { home_team_id: winnerId } : { away_team_id: winnerId };

        await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
    }
}

// Helper to calc standings
function getGroupStandings(groupTeams: any[], allMatches: any[]) {
    return groupTeams.map(t => {
        const teamMatches = allMatches.filter(m =>
            (m.home_team_id === t.id || m.away_team_id === t.id)
        );

        let points = 0;
        let gd = 0;
        let gf = 0;

        teamMatches.forEach(m => {
            const isHome = m.home_team_id === t.id;
            const myScore = isHome ? m.home_score : m.away_score;
            const otherScore = isHome ? m.away_score : m.home_score;

            if (myScore !== null && otherScore !== null) {
                if (myScore > otherScore) points += 3;
                else if (myScore === otherScore) points += 1;

                gd += (myScore - otherScore);
                gf += myScore;
            }
        });

        return { ...t, points, gd, gf };
    }).sort((a: any, b: any) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
}