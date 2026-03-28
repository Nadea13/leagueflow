'use server';

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player } from "@/types/index";

async function isAuthorizedManager(teamId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if it's a global team owned by user
    const { data: globalTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("user_id", userId)
        .single();
    
    if (globalTeam) return true;

    // Check if it's a participation team managed by user
    const { data: participation } = await supabase
        .from("tournament_teams")
        .select("user_id, tournament_id")
        .eq("id", teamId)
        .single();
    
    if (participation) {
        if (participation.user_id === userId) return true;

        // Check tournament organizer
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("user_id")
            .eq("id", participation.tournament_id)
            .single();
        
        if (tournament && tournament.user_id === userId) return true;

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

    const { data, error } = await supabase
        .from("teams")
        .select(`
            *,
            tournament:tournaments(id, name)
        `)
        .eq("id", teamId)
        .single();

    if (error) return null;

    // Fetch Registration Status if team is in a tournament
    let registration = null;
    if (data.tournament_id) {
        const { data: regData } = await supabase
            .from("registrations")
            .select("payment_status")
            .eq("tournament_id", data.tournament_id)
            .eq("user_id", user.id) // Ensure we get the one for THIS manager
            .single();
        registration = regData;
    }

    // Fetch latest 3 announcements
    let announcements = [];
    if (data.tournament_id) {
        const { data: annData } = await supabase
            .from("announcements")
            .select("*")
            .eq("tournament_id", data.tournament_id)
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(3);
        announcements = annData || [];
    }

    return {
        ...data,
        registration,
        announcements
    };
}

export async function toggleRosterLock(teamId: string, isLocked: boolean): Promise<ActionResponse> {
    const adminSupabase = createAdminClient();
    
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

    revalidatePath(`/dashboard/teams/${teamId}`);
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
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function addPlayer(
    teamId: string,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedManager(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized" };

    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const position = formData.get("position") as string;

    if (!name) return { success: false, error: "Name is required" };

    // Determine context robustly
    const { data: participation } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();
    let globalTeam = null;
    
    if (!participation) {
        const { data: gCheck } = await adminSupabase.from("teams").select("id").eq("id", teamId).single();
        globalTeam = gCheck;
    }

    if (!participation && !globalTeam) {
        console.error(`[addPlayer] Team ID ${teamId} not found in any team table`);
        return { success: false, error: "Team record not found." };
    }

    const insertData: any = {
        name,
        number: number ? parseInt(number) : null,
        position: position || null,
        created_at: new Date().toISOString(),
        team_id: participation ? teamId : null,
        global_team_id: globalTeam ? teamId : null,
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

    revalidatePath(`/dashboard/teams/${teamId}`);
    return { success: true };
}

export async function updatePlayer(
    playerId: string,
    teamId: string,
    data: { number?: number | null; position?: string | null }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedManager(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized" };

    const { error } = await adminSupabase
        .from("players")
        .update(data)
        .eq("id", playerId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/teams/${teamId}`);
    return { success: true };
}

export async function deletePlayer(playerId: string, teamId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedManager(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized" };

    const { error } = await adminSupabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/teams/${teamId}`);
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

    const authorized = await isAuthorizedManager(targetTeamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized" };

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
        return { success: false, error: "Target team not found." };
    }

    const newPlayers = sourcePlayers.map(p => ({
        team_id: participationCheck ? targetTeamId : null,
        global_team_id: globalCheck ? targetTeamId : null,
        name: p.name,
        number: p.number,
        position: p.position,
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

    revalidatePath(`/dashboard/teams/${targetTeamId}`);
    return { success: true, message: `Successfully imported ${newPlayers.length} players.` };
}
