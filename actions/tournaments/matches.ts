"use server";

import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ActionResponse, Match, BracketCanvasData } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { validateTournamentAccess } from "@/lib/security";

const getScoreTotal = (scoreObj: unknown): number => {
    if (!scoreObj) return 0;
    if (typeof scoreObj === 'object' && scoreObj !== null) {
        return (scoreObj as { total?: number }).total || 0;
    }
    const val = Number(scoreObj);
    return isNaN(val) ? 0 : val;
};

async function getLastRound(tournamentCategoryId: string, supabase: SupabaseClient): Promise<number> {
    const { data } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_category_id', tournamentCategoryId)
        .order('round', { ascending: false })
        .limit(1)
        .single();
    return data?.round || 0;
}

export async function updateMatchScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Update Scores & Fetch Updated Record
    const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({
            home_score: { total: homeScore },
            away_score: { total: awayScore },
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

        const homeTotal = getScoreTotal(updatedMatch.home_score);
        const awayTotal = getScoreTotal(updatedMatch.away_score);

        if (homeTotal !== awayTotal) {
            winnerId = homeTotal > awayTotal ? updatedMatch.home_team_id : updatedMatch.away_team_id;
        }

        if (winnerId) {
            // Update status (no winner_id column in matches)
            const { error: winnerError } = await supabase
                .from('matches')
                .update({ status: 'finished' })
                .eq('id', matchId);

            if (winnerError) {
                console.error("Error saving winner status:", winnerError);
            } else {
                // Propagate to next round
                await advanceWinner(updatedMatch, winnerId, supabase);
            }
        }
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('UPDATE_MATCH_SCORE', 'match', matchId, { home_score: homeScore, away_score: awayScore });
    return { success: true };
}

export async function createMatch(
    tournamentId: string,
    homeTeamId: string,
    awayTeamId: string,
    round: number,
    stage: string = 'league',
    match_date?: string,
    match_time?: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) return { success: false, error: "No tournament category setup found" };

    let scheduled_at: string | null = null;
    if (match_date) {
        const timePart = match_time || "00:00:00";
        scheduled_at = new Date(`${match_date}T${timePart}`).toISOString();
    }

    let matchStage: 'group' | 'knockout' | 'final' = 'group';
    if (stage === 'league' || stage === 'group') {
        matchStage = 'group';
    } else if (stage === 'final' || stage === 'semi_final' || stage === 'quarter_final' || stage === 'round_of_16' || stage === 'round_of_32' || stage === 'round_of_64') {
        matchStage = stage === 'final' ? 'final' : 'knockout';
    } else {
        matchStage = 'knockout';
    }

    const { error } = await supabase.from('matches').insert({
        tournament_category_id: category.id,
        home_team_id: homeTeamId || null,
        away_team_id: awayTeamId || null,
        round,
        stage: matchStage,
        is_manual: true,
        status: 'scheduled',
        home_score: { total: 0 },
        away_score: { total: 0 },
        scheduled_at
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatch(
    matchId: string,
    data: {
        home_team_id?: string | null;
        away_team_id?: string | null;
        home_score?: number | null;
        away_score?: number | null;
        penalty_home_score?: number | null;
        penalty_away_score?: number | null;
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
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: currentMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

    const updateData: Record<string, unknown> = {};
    if (data.home_team_id !== undefined) updateData.home_team_id = data.home_team_id;
    if (data.away_team_id !== undefined) updateData.away_team_id = data.away_team_id;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.timer_status !== undefined) updateData.timer_status = data.timer_status;
    if (data.elapsed_before_pause !== undefined) updateData.elapsed_before_pause = data.elapsed_before_pause;
    if (data.current_minute !== undefined) {
        const minVal = Number(data.current_minute);
        updateData.current_minute = isNaN(minVal) ? null : minVal;
    }

    if (data.home_score !== undefined && data.home_score !== null) {
        updateData.home_score = { total: data.home_score };
    }
    if (data.away_score !== undefined && data.away_score !== null) {
        updateData.away_score = { total: data.away_score };
    }

    if (data.match_date !== undefined || data.match_time !== undefined) {
        const datePart = data.match_date !== undefined ? data.match_date : (currentMatch?.scheduled_at ? currentMatch.scheduled_at.split('T')[0] : null);
        const timePart = data.match_time !== undefined ? data.match_time : (currentMatch?.scheduled_at ? currentMatch.scheduled_at.split('T')[1]?.substring(0, 5) : null);
        if (datePart) {
            const t = timePart || "00:00";
            updateData.scheduled_at = new Date(`${datePart}T${t}:00`).toISOString();
        } else {
            updateData.scheduled_at = null;
        }
    }

    const { data: updatedMatch, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)
        .select('*')
        .single();

    if (error) {
        console.error("Error updating match:", error);
        return { success: false, error: error.message };
    }

    // Auto-Advance Winner & Propagate Standings
    if (updatedMatch && updatedMatch.status === 'finished') {
        if (updatedMatch.stage === 'group') {
            await propagateGroupStandings(updatedMatch.tournament_category_id, supabase);
        } else {
            await propagateKnockoutResults(updatedMatch, supabase);
        }
    }

    // Auto-Activate Tournament
    if (data.status === 'live') {
        const { data: tournament } = await supabase
            .from('tournaments')
            .select('status')
            .eq('id', tournamentId)
            .single();

        if (tournament && tournament.status !== 'ongoing') {
            const { error: activateError } = await supabase
                .from('tournaments')
                .update({ status: 'ongoing' })
                .eq('id', tournamentId);
                
            if (activateError) {
                console.error("Error activating tournament:", activateError);
            }
        }
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('UPDATE_MATCH', 'match', matchId, { tournament_id: tournamentId, ...data });
    return { success: true };
}

export async function deleteMatch(matchId: string, tournamentId: string): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function advanceStage(tournamentId: string): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) return { success: false, error: "No category found." };
    const tournamentCategoryId = category.id;

    // 1. Fetch all matches and teams
    const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_category_id', tournamentCategoryId);

    const { data: teams } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_category_id', tournamentCategoryId)
        .is("deleted_at", null);

    if (!matches || matches.length === 0) {
        return { success: false, error: "No matches found." };
    }

    if (!teams) {
        return { success: false, error: "No teams found." };
    }

    const stageOrder = ['group', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];

    if (matches.some(m => m.stage === 'league')) {
        return { success: false, error: "League format does not support automatic stage advancement." };
    }

    let currentStage = 'group';

    for (const stage of stageOrder) {
        const stageMatches = matches.filter(m => m.stage === stage);
        if (stageMatches.length === 0) continue;

        const hasTeams = stageMatches.some(m => m.home_team_id || m.away_team_id);
        const allFinished = stageMatches.every(m => m.status === 'finished');

        if (!hasTeams) {
            break;
        }

        currentStage = stage;

        if (!allFinished) {
            break;
        }
    }

    const currentStageMatches = matches.filter(m => m.stage === currentStage);
    const allFinished = currentStageMatches.every(m => m.status === 'finished');

    if (!allFinished) {
        return { success: false, error: `Not all matches in ${currentStage} are finished.` };
    }

    const nextMatches: Partial<Match>[] = [];

    // Since group_name is removed, we only run knockout stage progression
    if (currentStage === 'group') {
        return { success: false, error: "Group advancement is not supported with the current schema." };
    } else {
        let nextStage = '';
        if (currentStage === 'round_of_16') nextStage = 'quarter_final';
        else if (currentStage === 'quarter_final') nextStage = 'semi_final';
        else if (currentStage === 'semi_final') nextStage = 'final';
        else if (currentStage === 'final') return { success: false, error: "Tournament is already finished." };

        currentStageMatches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const validWinners = currentStageMatches.map(m => {
            const homeTotal = getScoreTotal(m.home_score);
            const awayTotal = getScoreTotal(m.away_score);
            if (homeTotal > awayTotal) return m.home_team_id;
            if (awayTotal > homeTotal) return m.away_team_id;
            return null;
        }).filter(Boolean) as string[];

        if (validWinners.length < 2) {
            return { success: false, error: "Not enough winners to create next round matches." };
        }

        const lastRound = await getLastRound(tournamentCategoryId, supabase);
        const startRound = lastRound + 1;

        if (nextStage === 'final') {
            const { data: finalMatchPlaceholder } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_category_id', tournamentCategoryId)
                .eq('stage', 'final')
                .single();

            if (finalMatchPlaceholder && validWinners.length >= 2) {
                await supabase.from('matches').update({
                    home_team_id: validWinners[0],
                    away_team_id: validWinners[1],
                    status: 'scheduled'
                }).eq('id', finalMatchPlaceholder.id);

                revalidatePath(`/organizer/tournaments/${tournamentId}`);
                return { success: true };
            }
        }

        for (let i = 0; i < validWinners.length; i += 2) {
            if (i + 1 < validWinners.length) {
                nextMatches.push({
                    tournament_category_id: tournamentCategoryId,
                    home_team_id: validWinners[i],
                    away_team_id: validWinners[i + 1],
                    round: startRound,
                    stage: nextStage as Match['stage'],
                    status: 'scheduled',
                    is_manual: false,
                    home_score: { total: 0 },
                    away_score: { total: 0 }
                });
            }
        }
    }

    if (nextMatches.length > 0) {
        const { error } = await supabase.from('matches').insert(nextMatches);
        if (error) return { success: false, error: error.message };

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
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
): Promise<ActionResponse<{ id: string }>> {
    const supabase = await createClient();

    if (!playerName) return { success: false, error: "Player Name required" };

    const { data: newEvent, error: insertError } = await supabase.from('match_events').insert({
        match_id: matchId,
        team_id: teamId,
        player_id: null,
        event_type: 'goal',
        minute: goalTime ? Number(goalTime) : null,
        extra_info: { player_name: playerName }
    }).select('id').single();

    if (insertError) return { success: false, error: insertError.message };

    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        return { success: false, error: "Match not found for score update" };
    }

    const { count: homeCount } = await supabase
        .from('match_events')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.home_team_id)
        .eq('event_type', 'goal')
        .is('deleted_at', null);

    const { count: awayCount } = await supabase
        .from('match_events')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.away_team_id)
        .eq('event_type', 'goal')
        .is('deleted_at', null);

    const { error: updateError } = await supabase
        .from('matches')
        .update({
            home_score: { total: homeCount || 0 },
            away_score: { total: awayCount || 0 }
        })
        .eq('id', matchId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, data: { id: newEvent?.id || '' } };
}

