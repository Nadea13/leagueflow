'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player } from "@/types/index";
import { validateUploadedFile } from "@/lib/file-validation";
import { logActivity } from "@/lib/audit";
import { 
    getGlobalPlayers as getGP, 
    createGlobalPlayer as createGP, 
    linkPlayerToGlobal as linkGP, 
    unlinkPlayerFromGlobal as unlinkGP,
    updateGlobalPlayerInfo as updateGPInfo
} from "../organizer/tournaments/global-player";

export async function updateGlobalPlayerInfo(globalPlayerId: string, data: { name?: string; date_of_birth?: string | null }) {
    return updateGPInfo(globalPlayerId, data);
}

export async function getGlobalPlayers(page?: number, pageSize?: number, search?: string) {
    return getGP(page, pageSize, search);
}

export async function createGlobalPlayer(name: string, photoUrl?: string | null, dateOfBirth?: string | null, athleteTypes?: string[]) {
    return createGP(name, photoUrl, dateOfBirth, athleteTypes);
}

export async function linkPlayerToGlobal(playerId: string, globalPlayerId: string) {
    return linkGP(playerId, globalPlayerId);
}

export async function unlinkPlayerFromGlobal(playerId: string) {
    return unlinkGP(playerId);
}


/**
 * Authorization helper to check if a user is authorized to manage a team.
 * Checks global team ownership and tournament participation ownership/management.
 */
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

/* ============================================================================
   TEAM MANAGEMENT
   ============================================================================ */

/**
 * Create a new global team.
 */
