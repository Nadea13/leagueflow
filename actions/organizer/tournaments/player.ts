"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player } from "@/types/index";
import { deleteFileFromUrl } from "@/lib/supabase/storage";

async function isAuthorizedOrganizer(tournamentId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if user is the owner of the tournament
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("user_id")
        .eq("id", tournamentId)
        .single();
    
    if (tournament && tournament.user_id === userId) return true;

    // Check if user is a member with admin/editor role
    const { data: membership } = await supabase
        .from("tournament_members")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .eq("status", "accepted")
        .in("role", ["admin", "editor"])
        .single();
    
    if (membership) return true;

    return false;
}

export async function addPlayer(
    teamId: string,
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    // Fetch tournament_id to check authorization
    const { data: teamData } = await supabase
        .from("tournament_teams")
        .select("tournament_id")
        .eq("id", teamId)
        .single();
    
    if (!teamData) return { success: false, error: "Team not found" };

    const authorized = await isAuthorizedOrganizer(teamData.tournament_id, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const position = formData.get("position") as string;
    const birthDate = formData.get("birthDate") as string;

    if (!name) {
        return { success: false, error: "Player name is required" };
    }

    // Check if this is a global team or a tournament participation (Use Admin to avoid RLS)
    const { data: globalTeam } = await adminSupabase.from("teams").select("id").eq("id", teamId).single();
    const { data: participation } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();

    if (!globalTeam && !participation) {
        console.error(`[addPlayer] Team ID ${teamId} not found in any team table`);
        return { success: false, error: "Invalid team context. Team record not found." };
    }

    const { error } = await adminSupabase.from("players").insert({
        team_id: participation ? teamId : null,
        global_team_id: globalTeam ? teamId : null,
        name,
        number: number ? parseInt(number) : null,
        position: position || null,
        birth_date: birthDate || null,
        photo_url: null,
        created_at: new Date().toISOString(),
    });

    if (error) {
        console.error("[addPlayer] Error inserting player:", error);
        return { success: false, error: "Failed to add player: " + error.message };
    }

    revalidatePath(`/organizer/tournaments/${teamData.tournament_id}`);
    return { success: true };
}

export async function getPlayers(teamId: string): Promise<{ success: boolean; data?: Player[]; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("players")
        .select("*")
        .or(`team_id.eq.${teamId},global_team_id.eq.${teamId}`)
        .order("number", { ascending: true });

    if (error) {
        console.error("Error fetching players:", error);
        return { success: false, error: "Failed to fetch players" };
    }

    return { success: true, data: data as Player[] };
}

export async function deletePlayer(playerId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: player } = await supabase.from('players').select('team_id, global_team_id').eq('id', playerId).single();
    if (!player) return { success: false, error: "Player not found" };

    const effectiveTeamId = player.team_id || player.global_team_id;
    if (!effectiveTeamId) return { success: false, error: "Player team context not found" };

    // Fetch tournament_id to check authorization
    let tournamentId = null;
    
    if (player.team_id) {
        const { data: teamData } = await supabase
            .from("tournament_teams")
            .select("tournament_id")
            .eq("id", player.team_id)
            .single();
        tournamentId = teamData?.tournament_id;
    }

    if (!tournamentId) return { success: false, error: "Tournament context not found" };

    const authorized = await isAuthorizedOrganizer(tournamentId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const { error } = await adminSupabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updatePlayer(
    playerId: string,
    data: { name?: string; number?: number | null; position?: string | null; birth_date?: string | null; photo_url?: string | null }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: player } = await supabase.from('players').select('team_id, global_team_id').eq('id', playerId).single();
    if (!player) return { success: false, error: "Player not found" };

    const effectiveTeamId = player.team_id || player.global_team_id;
    if (!effectiveTeamId) return { success: false, error: "Player team context not found" };

    // Fetch tournament_id to check authorization
    let tournamentId = null;
    
    if (player.team_id) {
        const { data: teamData } = await supabase
            .from("tournament_teams")
            .select("tournament_id")
            .eq("id", player.team_id)
            .single();
        tournamentId = teamData?.tournament_id;
    }

    if (!tournamentId) return { success: false, error: "Tournament context not found" };

    const authorized = await isAuthorizedOrganizer(tournamentId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const { error } = await adminSupabase
        .from("players")
        .update(data)
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
