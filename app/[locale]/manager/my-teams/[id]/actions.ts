'use server';

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player } from "@/types/index";
import { deleteFileFromUrl } from "@/utils/supabase/storage";

async function isAuthorizedForTeam(teamId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if it's a global team owned by user
    const { data: globalTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("user_id", userId)
        .single();
    
    if (globalTeam) return true;

    // Check if it's a tournament team owned by user or if user is tournament manager
    const { data: participation } = await supabase
        .from("tournament_teams")
        .select("user_id, tournament_id")
        .eq("id", teamId)
        .single();
    
    if (participation) {
        if (participation.user_id === userId) return true;

        // Check if user is organizer of the tournament
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("user_id")
            .eq("id", participation.tournament_id)
            .single();
        
        if (tournament && tournament.user_id === userId) return true;

        // Check if user is a member with admin/editor role
        const { data: membership } = await supabase
            .from("tournament_members")
            .select("role")
            .eq("tournament_id", participation.tournament_id)
            .eq("user_id", userId)
            .eq("status", "accepted")
            .in("role", ["admin", "editor"])
            .single();
        
        if (membership) return true;
    }

    return false;
}

export async function getTeam(teamId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let { data, error } = await supabase
        .from("teams")
        .select(`*`)
        .eq("id", teamId)
        .single();

    let isParticipation = false;

    // Fallback: Check if this is a tournament_team (participation)
    if (error || !data) {
        const { data: participation, error: pError } = await supabase
            .from("tournament_teams")
            .select(`*, tournament:tournaments(*)`)
            .eq("id", teamId)
            .single();

        if (participation) {
            data = participation;
            isParticipation = true;
        } else {
            return null;
        }
    }

    if (!data) return null;

    // Fetch Tournament Participations (only for global teams)
    let participations = [];
    if (!isParticipation) {
        const { data: pData } = await supabase
            .from("tournament_teams")
            .select(`
                *,
                tournament:tournaments(id, name, status, start_date)
            `)
            .eq("team_id", teamId)
            .order("created_at", { ascending: false });
        participations = pData || [];
    } else {
        // If it's already a participation, we can mock the array or just let UI handle it
        participations = [data];
    }

    // Fetch Registration Status
    const { data: registrations } = await supabase
        .from("registrations")
        .select("tournament_id, payment_status")
        .eq("user_id", user.id);

    return {
        ...data,
        isParticipation, // Flag for UI
        participations: participations || [],
        registrations: registrations || []
    };
}

export async function toggleRosterLock(teamId: string, isLocked: boolean): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Authorization Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this team" };

    // Check which table to update (Use Admin to avoid RLS)
    const { data: globalTeam } = await adminSupabase.from("teams").select("id").eq("id", teamId).single();
    const { data: participation } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();

    if (!globalTeam && !participation) {
        return { success: false, error: "Team context not found." };
    }

    const tableToAdd = globalTeam ? "teams" : "tournament_teams";
    const { error } = await adminSupabase
        .from(tableToAdd)
        .update({ is_roster_locked: isLocked })
        .eq("id", teamId);

    if (error) {
        if (error.message.includes("is_roster_locked") && error.message.includes("column")) {
             return { 
                success: false, 
                error: `The "is_roster_locked" feature is missing in your database for ${tableToAdd}. Please run the SQL migration: ALTER TABLE public.${tableToAdd} ADD COLUMN IF NOT EXISTS is_roster_locked BOOLEAN DEFAULT false;` 
            };
        }
        return { success: false, error: error.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

export async function getPlayers(teamId: string): Promise<ActionResponse<Player[]>> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("players")
        .select("*, global_player:global_players(*)")
        .or(`team_id.eq.${teamId},global_team_id.eq.${teamId}`)
        .order("number", { ascending: true });

    if (error) {
        console.error(`[getPlayers] Error fetching players for ${teamId}:`, error);
        // Return empty data but success false with error message
        return { success: false, error: error.message, data: [] };
    }
    return { success: true, data: data || [] };
}

export async function addPlayer(
    teamId: string,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const position = formData.get("position") as string;
    const birthDate = formData.get("birthDate") as string;
    const globalPlayerId = formData.get("global_player_id") as string;

    if (!name) return { success: false, error: "Name is required" };

    // Determine context (Tournament Participation vs. Global Team)
    // We check participation first to prioritize tournament rosters
    const { data: participation } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();
    let globalTeam = null;
    
    if (!participation) {
        const { data: globalCheck } = await adminSupabase.from("teams").select("id").eq("id", teamId).single();
        globalTeam = globalCheck;
    }

    if (!participation && !globalTeam) {
        console.error(`[addPlayer] Team ID ${teamId} not found in tournament_teams or teams`);
        return { success: false, error: "Team record not found. Please refresh and try again." };
    }

    const insertData: any = {
        name,
        number: number ? parseInt(number) : null,
        position: position || null,
        birth_date: birthDate || null,
        photo_url: null,
        team_id: participation ? teamId : null,
        global_team_id: globalTeam ? teamId : null,
        global_player_id: globalPlayerId || null,
        created_at: new Date().toISOString(),
    };

    console.log(`[addPlayer] Inserting player into ${participation ? 'Tournament' : 'Global'} team: ${teamId}`);
    const { error } = await adminSupabase.from("players").insert(insertData);

    if (error) {
        console.error("[addPlayer] Insert failed:", error);
        return { 
            success: false, 
            error: `Database Error: ${error.message} (Context: ${participation ? 'Tournament' : 'Global'}, ID: ${teamId})`
        };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

export async function updatePlayer(
    playerId: string,
    teamId: string,
    data: { name?: string; number?: number | null; position?: string | null; birth_date?: string | null; photo_url?: string | null }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const { error } = await adminSupabase
        .from("players")
        .update(data)
        .eq("id", playerId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

export async function deletePlayer(playerId: string, teamId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const { error } = await adminSupabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

export async function importRoster(
    targetTeamId: string,
    sourceTeamId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorizedTarget = await isAuthorizedForTeam(targetTeamId, user.id);
    if (!authorizedTarget) return { success: false, error: "Unauthorized to manage target roster" };

    const authorizedSource = await isAuthorizedForTeam(sourceTeamId, user.id);
    if (!authorizedSource) return { success: false, error: "Unauthorized to read from source roster" };

    const { data: sourcePlayers, error: fetchError } = await supabase
        .from("players")
        .select("*")
        .or(`team_id.eq.${sourceTeamId},global_team_id.eq.${sourceTeamId}`);

    if (fetchError) return { success: false, error: fetchError.message };
    if (!sourcePlayers || sourcePlayers.length === 0) {
        return { success: false, error: "Source team has no players" };
    }

    // Determine target context robustly
    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", targetTeamId).single();
    let globalCheck = null;
    
    if (!participationCheck) {
        const { data: gCheck } = await adminSupabase.from("teams").select("id").eq("id", targetTeamId).single();
        globalCheck = gCheck;
    }

    if (!participationCheck && !globalCheck) {
        console.error(`[importRoster] Target Team ID ${targetTeamId} not found`);
        return { success: false, error: "Target team not found. Please refresh the page." };
    }

    const newPlayers = sourcePlayers.map(p => ({
        team_id: participationCheck ? targetTeamId : null,
        global_team_id: globalCheck ? targetTeamId : null,
        name: p.name,
        number: p.number,
        position: p.position,
        birth_date: p.birth_date,
        photo_url: p.photo_url,
        global_player_id: p.global_player_id,
        created_at: new Date().toISOString(),
    }));

    console.log(`[importRoster] Importing ${newPlayers.length} players into ${participationCheck ? 'Tournament' : 'Global'} team: ${targetTeamId}`);
    const { error: insertError } = await adminSupabase
        .from("players")
        .insert(newPlayers);

    if (insertError) {
        console.error("[importRoster] Bulk insert failed:", insertError);
        return { 
            success: false, 
            error: `Database Error: ${insertError.message} (Context: ${participationCheck ? 'Tournament' : 'Global'}, TargetID: ${targetTeamId})`
        };
    }

    revalidatePath(`/manager/my-teams/${targetTeamId}`);
    return { success: true, message: `Successfully imported ${newPlayers.length} players.` };
}