export async function deleteGoal(goalId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { data: event } = await supabase
        .from('match_events')
        .select('match_id')
        .eq('id', goalId)
        .single();
    
    if (!event) return { success: false, error: "Goal event not found" };
    const matchId = event.match_id;

    const { error: deleteError } = await supabase.from('match_events').delete().eq('id', goalId);
    if (deleteError) return { success: false, error: deleteError.message };

    const { data: match } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('id', matchId)
        .single();

    if (match) {
        const { count: homeCount } = await supabase
            .from('match_events')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .eq('team_id', match.home_team_id)
            .eq('event_type', 'goal')
            .is('deleted_at', null);

        const { count: awayCount } = await supabase
            .from('match_events')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .eq('team_id', match.away_team_id)
            .eq('event_type', 'goal')
            .is('deleted_at', null);

        await supabase
            .from('matches')
            .update({
                home_score: { total: homeCount || 0 },
                away_score: { total: awayCount || 0 }
            })
            .eq('id', matchId);
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

async function advanceWinner(match: Match, winnerId: string, supabase: SupabaseClient) {
    if (match.match_index === null || match.match_index === undefined) return;

    const { data: currentRoundMatches } = await supabase
        .from('matches')
        .select('id, match_index')
        .eq('tournament_category_id', match.tournament_category_id)
        .eq('round', match.round)
        .order('match_index', { ascending: true });

    if (!currentRoundMatches || currentRoundMatches.length === 0) return;

    const indexInRound = currentRoundMatches.findIndex((m) => m.id === match.id);
    if (indexInRound === -1) return;

    const nextRound = match.round + 1;
    const nextMatchPosition = Math.floor(indexInRound / 2);
    const isHomePos = indexInRound % 2 === 0;

    const { data: nextRoundMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_category_id', match.tournament_category_id)
        .eq('round', nextRound)
        .order('match_index', { ascending: true });

    if (nextRoundMatches && nextRoundMatches[nextMatchPosition]) {
        const nextMatch = nextRoundMatches[nextMatchPosition];
        const updateData = isHomePos ? { home_team_id: winnerId } : { away_team_id: winnerId };

        await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
    }
}

export async function propagateGroupStandings(categoryId: string, supabase: SupabaseClient) {
    try {
        // 1. Fetch category canvas data
        const { data: category } = await supabase
            .from('tournament_categories')
            .select('canvas_data')
            .eq('id', categoryId)
            .single();
        
        const canvasData = category?.canvas_data as BracketCanvasData | null;
        if (!canvasData || !canvasData.nodes || !canvasData.edges) return;

        // 2. Fetch all active matches and tournament teams
        const [matchesRes, teamsRes] = await Promise.all([
            supabase.from('matches').select('*').eq('tournament_category_id', categoryId).is('deleted_at', null),
            supabase.from('tournament_teams').select('*, team:teams(id, name)').eq('tournament_category_id', categoryId).is('deleted_at', null)
        ]);

        if (matchesRes.error || teamsRes.error) return;

        const dbMatches = matchesRes.data || [];
        const dbTeams = teamsRes.data || [];

        const teams = dbTeams.map((tt) => ({
            id: tt.team_id,
            name: (tt.team as unknown as { name: string } | null)?.name || ""
        }));

        const teamIdToName = new Map<string, string>();
        dbTeams.forEach((t) => {
            const name = (t.team as unknown as { name: string } | null)?.name || (t as unknown as { name: string }).name;
            if (name && t.team_id) {
                teamIdToName.set(t.team_id, name);
            }
        });

        // Helper to calculate standings of a list of teams
        const getGroupRankings = (groupTeamNames: string[]): string[] => {
            const statsMap: Record<string, { name: string; gf: number; ga: number; gd: number; pts: number }> = {};
            groupTeamNames.forEach((name, index) => {
                const key = name === "TBD" ? `TBD-${index}` : name;
                statsMap[key] = { name, gf: 0, ga: 0, gd: 0, pts: 0 };
            });

            const groupTeamIds = groupTeamNames.map(name => teams.find(t => t.name === name)?.id).filter(Boolean);
            const groupMatches = dbMatches.filter(m => 
                m.stage === 'group' &&
                m.home_team_id && m.away_team_id && 
                groupTeamIds.includes(m.home_team_id) && 
                groupTeamIds.includes(m.away_team_id)
            );

            // Check if all group matches are finished
            const isGroupFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
            if (!isGroupFinished) return [];

            groupMatches.forEach(m => {
                const homeName = m.home_team_id ? teamIdToName.get(m.home_team_id) : m.placeholder_home || m.placeholder_a;
                const awayName = m.away_team_id ? teamIdToName.get(m.away_team_id) : m.placeholder_away || m.placeholder_b;
                if (!homeName || !awayName) return;

                const h = statsMap[homeName];
                const a = statsMap[awayName];
                if (h && a) {
                    const homeTotal = typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: unknown }).total) || 0 : Number(m.home_score) || 0;
                    const awayTotal = typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: unknown }).total) || 0 : Number(m.away_score) || 0;

                    h.gf += homeTotal; h.ga += awayTotal;
                    a.gf += awayTotal; a.ga += homeTotal;

                    if (homeTotal > awayTotal) {
                        h.pts += 3;
                    } else if (homeTotal < awayTotal) {
                        a.pts += 3;
                    } else {
                        h.pts += 1;
                        a.pts += 1;
                    }
                }
            });

            const sorted = Object.values(statsMap).map(s => ({
                ...s,
                gd: s.gf - s.ga
            })).sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.gd !== a.gd) return b.gd - a.gd;
                return b.gf - a.gf;
            });

            return sorted.map(s => s.name);
        };

        const currentRankings: Record<string, string[]> = {};
        for (const node of canvasData.nodes) {
            if (node.type === 'standingNode' || node.type === 'groupNode') {
                const nodeTeams = (node.data as { teams?: string[]; rankings?: string[] }).teams || (node.data as { teams?: string[]; rankings?: string[] }).rankings || [];
                if (nodeTeams.length > 0) {
                    const rankings = getGroupRankings(nodeTeams);
                    if (rankings.length > 0) {
                        currentRankings[node.id] = rankings;
                        node.data = {
                            ...node.data,
                            rankings
                        };
                    }
                }
            }
        }

        const resolveTeamId = (nodeId: string, slot: 'a' | 'b', matchIndex: number, rankingsRecord: Record<string, string[]>): string | null => {
            const handleId = `slot-${slot}-${matchIndex}`;
            const edge = canvasData.edges.find(e => e.target === nodeId && e.targetHandle === handleId);
            if (!edge) return null;

            const sourceNode = canvasData.nodes.find(n => n.id === edge.source);
            if (!sourceNode) return null;

            if (sourceNode.type === 'teamListNode') {
                const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                if (teamIdMatch) {
                    const teamId = teamIdMatch[1];
                    const team = teams.find(t => String(t.id) === String(teamId));
                    return team?.id || null;
                }
            }

            if (sourceNode.type === 'standingNode' || sourceNode.type === 'groupNode') {
                const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
                if (rankMatch) {
                    const rankIndex = parseInt(rankMatch[1], 10);
                    const rankings = rankingsRecord[sourceNode.id] || (sourceNode.data as { rankings?: string[] }).rankings || [];
                    const teamName = rankings[rankIndex];
                    if (!teamName || teamName === "TBD") return null;

                    const team = teams.find(t => t.name === teamName);
                    return team?.id || null;
                }
            }

            if (sourceNode.type === 'matchNode') {
                const winnerMatch = edge.sourceHandle?.match(/winner-(\d+)/);
                if (winnerMatch) {
                    const winnerIndex = parseInt(winnerMatch[1], 10);
                    const sourceMatches = (sourceNode.data as { matches?: { dbId?: string; matchId?: string }[] }).matches || [];
                    const sourceMatch = sourceMatches[winnerIndex];
                    if (sourceMatch && (sourceMatch.dbId || sourceMatch.matchId)) {
                        const matchId = sourceMatch.dbId || sourceMatch.matchId;
                        const dbM = dbMatches.find(m => m.id === matchId);
                        if (dbM && dbM.status === 'finished') {
                            const homeTotal = typeof dbM.home_score === 'object' && dbM.home_score !== null && 'total' in dbM.home_score ? Number((dbM.home_score as { total?: unknown }).total) || 0 : Number(dbM.home_score) || 0;
                            const awayTotal = typeof dbM.away_score === 'object' && dbM.away_score !== null && 'total' in dbM.away_score ? Number((dbM.away_score as { total?: unknown }).total) || 0 : Number(dbM.away_score) || 0;
                            if (homeTotal > awayTotal) return dbM.home_team_id;
                            if (awayTotal > homeTotal) return dbM.away_team_id;
                        }
                    }
                }
                const loserMatch = edge.sourceHandle?.match(/loser-(\d+)/);
                if (loserMatch) {
                    const loserIndex = parseInt(loserMatch[1], 10);
                    const sourceMatches = (sourceNode.data as { matches?: { dbId?: string; matchId?: string }[] }).matches || [];
                    const sourceMatch = sourceMatches[loserIndex];
                    if (sourceMatch && (sourceMatch.dbId || sourceMatch.matchId)) {
                        const matchId = sourceMatch.dbId || sourceMatch.matchId;
                        const dbM = dbMatches.find(m => m.id === matchId);
                        if (dbM && dbM.status === 'finished') {
                            const homeTotal = typeof dbM.home_score === 'object' && dbM.home_score !== null && 'total' in dbM.home_score ? Number((dbM.home_score as { total?: unknown }).total) || 0 : Number(dbM.home_score) || 0;
                            const awayTotal = typeof dbM.away_score === 'object' && dbM.away_score !== null && 'total' in dbM.away_score ? Number((dbM.away_score as { total?: unknown }).total) || 0 : Number(dbM.away_score) || 0;
                            if (homeTotal < awayTotal) return dbM.home_team_id;
                            if (awayTotal < homeTotal) return dbM.away_team_id;
                        }
                    }
                }
            }

            return null;
        };

        // Update database matches based on resolved IDs
        for (const node of canvasData.nodes) {
            if (node.type === 'matchNode') {
                const matches = (node.data as { matches?: { dbId?: string; matchId?: string }[] }).matches || [];
                for (let i = 0; i < matches.length; i++) {
                    const matchItem = matches[i];
                    if (matchItem.dbId || matchItem.matchId) {
                        const matchId = matchItem.dbId || matchItem.matchId;
                        const resolvedHomeId = resolveTeamId(node.id, 'a', i, currentRankings);
                        const resolvedAwayId = resolveTeamId(node.id, 'b', i, currentRankings);

                        if (resolvedHomeId || resolvedAwayId) {
                            const updateData: Record<string, string> = {};
                            if (resolvedHomeId) updateData.home_team_id = resolvedHomeId;
                            if (resolvedAwayId) updateData.away_team_id = resolvedAwayId;

                            await supabase
                                .from('matches')
                                .update(updateData)
                                .eq('id', matchId);
                        }
                    }
                }
            }
        }

        // Save canvas with rankings
        await supabase
            .from('tournament_categories')
            .update({ canvas_data: canvasData })
            .eq('id', categoryId);

    } catch (err) {
        console.error("Error propagating group standings:", err);
    }
}

