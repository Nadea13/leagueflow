"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, PenaltyShot } from "@/types/index";

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

    return { success: true };
}

export async function deletePenaltyShot(shotId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("penalty_shootouts")
        .delete()
        .eq("id", shotId);

    if (error) {
        return { success: false, error: error.message };
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

    return { success: true };
}
