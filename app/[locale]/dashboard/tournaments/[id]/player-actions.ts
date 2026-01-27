"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player } from "@/types/index";

export async function addPlayer(
    teamId: string,
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const position = formData.get("position") as string;

    if (!name) {
        return { success: false, error: "Player name is required" };
    }

    if (!teamId) {
        return { success: false, error: "Team ID is required" };
    }

    const { error } = await supabase.from("players").insert({
        team_id: teamId,
        name,
        number: number ? parseInt(number) : null,
        position: position || null,
    });

    if (error) {
        console.error("Error adding player:", error);
        return { success: false, error: "Failed to add player: " + error.message };
    }

    // We can't easy revalidate the specific team list path from here without passing it, 
    // but usually this is called from the tournament dashboard so we might want to revalidate that.
    // Ideally we revalidate the layout or the page.
    // For now, let's assume the UI handles the update or we pass the tournamentId to revalidate.
    // But `teamId` is all we have. We might need to fetch the team to get the tournament_id for exact path revalidation.
    // OR we just return success and let client update.

    // Let's try to fetch tournament_id to behave like other actions
    const { data: team } = await supabase.from('teams').select('tournament_id').eq('id', teamId).single();
    if (team) {
        revalidatePath(`/dashboard/tournaments/${team.tournament_id}`);
    }

    return { success: true };
}

export async function getPlayers(teamId: string): Promise<{ success: boolean; data?: Player[]; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("number", { ascending: true });

    if (error) {
        console.error("Error fetching players:", error);
        return { success: false, error: "Failed to fetch players" };
    }

    return { success: true, data: data as Player[] };
}

export async function deletePlayer(playerId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // Get team_id first for revalidation (optional but good practice)
    const { data: player } = await supabase.from('players').select('team_id').eq('id', playerId).single();

    const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    if (player) {
        const { data: team } = await supabase.from('teams').select('tournament_id').eq('id', player.team_id).single();
        if (team) {
            revalidatePath(`/dashboard/tournaments/${team.tournament_id}`);
        }
    }

    return { success: true };
}