export async function propagateKnockoutResults(match: Match, supabase: SupabaseClient) {
    try {
        if (!match.tournament_category_id) return;

        // 1. Fetch category canvas data
        const { data: category } = await supabase
            .from('tournament_categories')
            .select('canvas_data')
            .eq('id', match.tournament_category_id)
            .single();

        const canvasData = category?.canvas_data as BracketCanvasData | null;
        if (!canvasData || !canvasData.nodes || !canvasData.edges) {
            // Fallback to old round/index math if canvas doesn't exist
            let winnerId = null;
            const homeTotal = getScoreTotal(match.home_score);
            const awayTotal = getScoreTotal(match.away_score);
            if (homeTotal !== awayTotal) {
                winnerId = homeTotal > awayTotal ? match.home_team_id : match.away_team_id;
            }
            if (winnerId) {
                await advanceWinner(match, winnerId, supabase);
            }
            return;
        }

        // 2. Find the source node representing this match
        let sourceNodeId = "";
        let matchIndexInNode = -1;

        for (const n of canvasData.nodes) {
            if (n.type === 'matchNode') {
                const nodeMatches = (n.data as { matches?: { dbId?: string; matchId?: string }[] }).matches || [];
                const idx = nodeMatches.findIndex((m) => m.dbId === match.id || m.matchId === match.id);
                if (idx !== -1) {
                    sourceNodeId = n.id;
                    matchIndexInNode = idx;
                    break;
                }
            }
        }

        if (!sourceNodeId || matchIndexInNode === -1) {
            // Fallback
            let winnerId = null;
            const homeTotal = getScoreTotal(match.home_score);
            const awayTotal = getScoreTotal(match.away_score);
            if (homeTotal !== awayTotal) {
                winnerId = homeTotal > awayTotal ? match.home_team_id : match.away_team_id;
            }
            if (winnerId) {
                await advanceWinner(match, winnerId, supabase);
            }
            return;
        }

        // 3. Calculate winner and loser IDs
        const homeTotal = getScoreTotal(match.home_score);
        const awayTotal = getScoreTotal(match.away_score);
        if (homeTotal === awayTotal && !match.winner_id) return; // No clear result yet

        const winnerId = match.winner_id || (homeTotal > awayTotal ? match.home_team_id : match.away_team_id);
        const loserId = winnerId === match.home_team_id ? match.away_team_id : match.home_team_id;

        // 4. Trace winner connection
        const winnerHandleId = `winner-${matchIndexInNode}`;
        const winnerEdge = canvasData.edges.find(e => e.source === sourceNodeId && e.sourceHandle === winnerHandleId);
        
        if (winnerEdge && winnerId) {
            const targetNode = canvasData.nodes.find(n => n.id === winnerEdge.target);
            const targetHandle = winnerEdge.targetHandle || "";
            const targetMatchIndexMatch = targetHandle.match(/slot-(a|b)-(\d+)/);
            
            if (targetNode && targetMatchIndexMatch) {
                const slot = targetMatchIndexMatch[1];
                const targetMatchIndex = parseInt(targetMatchIndexMatch[2], 10);
                const targetMatches = (targetNode.data as { matches?: { dbId?: string; matchId?: string }[] }).matches || [];
                const targetMatchItem = targetMatches[targetMatchIndex];
                
                if (targetMatchItem && (targetMatchItem.dbId || targetMatchItem.matchId)) {
                    const targetMatchId = targetMatchItem.dbId || targetMatchItem.matchId;
                    const updateData = slot === 'a' ? { home_team_id: winnerId } : { away_team_id: winnerId };
                    await supabase.from('matches').update(updateData).eq('id', targetMatchId);
                }
            }
        }

        // 5. Trace loser connection
        const loserHandleId = `loser-${matchIndexInNode}`;
        const loserEdge = canvasData.edges.find(e => e.source === sourceNodeId && e.sourceHandle === loserHandleId);
        
        if (loserEdge && loserId) {
            const targetNode = canvasData.nodes.find(n => n.id === loserEdge.target);
            const targetHandle = loserEdge.targetHandle || "";
            const targetMatchIndexMatch = targetHandle.match(/slot-(a|b)-(\d+)/);
            
            if (targetNode && targetMatchIndexMatch) {
                const slot = targetMatchIndexMatch[1];
                const targetMatchIndex = parseInt(targetMatchIndexMatch[2], 10);
                const targetMatches = (targetNode.data as { matches?: { dbId?: string; matchId?: string }[] }).matches || [];
                const targetMatchItem = targetMatches[targetMatchIndex];
                
                if (targetMatchItem && (targetMatchItem.dbId || targetMatchItem.matchId)) {
                    const targetMatchId = targetMatchItem.dbId || targetMatchItem.matchId;
                    const updateData = slot === 'a' ? { home_team_id: loserId } : { away_team_id: loserId };
                    await supabase.from('matches').update(updateData).eq('id', targetMatchId);
                }
            }
        }

    } catch (err) {
        console.error("Error in propagateKnockoutResults:", err);
    }
}
