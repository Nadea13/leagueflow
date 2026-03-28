"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, PenaltyShot, Match } from "@/types/index";

async function syncPenaltyScore(matchId: string) {
    const supabase = await createClient();

    // 1. Get the match to know home/away teams
    const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, tournament_id")
        .eq("id", matchId)
        .single();

    if (matchError || !matchData) return;

    // 2. Get all successful shots for this match
    const { data: shotsData, error: shotsError } = await supabase
        .from("penalty_shootouts")
        .select("team_id, scored")
        .eq("match_id", matchId)
        .eq("scored", true);

    if (shotsError) return;

    // 3. Count
    const homeScore = shotsData.filter(s => s.team_id === matchData.home_team_id).length;
    const awayScore = shotsData.filter(s => s.team_id === matchData.away_team_id).length;

    // 4. Update match
    await supabase
        .from("matches")
        .update({
            penalty_home_score: homeScore,
            penalty_away_score: awayScore
        })
        .eq("id", matchId);

    revalidatePath(`/organizer/tournaments/${matchData.tournament_id}`);
}

export async function getPenaltyShootout(matchId: string): Promise<ActionResponse<PenaltyShot[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("penalty_shootouts")
        .select(`
            *,
            players (name)
        `)
        .eq("match_id", matchId)
        .order("round")
        .order("created_at");

    if (error) {
        return { success: false, error: error.message };
    }

    const shots = (data || []).map((shot: any) => ({
        ...shot,
        player: shot.players ? { name: shot.players.name } : null,
    }));

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
        .from("penalty_shootouts")
        .insert({
            match_id: matchId,
            team_id: teamId,
            player_id: playerId || null,
            round,
            scored,
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
    const { data: shotData } = await supabase
        .from("penalty_shootouts")
        .select("match_id")
        .eq("id", shotId)
        .single();

    const { error } = await supabase
        .from("penalty_shootouts")
        .delete()
        .eq("id", shotId);

    if (error) {
        return { success: false, error: error.message };
    }

    if (shotData?.match_id) {
        await syncPenaltyScore(shotData.match_id);
    }

    return { success: true };
}

export async function clearPenaltyShootout(matchId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("penalty_shootouts")
        .delete()
        .eq("match_id", matchId);

    if (error) {
        return { success: false, error: error.message };
    }

    await syncPenaltyScore(matchId);

    return { success: true };
}