export async function createTeam(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const logoFile = formData.get("logo") as File;
        const sport = (formData.get("sport") as string) || "football";
        const description = formData.get("description") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }

        let logoUrl = null;

        // Handle logo upload if provided
        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("team-logos")
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload error:", uploadError);
                return { success: false, error: "Failed to upload logo: " + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from("team-logos")
                .getPublicUrl(filePath);

            logoUrl = publicUrl;
        }

        // Insert team record
        const { error: insertError } = await supabase
            .from("teams")
            .insert({
                name,
                logo_url: logoUrl,
                sport,
                description: description || null,
                user_id: user.id,
                created_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error("Create team error:", insertError);
            return { success: false, error: insertError.message };
        }
        
        // Fetch the inserted team to get its ID
        const { data: insertedTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("name", name)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (insertedTeam) {
            await logActivity('CREATE_TEAM', 'team', insertedTeam.id, { name, sport });
        }

        revalidatePath("/manager/my-teams");
        revalidatePath("/manager/dashboard");
        revalidatePath("/organizer/dashboard"); 
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in createTeam:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Get all global teams owned by the current user.
 */
export async function getMyTeams(): Promise<ActionResponse<unknown[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const { data, error } = await supabase
            .from("teams")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error in getMyTeams:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Get detailed team information, handling both global teams and tournament participations.
 */
export async function getTeam(teamId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: teamData, error } = await supabase
        .from("teams")
        .select(`*`)
        .eq("id", teamId)
        .single();

    let data = teamData;

    let isParticipation = false;

    // Fallback: Check if this is a tournament_team (participation)
    if (error || !data) {
        const { data: participation } = await supabase
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
    let participations: unknown[] = [];
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
        participations = [data];
    }

    // Fetch Registration Status
    const { data: registrations } = await supabase
        .from("registrations")
        .select("tournament_id, payment_status")
        .eq("user_id", user.id);

    return {
        ...data,
        isParticipation,
        participations: participations || [],
        registrations: registrations || []
    };
}

/**
 * Update global team information.
 */
export async function updateTeamGlobal(teamId: string, formData: FormData, _tournamentId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const logoFile = formData.get("logo") as File;
        const sport = formData.get("sport") as string;
        const description = formData.get("description") as string;
        const existingLogoUrl = formData.get("existing_logo_url") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }

        let logoUrl = existingLogoUrl;

        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("team-logos")
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload error:", uploadError);
                return { success: false, error: "Failed to upload logo: " + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from("team-logos")
                .getPublicUrl(filePath);

            logoUrl = publicUrl;
        }

        const { error } = await supabase
            .from("teams")
            .update({
                name,
                logo_url: logoUrl,
                sport: sport || undefined,
                description: description || null,
            })
            .eq("id", teamId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Update team error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/manager/my-teams");
        revalidatePath(`/manager/my-teams/${teamId}`);
        
        await logActivity('UPDATE_TEAM', 'team', teamId, { name, sport, update_type: 'global' });
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in updateTeamGlobal:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Delete a global team.
 */
export async function deleteTeamGlobal(teamId: string, _tournamentId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const { error } = await supabase
            .from("teams")
            .delete()
            .eq("id", teamId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Delete team error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/manager/my-teams");
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in deleteTeamGlobal:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Toggle roster locking for a team.
 */
export async function toggleRosterLock(teamId: string, isLocked: boolean): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this team" };

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
        return { success: false, error: error.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

/* ============================================================================
   PLAYER MANAGEMENT (Manager Perspective)
   ============================================================================ */

/**
 * Get players for a specific team (global or tournament).
 */
export async function getPlayers(teamId: string): Promise<ActionResponse<Player[]>> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("players")
        .select("*, global_player:global_players(*)")
        .or(`team_id.eq.${teamId},global_team_id.eq.${teamId}`)
        .order("number", { ascending: true });

    if (error) {
        console.error(`[getPlayers] Error fetching players for ${teamId}:`, error);
        return { success: false, error: error.message, data: [] };
    }
    return { success: true, data: data || [] };
}

/**
 * Add a player to a team roster.
 */
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

    const { data: participation } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();
    let globalTeam = null;
    
    if (!participation) {
        const { data: globalCheck } = await adminSupabase.from("teams").select("id").eq("id", teamId).single();
        globalTeam = globalCheck;
    }

    if (!participation && !globalTeam) {
        return { success: false, error: "Team record not found." };
    }

    const insertData = {
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

    const { error } = await adminSupabase.from("players").insert(insertData);

    if (error) {
        console.error("[addPlayer] Insert failed:", error);
        return { success: false, error: error.message };
    }

    // Auto-update Global Profile with Team Sport
    if (globalPlayerId) {
        // Fetch team's sport
        const table = participation ? "tournament_teams" : "teams";
        const { data: teamData } = await adminSupabase
            .from(table)
            .select("sport")
            .eq("id", teamId)
            .single();

        if (teamData?.sport) {
            // Get current athlete types
            const { data: gp } = await adminSupabase
                .from("global_players")
                .select("athlete_types")
                .eq("id", globalPlayerId)
                .single();

            if (gp) {
                const currentTypes = gp.athlete_types || [];
                if (!currentTypes.includes(teamData.sport)) {
                    await adminSupabase
                        .from("global_players")
                        .update({ 
                            athlete_types: [...currentTypes, teamData.sport] 
                        })
                        .eq("id", globalPlayerId);
                }
            }
        }
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    return { success: true };
}

/**
 * Update player information.
 */
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
    await logActivity('UPDATE_PLAYER', 'player', playerId, { team_id: teamId, ...data });
    return { success: true };
}

/**
 * Remove a player from a team roster.
 */
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

/**
 * Import a roster from one team to another.
 */
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

    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", targetTeamId).single();
    let globalCheck = null;
    
    if (!participationCheck) {
        const { data: gCheck } = await adminSupabase.from("teams").select("id").eq("id", targetTeamId).single();
        globalCheck = gCheck;
    }

    if (!participationCheck && !globalCheck) {
        return { success: false, error: "Target team not found." };
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

    const { error: insertError } = await adminSupabase
        .from("players")
        .insert(newPlayers);

    if (insertError) {
        console.error("[importRoster] Bulk insert failed:", insertError);
        return { success: false, error: insertError.message };
    }

    revalidatePath(`/manager/my-teams/${targetTeamId}`);
    return { success: true, message: `Successfully imported ${newPlayers.length} players.` };
}

/**
 * Remove all players from a team roster.
 */
export async function resetRoster(teamId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const { error } = await adminSupabase
        .from("players")
        .delete()
        .or(`team_id.eq.${teamId},global_team_id.eq.${teamId}`);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/manager/my-teams/${teamId}`);
    await logActivity('RESET_ROSTER', 'team', teamId, { reset_by: user.id });
    return { success: true };
}
