"use server";

import { createClient } from "@/utils/supabase/server";
import { ActionResponse, GlobalPlayer } from "@/types/index";

export async function searchGlobalPlayers(query: string): Promise<ActionResponse<GlobalPlayer[]>> {
    if (!query || query.length < 2) {
        return { success: true, data: [] };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("global_players")
        .select("*")
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(10);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data as GlobalPlayer[] };
}

export async function createGlobalPlayer(
    name: string,
    photoUrl?: string | null,
    dateOfBirth?: string | null
): Promise<ActionResponse<GlobalPlayer>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("global_players")
        .insert({
            name,
            photo_url: photoUrl || null,
            date_of_birth: dateOfBirth || null,
            created_by: user?.id || null,
        })
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data as GlobalPlayer };
}

export async function linkPlayerToGlobal(
    playerId: string,
    globalPlayerId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("players")
        .update({ global_player_id: globalPlayerId })
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function unlinkPlayerFromGlobal(playerId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("players")
        .update({ global_player_id: null })
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function getGlobalPlayer(globalPlayerId: string): Promise<ActionResponse<GlobalPlayer>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("global_players")
        .select("*")
        .eq("id", globalPlayerId)
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data as GlobalPlayer };
}

export async function getPlayerTournamentHistory(globalPlayerId: string): Promise<ActionResponse<any[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("players")
        .select(`
            id,
            name,
            number,
            position,
            team_id,
            teams (
                id,
                name,
                logo_url,
                tournament_id,
                tournaments (
                    id,
                    name,
                    format,
                    status
                )
            )
        `)
        .eq("global_player_id", globalPlayerId)
        .order("created_at", { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
}
