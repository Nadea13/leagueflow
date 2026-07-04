"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, PenaltyShot } from "@/types/index";

async function syncPenaltyScore(matchId: string) {
    const supabase = await createClient();

    // 1. Get the match to know home/away teams
    const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, tournament_id")
        .eq("id", matchId)
        .single();

    if (matchError || !matchData) return;

    // 2. Get all penalty shots from match_events
    const { data: eventsData, error: eventsError } = await supabase
        .from("match_events")
        .select("team_id, extra_info")
        .eq("match_id", matchId)
        .eq("event_type", "penalty_shot");

    if (eventsError) return;

    // 3. Count
    const homeShots = eventsData.filter(e => e.team_id === matchData.home_team_id);
    const awayShots = eventsData.filter(e => e.team_id === matchData.away_team_id);
    
    const homeScore = homeShots.filter(e => {
        const extra = (e.extra_info || {}) as Record<string, unknown>;
        return extra.scored === true;
    }).length;

    const awayScore = awayShots.filter(e => {
        const extra = (e.extra_info || {}) as Record<string, unknown>;
        return extra.scored === true;
    }).length;

    // Determine mathematically decided winner
    let winnerId: string | null = null;
    const hLen = homeShots.length;
    const aLen = awayShots.length;
    const maxShots = Math.max(hLen, aLen);

    if (maxShots > 0) {
        if (maxShots <= 5) {
            const hRemaining = 5 - hLen;
            const aRemaining = 5 - aLen;
            if (homeScore > awayScore + aRemaining) {
                winnerId = matchData.home_team_id;
            } else if (awayScore > homeScore + hRemaining) {
                winnerId = matchData.away_team_id;
            }
        } else {
            // Sudden death: must have equal shots in the round to decide a winner
            if (hLen === aLen) {
                if (homeScore > awayScore) {
                    winnerId = matchData.home_team_id;
                } else if (awayScore > homeScore) {
                    winnerId = matchData.away_team_id;
                }
            }
        }
    }

    // 4. Update match
    const updatePayload: Record<string, unknown> = {
        penalty_home_score: homeScore,
        penalty_away_score: awayScore
    };

    if (winnerId) {
        updatePayload.winner_id = winnerId;
        updatePayload.winner_to_node_id = winnerId;
    } else if (maxShots === 0) {
        // If cleared/no shots, remove shootout winner info
        updatePayload.winner_id = null;
        updatePayload.winner_to_node_id = null;
    }

    await supabase
        .from("matches")
        .update(updatePayload)
        .eq("id", matchId);

    revalidatePath(`/dashboard/tournaments/${matchData.tournament_id}`);
}

export async function getPenaltyShootout(matchId: string): Promise<ActionResponse<PenaltyShot[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("match_events")
        .select(`
            *,
            players (display_name)
        `)
        .eq("match_id", matchId)
        .eq("event_type", "penalty_shot")
        .order("created_at");

    if (error) {
        return { success: false, error: error.message };
    }

    const shots = (data || []).map((event: Record<string, unknown> & { players?: { display_name: string } | null }) => {
        const extra = (event.extra_info || {}) as Record<string, unknown>;
        return {
            id: String(event.id),
            match_id: String(event.match_id),
            team_id: String(event.team_id),
            player_id: event.player_id ? String(event.player_id) : null,
            round: Number(extra.round) || 1,
            scored: !!extra.scored,
            created_at: String(event.created_at),
            player: event.players ? { name: event.players.display_name } : null,
        };
    });

    return { success: true, data: shots as PenaltyShot[] };
}

export async function addPenaltyShot(
    matchId: string,
    teamId: string,
    round: number,
    scored: boolean,
    playerId?: string | null
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("match_events")
        .insert({
            match_id: matchId,
            team_id: teamId,
            player_id: playerId || null,
            event_type: 'penalty_shot',
            minute: 120,
            extra_info: {
                scored,
                round
            }
        });

    if (error) {
        return { success: false, error: error.message };
    }

    await syncPenaltyScore(matchId);

    return { success: true };
}

export async function deletePenaltyShot(shotId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // Need matchId to sync
    const { data: eventData } = await supabase
        .from("match_events")
        .select("match_id")
        .eq("id", shotId)
        .single();

    const { error } = await supabase
        .from("match_events")
        .delete()
        .eq("id", shotId);

    if (error) {
        return { success: false, error: error.message };
    }

    if (eventData?.match_id) {
        await syncPenaltyScore(eventData.match_id);
    }

    return { success: true };
}

export async function clearPenaltyShootout(matchId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("match_events")
        .delete()
        .eq("match_id", matchId)
        .eq("event_type", "penalty_shot");

    if (error) {
        return { success: false, error: error.message };
    }

    await syncPenaltyScore(matchId);

    return { success: true };
}
