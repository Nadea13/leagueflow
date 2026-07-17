'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player, Sport } from "@/types/index";
import { validateUploadedFile } from "@/lib/file-validation";
import { logActivity } from "@/lib/audit";
import { 
    getGlobalPlayers as getGP, 
    createGlobalPlayer as createGP, 
    linkPlayerToGlobal as linkGP, 
    unlinkPlayerFromGlobal as unlinkGP,
    updateGlobalPlayerInfo as updateGPInfo
} from "../tournaments/master-player";

export async function updateGlobalPlayerInfo(globalPlayerId: string, data: { name?: string; date_of_birth?: string | null }) {
    return updateGPInfo(globalPlayerId, data);
}

export async function getGlobalPlayers(page?: number, pageSize?: number, search?: string) {
    return getGP(page, pageSize, search);
}

export async function createGlobalPlayer(name: string, photoUrl?: string | null, dateOfBirth?: string | null, _athleteTypes?: string[]) {
    return createGP(name, photoUrl, dateOfBirth);
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
        .select(`
            id,
            team_id,
            teams ( user_id ),
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .eq("id", teamId)
        .single();
    
    if (participation) {
        const teamOwnerId = (participation.teams as unknown as { user_id: string } | null)?.user_id;
        if (teamOwnerId === userId) return true;

        const tournamentId = (participation.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id;
        if (tournamentId) {
            // Check if user is organizer of the tournament
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_id")
                .eq("id", tournamentId)
                .single();
            
            if (tournament && tournament.organizer_id === userId) return true;

            // Check if user is a member with admin/editor role
            const { data: membership } = await supabase
                .from("tournament_invitations")
                .select("role")
                .eq("tournament_id", tournamentId)
                .eq("user_id", userId)
                .eq("status", "accepted")
                .in("role", ["co_organizer", "staff"])
                .is("deleted_at", null)
                .maybeSingle();
            
            if (membership) return true;
        }
    }

    return false;
}

/* ============================================================================
   TEAM MANAGEMENT
   ============================================================================ */

/**
 * Get all available sports.
 */
export async function getSports(): Promise<ActionResponse<Sport[]>> {
    try {
        const supabase = await createClient();
        const { data: sports, error } = await supabase
            .from("sports")
            .select("*")
            .order("sport_name", { ascending: true });

        if (error) {
            console.error("Fetch sports error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data: sports };
    } catch (error) {
        console.error("Unexpected error in getSports:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

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
        let sportId = formData.get("sport_id") as string;
        const description = formData.get("description") as string;
        const contact_name = formData.get("contact_name") as string;
        const contact_phone = formData.get("contact_phone") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }
        if (!contact_name) {
            return { success: false, error: "Contact name is required" };
        }
        if (!contact_phone) {
            return { success: false, error: "Contact phone is required" };
        }

        if (!sportId) {
            // Find first sport in DB or default to football UUID
            const { data: sportData } = await supabase
                .from("sports")
                .select("id")
                .limit(1)
                .maybeSingle();
            sportId = sportData?.id || "a821b9db-6a6e-4c5b-aea4-1ed122076db2"; // fallback
        }

        const teamId = crypto.randomUUID();
        let logoUrl = null;

        // Handle logo upload if provided
        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${teamId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("teams")
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload error:", uploadError);
                return { success: false, error: "Failed to upload logo: " + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from("teams")
                .getPublicUrl(filePath);

            logoUrl = publicUrl;
        }

        // Insert team record
        const { error: insertError } = await supabase
            .from("teams")
            .insert({
                id: teamId,
                name,
                logo_img: logoUrl,
                sport_id: sportId,
                description: description || null,
                contact_name,
                contact_phone,
                user_id: user.id,
                created_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error("Create team error:", insertError);
            return { success: false, error: insertError.message };
        }
        
        await logActivity('CREATE_TEAM', 'team', teamId, { name, sport_id: sportId });

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
            .select(`
                *,
                sports:sport_id(sport_name),
                participations:tournament_teams(
                    tournament_categories(
                        tournament:tournaments(name)
                    )
                )
            `)
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        // Map database columns to match expected types in frontend (logo_img -> logo_url, sport_id -> sport)
        const mappedData = (data || []).map((team) => {
            const firstParticipation = team.participations?.[0];
            const tournamentName = firstParticipation?.tournament_categories?.tournament?.name || null;

            return {
                ...team,
                logo_url: team.logo_img,
                sport: team.sports?.sport_name?.toLowerCase() || 'football',
                tournament: tournamentName ? { name: tournamentName } : null
            };
        });

        return { success: true, data: mappedData };
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
        .select(`
            *,
            sports:sport_id(sport_name)
        `)
        .eq("id", teamId)
        .is("deleted_at", null)
        .single();

    let data = teamData;

    let isParticipation = false;

    // Fallback: Check if this is a tournament_team (participation)
    if (error || !data) {
        const { data: participation } = await supabase
            .from("tournament_teams")
            .select(`
                *,
                team:teams (
                    id,
                    name,
                    logo_img,
                    description,
                    sport_id,
                    sports:sport_id(sport_name)
                ),
                tournament_categories (
                    tournaments ( * )
                )
            `)
            .eq("id", teamId)
            .is("deleted_at", null)
            .single();

        if (participation) {
            const flatTournament = (participation.tournament_categories as unknown as { tournaments: unknown } | null)?.tournaments;
            const teamObj = (Array.isArray(participation.team) ? participation.team[0] : participation.team) as unknown as { name?: string; logo_img?: string | null; description?: string; sports?: { sport_name?: string } } | null;
            data = {
                ...participation,
                name: participation.name || teamObj?.name || "Unknown Team",
                logo_url: participation.logo_url || teamObj?.logo_img || null,
                description: participation.description || teamObj?.description || "",
                sport: teamObj?.sports?.sport_name?.toLowerCase() || 'football',
                tournament: flatTournament
            };
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
                tournament_categories (
                    tournaments ( id, name, status, start_date )
                )
            `)
            .eq("team_id", teamId)
            .order("created_at", { ascending: false });
        
        participations = (pData || []).map((p) => ({
            ...p,
            tournament: (p.tournament_categories as unknown as { tournaments: unknown } | null)?.tournaments
        }));
    } else {
        participations = [data];
    }

    // Fetch Registration Status
    const { data: userTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("user_id", user.id);
    
    const ownedTeamIds = userTeams?.map((t) => t.id) || [];
    
    let registrations: unknown[] = [];
    if (ownedTeamIds.length > 0) {
        const { data: regData } = await supabase
            .from("tournament_teams")
            .select(`
                id,
                payment_status,
                slip_img,
                tournament_categories!inner (
                    tournament_id
                )
            `)
            .in("team_id", ownedTeamIds)
            .is("deleted_at", null);
        
        if (regData) {
            registrations = regData.map((r) => ({
                tournament_team_id: r.id,
                payment_status: (r.payment_status || 'pending').toUpperCase(),
                slip_url: r.slip_img,
                tournament_id: (r.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id
            }));
        }
    }

    // Map database columns to match expected types in frontend (logo_img -> logo_url, sport_id -> sport)
    const mappedData = {
        ...data,
        logo_url: data.logo_img || data.logo_url,
        sport: data.sports?.sport_name?.toLowerCase() || data.sport || 'football'
    };

    return {
        ...mappedData,
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
        const contact_name = formData.get("contact_name") as string;
        const contact_phone = formData.get("contact_phone") as string;
        const existingLogoUrl = formData.get("existing_logo_url") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }

        let logoUrl = existingLogoUrl;

        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${teamId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("teams")
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload error:", uploadError);
                return { success: false, error: "Failed to upload logo: " + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from("teams")
                .getPublicUrl(filePath);

            logoUrl = publicUrl;
        }

        // Detect which table to update
        const { data: globalTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("id", teamId)
            .eq("user_id", user.id)
            .maybeSingle();

        const tableName = globalTeam ? "teams" : "tournament_teams";

        let updateData: Record<string, unknown> = {};
        if (tableName === "teams") {
            updateData = {
                name,
                logo_img: logoUrl,
                sport_id: sport || undefined, // sport holds the sport_id UUID or is undefined
                description: description || null,
                contact_name: contact_name || null,
                contact_phone: contact_phone || null,
            };
        } else {
            updateData = {
                name,
                logo_url: logoUrl,
                sport: sport || undefined,
                description: description || null,
                contact_name: contact_name || null,
                contact_phone: contact_phone || null,
            };
        }

        const { error } = await supabase
            .from(tableName)
            .update(updateData)
            .eq("id", teamId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Update team error:", error);
            return { success: false, error: error.message };
        }

        // Revalidate relevant paths
        revalidatePath("/manager/my-teams");
        revalidatePath("/manager/my-registrations");
        revalidatePath(`/manager/my-teams/${teamId}`);
        revalidatePath(`/manager/my-registrations/${teamId}`);
        
        await logActivity('UPDATE_TEAM', 'team', teamId, { name, sport, update_type: 'global', table: tableName });
        
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
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Detect which table to delete from
        const { data: globalTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("id", teamId)
            .eq("user_id", user.id)
            .maybeSingle();

        const tableName = globalTeam ? "teams" : "tournament_teams";
        const now = new Date().toISOString();

        // 1. Soft-delete the team record (either teams or tournament_teams)
        const { error } = await adminSupabase
            .from(tableName)
            .update({ deleted_at: now })
            .eq("id", teamId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Delete team error:", error);
            return { success: false, error: error.message };
        }

        // 2. Also soft-delete tournament_teams if it was a global team
        if (tableName === "teams") {
            const { data: participations } = await adminSupabase
                .from("tournament_teams")
                .select("id")
                .eq("team_id", teamId);
            
            const partIds = participations?.map(p => p.id) || [];
            
            await adminSupabase
                .from("tournament_teams")
                .update({ deleted_at: now })
                .eq("team_id", teamId);

            // Fetch player_ids from player_sports for this team and its participations
            const orConditions = [`team_id.eq.${teamId}`];
            if (partIds.length > 0) {
                orConditions.push(`team_id.in.(${partIds.join(',')})`);
            }

            const { data: psRecords } = await adminSupabase
                .from("player_sports")
                .select("player_id")
                .or(orConditions.join(','));

            // Soft-delete player_sports
            await adminSupabase
                .from("player_sports")
                .update({ deleted_at: now })
                .or(orConditions.join(','));

            // Soft-delete players
            if (psRecords && psRecords.length > 0) {
                const playerIds = psRecords.map((r) => r.player_id);
                await adminSupabase
                    .from("players")
                    .update({ deleted_at: now })
                    .in("id", playerIds);
            }
        } else {
            // It was a participation ID
            const { data: psRecords } = await adminSupabase
                .from("player_sports")
                .select("player_id")
                .eq("team_id", teamId);

            // Soft-delete player_sports
            await adminSupabase
                .from("player_sports")
                .update({ deleted_at: now })
                .eq("team_id", teamId);

            // Soft-delete players
            if (psRecords && psRecords.length > 0) {
                const playerIds = psRecords.map((r) => r.player_id);
                await adminSupabase
                    .from("players")
                    .update({ deleted_at: now })
                    .in("id", playerIds);
            }
        }

        revalidatePath("/manager/my-teams");
        revalidatePath("/manager/my-registrations");
        revalidatePath(`/manager/my-teams/${teamId}`);
        
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
    const adminSupabase = createAdminClient();
    
    // First, check if teamId matches a tournament_teams (participation)
    const { data: participation } = await supabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            tournament_category_id,
            roster_status,
            tournament_categories ( tournament_id )
        `)
        .eq("id", teamId)
        .single();

    if (participation) {
        // 1. Fetch approved players from tournament_players
        const { data: approvedData, error: approvedError } = await supabase
            .from("tournament_players")
            .select(`
                id,
                position,
                shirt_number,
                tournament_team_id,
                player:master_player_id!inner (
                    id,
                    first_name_en,
                    last_name_en,
                    first_name_th,
                    last_name_th,
                    birthday,
                    tel,
                    profile_img,
                    created_at,
                    deleted_at
                )
            `)
            .eq("tournament_team_id", teamId)
            .is("player.deleted_at", null);

        if (approvedError) {
            console.error(`[getPlayers] Error fetching tournament players for ${teamId}:`, approvedError);
            return { success: false, error: approvedError.message, data: [] };
        }

        const mappedPlayers: Player[] = (approvedData || []).map((tp) => {
            const mp = tp.player as any;
            return {
                id: tp.id,
                name: (mp ? (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim() : ''),
                number: tp.shirt_number ? parseInt(tp.shirt_number) : null,
                position: tp.position || null,
                birth_date: mp?.birthday || null,
                photo_url: mp?.profile_img || null,
                team_id: teamId,
                global_team_id: null,
                global_player_id: mp?.id || null,
                tel: mp?.tel || null,
                status: 'approved',
                created_at: mp?.created_at || new Date().toISOString(),
                deleted_at: mp?.deleted_at || null
            };
        });

        // 2. Fetch pending roster submissions
        const { data: submissions, error: subErr } = await supabase
            .from("tournament_roster_submissions")
            .select("*")
            .eq("tournament_team_id", teamId)
            .eq("status", "pending");

        if (!subErr && submissions) {
            const pendingPlayers: Player[] = submissions.map((s) => ({
                id: s.id,
                name: s.name,
                number: s.shirt_number ? parseInt(s.shirt_number) : null,
                position: s.position || null,
                birth_date: null,
                photo_url: s.photo_url || null,
                team_id: teamId,
                global_team_id: null,
                global_player_id: null,
                tel: s.tel || null,
                status: 'pending',
                created_at: s.created_at,
                deleted_at: null
            }));
            mappedPlayers.push(...pendingPlayers);
        }

        // Auto-clone roster if participation roster is empty
        if (mappedPlayers.length === 0 && participation.team_id) {
            const globalTeamId = participation.team_id;
            const cloneResult = await importRoster(teamId, globalTeamId);
            
            if (cloneResult.success) {
                // Re-fetch players after successful import
                return getPlayers(teamId);
            }
        }

        return { success: true, data: mappedPlayers };
    }

    let query = adminSupabase.from("player_sports").select(`
        id,
        position,
        shirt_number,
        team_id,
        sport_id,
        deleted_at,
        player:player_id!inner (
            id,
            display_name,
            tel,
            created_at,
            deleted_at,
            master_player:master_id (
                id,
                first_name_en,
                last_name_en,
                first_name_th,
                last_name_th,
                birthday,
                tel,
                profile_img
            )
        )
    `)
    .is("deleted_at", null)
    .is("player.deleted_at", null);

    query = query.eq("team_id", teamId);

    const { data, error } = await query;

    if (error) {
        console.error(`[getPlayers] Error fetching players for ${teamId}:`, error);
        return { success: false, error: error.message, data: [] };
    }

    // Map and filter in memory to ensure accuracy
    let mappedPlayers: Player[] = (data || [])
        .map((ps) => {
            const p = ps.player as unknown as {
                id: string;
                display_name: string;
                tel: string | null;
                deleted_at: string | null;
                created_at?: string;
                master_player: {
                    id: string;
                    first_name_en?: string | null;
                    last_name_en?: string | null;
                    first_name_th?: string | null;
                    last_name_th?: string | null;
                    birthday: string | null;
                    tel: string | null;
                    profile_img: string | null;
                } | null;
            } | null;
            const mp = p?.master_player;
            return {
                id: p?.id || ps.id,
                name: p?.display_name || (mp ? (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim() : ''),
                number: ps.shirt_number ? parseInt(ps.shirt_number) : null,
                position: ps.position || null,
                birth_date: mp?.birthday || null,
                photo_url: mp?.profile_img || null,
                team_id: null,
                global_team_id: teamId,
                global_player_id: mp?.id || null,
                tel: p?.tel || mp?.tel || null,
                created_at: p?.created_at || new Date().toISOString(),
                deleted_at: p?.deleted_at || null
            };
        });

    // Auto-clone roster if participation roster is empty
    const part = participation as any;
    if (part && mappedPlayers.length === 0 && part.team_id) {
        const globalTeamId = part.team_id;
        const cloneResult = await importRoster(teamId, globalTeamId);
        
        if (cloneResult.success) {
            // Re-fetch players after successful import
            const freshQuery = await adminSupabase.from("player_sports").select(`
                id,
                position,
                shirt_number,
                team_id,
                sport_id,
                deleted_at,
                player:player_id!inner (
                    id,
                    display_name,
                    tel,
                    created_at,
                    deleted_at,
                    master_player:master_id (
                        id,
                        first_name_en,
                        last_name_en,
                        first_name_th,
                        last_name_th,
                        birthday,
                        tel,
                        profile_img
                    )
                )
            `)
            .is("deleted_at", null)
            .is("player.deleted_at", null)
            .eq("team_id", teamId);

            if (freshQuery.data) {
                mappedPlayers = freshQuery.data.map((ps) => {
                    const p = ps.player as unknown as {
                        id: string;
                        display_name: string;
                        tel: string | null;
                        deleted_at: string | null;
                        created_at?: string;
                        master_player: {
                            id: string;
                            first_name_en?: string | null;
                            last_name_en?: string | null;
                            first_name_th?: string | null;
                            last_name_th?: string | null;
                            birthday: string | null;
                            tel: string | null;
                            profile_img: string | null;
                        } | null;
                    } | null;
                    const mp = p?.master_player;
                    return {
                        id: p?.id || ps.id,
                        name: p?.display_name || (mp ? (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim() : ''),
                        number: ps.shirt_number ? parseInt(ps.shirt_number) : null,
                        position: ps.position || null,
                        birth_date: mp?.birthday || null,
                        photo_url: mp?.profile_img || null,
                        team_id: teamId,
                        global_team_id: null,
                        global_player_id: mp?.id || null,
                        tel: p?.tel || mp?.tel || null,
                        created_at: p?.created_at || new Date().toISOString(),
                        deleted_at: ps.deleted_at || p?.deleted_at || null
                    };
                });
            }
        }
    }

    mappedPlayers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: mappedPlayers };
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
    const tel = formData.get("tel") as string;
    const masterPlayerId = formData.get("master_player_id") as string;
    const photoFile = formData.get("photo") as File;

    if (!name) return { success: false, error: "Name is required" };

    // Validate photo if present
    if (photoFile && photoFile.size > 0) {
        const fileCheck = validateUploadedFile(photoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };
    }

    // Fetch team info
    const { data: participation } = await adminSupabase
        .from("tournament_teams")
        .select(`id, team_id, tournament_category_id`)
        .eq("id", teamId)
        .single();
        
    if (participation) {
        let photoUrl = null;
        if (photoFile && photoFile.size > 0) {
            const fileExt = photoFile.name.split('.').pop() || 'jpg';
            const fileName = `${teamId}/photo_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('players')
                .upload(fileName, photoFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('players')
                    .getPublicUrl(fileName);
                photoUrl = publicUrl;
            } else {
                console.error("[addPlayer] Photo upload failed:", uploadError);
            }
        }

        const { error: insertErr } = await adminSupabase
            .from("tournament_roster_submissions")
            .insert({
                tournament_team_id: teamId,
                name: name,
                shirt_number: number || null,
                position: position || null,
                tel: tel || null,
                photo_url: photoUrl,
                status: 'pending'
            });

        if (insertErr) {
            return { success: false, error: "Failed to add player submission: " + insertErr.message };
        }

        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        return { success: true };
    }

    let globalTeamId = null;
    let sportId = null;
    let tournamentId = null;

    const { data: globalCheck } = await adminSupabase.from("teams").select("id, sport_id").eq("id", teamId).single();
    if (globalCheck) {
        globalTeamId = globalCheck.id;
        sportId = globalCheck.sport_id;
    }

    if (!globalTeamId) {
        return { success: false, error: "Team record not found." };
    }

    // Ensure we have a tournament_id (required by players table in new schema)
    if (!tournamentId) {
        // Fallback 1: Check if the team is in any tournament
        const { data: parts } = await adminSupabase
            .from("tournament_teams")
            .select("id, tournament_category_id")
            .eq("team_id", globalTeamId)
            .limit(1);
        if (parts && parts.length > 0) {
            const part = parts[0];
            if (part.tournament_category_id) {
                const { data: category } = await adminSupabase
                    .from("tournament_categories")
                    .select("tournament_id")
                    .eq("id", part.tournament_category_id)
                    .single();
                if (category) tournamentId = category.tournament_id;
            }
        }
    }

    if (!tournamentId) {
        // Fallback 2: Link to any tournament in the database
        const { data: anyTournament } = await adminSupabase
            .from("tournaments")
            .select("id")
            .limit(1);
        if (anyTournament && anyTournament.length > 0) {
            tournamentId = anyTournament[0].id;
        }
    }

    if (!tournamentId) {
        // Fallback 3: Create a default tournament
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: newTour, error: tourErr } = await adminSupabase
            .from("tournaments")
            .insert({
                organizer_id: user.id,
                sport_id: sportId,
                name: "Default Tournament",
                start_date: todayStr,
                end_date: todayStr,
                status: "draft"
            })
            .select("id")
            .single();
        if (tourErr) {
            console.error("[addPlayer] Failed to create fallback tournament:", tourErr);
        } else if (newTour) {
            tournamentId = newTour.id;
            // Create default category
            await adminSupabase
                .from("tournament_categories")
                .insert({
                    tournament_id: tournamentId,
                    age_category_id: 1,
                    gender_type: 'open',
                    max_teams: 8
                });
        }
    }

    if (!tournamentId) {
        return { success: false, error: "A tournament is required to add players to the roster." };
    }

    // 1. Ensure master player
    let finalMasterId = masterPlayerId;
    if (!finalMasterId) {
        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
        
        let matchedUserId: string | null = null;
        if (tel) {
            const { data: matchedUser } = await adminSupabase
                .from("users")
                .select("id")
                .eq("phone", tel)
                .maybeSingle();
            if (matchedUser) {
                matchedUserId = matchedUser.id;
            }
        }
        
        const { data: newMaster, error: masterErr } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: matchedUserId,
                first_name_en: firstName,
                last_name_en: lastName,
                gender: 'unspecified',
                birthday: '1970-01-01',
                tel: tel || null,
                status: 'active',
                verified: matchedUserId ? true : false
            })
            .select("id")
            .single();
            
        if (masterErr || !newMaster) {
            console.error("[addPlayer] Create master player failed:", masterErr);
            return { success: false, error: "Failed to create master player profile" };
        }
        finalMasterId = newMaster.id;

        // If a photo file is provided, upload it and link to master player
        if (photoFile && photoFile.size > 0) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${finalMasterId}/photo_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('players')
                .upload(fileName, photoFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('players')
                    .getPublicUrl(fileName);
                await adminSupabase
                    .from("master_players")
                    .update({ profile_img: publicUrl })
                    .eq("id", finalMasterId);
            } else {
                console.error("[addPlayer] Photo upload failed:", uploadError);
            }
        }
    }

    // 2. Insert into players
    const playerInsertData = {
        master_id: finalMasterId,
        display_name: name,
        tel: tel || null
    };

    const { data: newPlayer, error: playerError } = await adminSupabase
        .from("players")
        .insert(playerInsertData)
        .select("id")
        .single();

    if (playerError) {
        console.error("[addPlayer] players insert failed:", playerError);
        return { success: false, error: playerError.message };
    }

    // 3. Insert into player_sports (new schema table)
    if (sportId && newPlayer) {
        const { error: psError } = await adminSupabase
            .from("player_sports")
            .insert({
                player_id: newPlayer.id,
                sport_id: sportId,
                team_id: teamId,
                position: position || null,
                shirt_number: number || null
            });
            
        if (psError) {
            // Log but don't fail the whole action if the table doesn't exist yet in the live DB
            console.error("[addPlayer] player_sports insert failed:", psError);
        }
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    return { success: true };
}

/**
 * Add multiple players to a team roster at once.
 */
export async function addPlayersBatch(
    teamId: string,
    playersList: { name: string; number?: string; position?: string; tel?: string; }[]
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    // Fetch team info
    const { data: participation } = await adminSupabase
        .from("tournament_teams")
        .select(`id, team_id, tournament_category_id`)
        .eq("id", teamId)
        .single();
        
    let globalTeamId = null;
    let sportId = null;
    let tournamentId = null;

    if (participation) {
        globalTeamId = participation.team_id;
        if (participation.tournament_category_id) {
            const { data: category } = await adminSupabase
                .from("tournament_categories")
                .select("tournament_id")
                .eq("id", participation.tournament_category_id)
                .single();
            if (category) tournamentId = category.tournament_id;
        }
        
        const { data: teamData } = await adminSupabase.from("teams").select("sport_id").eq("id", globalTeamId).single();
        if (teamData) sportId = teamData.sport_id;
    } else {
        const { data: globalCheck } = await adminSupabase.from("teams").select("id, sport_id").eq("id", teamId).single();
        if (globalCheck) {
            globalTeamId = globalCheck.id;
            sportId = globalCheck.sport_id;
        }
    }

    if (!globalTeamId) {
        return { success: false, error: "Team record not found." };
    }

    // Ensure we have a tournament_id (required by players table in new schema)
    if (!tournamentId) {
        const { data: parts } = await adminSupabase
            .from("tournament_teams")
            .select("id, tournament_category_id")
            .eq("team_id", globalTeamId)
            .limit(1);
        if (parts && parts.length > 0) {
            const part = parts[0];
            if (part.tournament_category_id) {
                const { data: category } = await adminSupabase
                    .from("tournament_categories")
                    .select("tournament_id")
                    .eq("id", part.tournament_category_id)
                    .single();
                if (category) tournamentId = category.tournament_id;
            }
        }
    }

    if (!tournamentId) {
        const { data: anyTournament } = await adminSupabase
            .from("tournaments")
            .select("id")
            .limit(1);
        if (anyTournament && anyTournament.length > 0) {
            tournamentId = anyTournament[0].id;
        }
    }

    if (!tournamentId) {
        return { success: false, error: "A tournament is required to add players to the roster." };
    }

    for (const playerInfo of playersList) {
        const name = playerInfo.name?.trim();
        if (!name) continue;

        const nameParts = name.split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

        let matchedUserId: string | null = null;
        if (playerInfo.tel) {
            const { data: matchedUser } = await adminSupabase
                .from("users")
                .select("id")
                .eq("phone", playerInfo.tel)
                .maybeSingle();
            if (matchedUser) {
                matchedUserId = matchedUser.id;
            }
        }

        // 1. Create master player
        const { data: newMaster, error: masterErr } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: matchedUserId,
                first_name_en: firstName,
                last_name_en: lastName,
                gender: 'unspecified',
                birthday: '1970-01-01',
                tel: playerInfo.tel || null,
                status: 'active',
                verified: matchedUserId ? true : false
            })
            .select("id")
            .single();

        if (masterErr || !newMaster) {
            console.error("[addPlayersBatch] Create master player failed:", masterErr);
            continue;
        }

        // 2. Insert into players
        const { data: newPlayer, error: playerError } = await adminSupabase
            .from("players")
            .insert({
                master_id: newMaster.id,
                display_name: name,
                tel: playerInfo.tel || null
            })
            .select("id")
            .single();

        if (playerError || !newPlayer) {
            console.error("[addPlayersBatch] players insert failed:", playerError);
            continue;
        }

        // 3. Insert into player_sports
        if (sportId) {
            await adminSupabase
                .from("player_sports")
                .insert({
                    player_id: newPlayer.id,
                    sport_id: sportId,
                    team_id: teamId,
                    position: playerInfo.position || null,
                    shirt_number: playerInfo.number || null
                });
        }
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    return { success: true };
}

/**
 * Add multiple players with photos using FormData.
 */
export async function addPlayersBatchForm(
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const teamId = formData.get("teamId") as string;
    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const count = parseInt(formData.get("count") as string || "0");
    if (count === 0) return { success: false, error: "No players provided" };

    // Fetch team info
    const { data: participation } = await adminSupabase
        .from("tournament_teams")
        .select(`id, team_id, tournament_category_id`)
        .eq("id", teamId)
        .single();
        
    if (participation) {
        for (let i = 0; i < count; i++) {
            const name = formData.get(`name_${i}`) as string;
            if (!name || !name.trim()) continue;

            const number = formData.get(`number_${i}`) as string;
            const position = formData.get(`position_${i}`) as string;
            const tel = formData.get(`tel_${i}`) as string;
            const photoFile = formData.get(`photo_${i}`) as File;

            let photoUrl = null;
            if (photoFile && photoFile.size > 0) {
                const fileCheck = validateUploadedFile(photoFile);
                if (fileCheck.valid) {
                    const fileExt = photoFile.name.split('.').pop() || 'jpg';
                    const fileName = `${teamId}/photo_${Date.now()}_${i}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('players')
                        .upload(fileName, photoFile);
                    
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('players')
                            .getPublicUrl(fileName);
                        photoUrl = publicUrl;
                    }
                }
            }

            await adminSupabase
                .from("tournament_roster_submissions")
                .insert({
                    tournament_team_id: teamId,
                    name: name,
                    shirt_number: number || null,
                    position: position || null,
                    tel: tel || null,
                    photo_url: photoUrl,
                    status: 'pending'
                });
        }

        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        return { success: true };
    }

    let globalTeamId = null;
    let sportId = null;
    let tournamentId = null;

    const { data: globalCheck } = await adminSupabase.from("teams").select("id, sport_id").eq("id", teamId).single();
    if (globalCheck) {
        globalTeamId = globalCheck.id;
        sportId = globalCheck.sport_id;
    }

    if (!globalTeamId) {
        return { success: false, error: "Team record not found." };
    }

    // Ensure we have a tournament_id (required by players table in new schema)
    if (!tournamentId) {
        const { data: parts } = await adminSupabase
            .from("tournament_teams")
            .select("id, tournament_category_id")
            .eq("team_id", globalTeamId)
            .limit(1);
        if (parts && parts.length > 0) {
            const part = parts[0];
            if (part.tournament_category_id) {
                const { data: category } = await adminSupabase
                    .from("tournament_categories")
                    .select("tournament_id")
                    .eq("id", part.tournament_category_id)
                    .single();
                if (category) tournamentId = category.tournament_id;
            }
        }
    }

    if (!tournamentId) {
        const { data: anyTournament } = await adminSupabase
            .from("tournaments")
            .select("id")
            .limit(1);
        if (anyTournament && anyTournament.length > 0) {
            tournamentId = anyTournament[0].id;
        }
    }

    if (!tournamentId) {
        return { success: false, error: "A tournament is required to add players to the roster." };
    }

    for (let i = 0; i < count; i++) {
        const name = formData.get(`name_${i}`) as string;
        if (!name || !name.trim()) continue;

        const number = formData.get(`number_${i}`) as string;
        const position = formData.get(`position_${i}`) as string;
        const tel = formData.get(`tel_${i}`) as string;
        const photoFile = formData.get(`photo_${i}`) as File | null;

        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

        let matchedUserId: string | null = null;
        if (tel) {
            const { data: matchedUser } = await adminSupabase
                .from("users")
                .select("id")
                .eq("phone", tel)
                .maybeSingle();
            if (matchedUser) {
                matchedUserId = matchedUser.id;
            }
        }

        // 1. Create master player
        const { data: newMaster, error: masterErr } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: matchedUserId,
                first_name_en: firstName,
                last_name_en: lastName,
                gender: 'unspecified',
                birthday: '1970-01-01',
                tel: tel || null,
                status: 'active',
                verified: matchedUserId ? true : false
            })
            .select("id")
            .single();

        if (masterErr || !newMaster) {
            console.error(`[addPlayersBatchForm] Create master player failed for ${name}:`, masterErr);
            continue;
        }

        const finalMasterId = newMaster.id;

        // Upload photo if present
        if (photoFile && photoFile.size > 0) {
            const fileExt = photoFile.name.split('.').pop() || 'jpg';
            const fileName = `${finalMasterId}/photo_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('players')
                .upload(fileName, photoFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('players')
                    .getPublicUrl(fileName);
                await adminSupabase
                    .from("master_players")
                    .update({ profile_img: publicUrl })
                    .eq("id", finalMasterId);
            } else {
                console.error(`[addPlayersBatchForm] Photo upload failed for ${name}:`, uploadError);
            }
        }

        // 2. Insert into players
        const { data: newPlayer, error: playerError } = await adminSupabase
            .from("players")
            .insert({
                master_id: finalMasterId,
                display_name: name,
                tel: tel || null
            })
            .select("id")
            .single();

        if (playerError || !newPlayer) {
            console.error(`[addPlayersBatchForm] players insert failed for ${name}:`, playerError);
            continue;
        }

        // 3. Insert into player_sports
        if (sportId) {
            await adminSupabase
                .from("player_sports")
                .insert({
                    player_id: newPlayer.id,
                    sport_id: sportId,
                    team_id: teamId,
                    position: position || null,
                    shirt_number: number || null
                });
        }
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    return { success: true };
}

/**
 * Update player information.
 */
export async function updatePlayer(
    playerId: string,
    teamId: string,
    data: { name?: string; number?: number | null; position?: string | null; birth_date?: string | null; photo_url?: string | null; tel?: string | null }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    // 1. Update players
    const playerUpdate: Record<string, unknown> = {};
    if (data.name !== undefined) {
        playerUpdate.display_name = data.name;
    }
    if (data.tel !== undefined) {
        playerUpdate.tel = data.tel;
    }

    const { error: playerErr } = await adminSupabase
        .from("players")
        .update(playerUpdate)
        .eq("id", playerId);

    if (playerErr) {
        return { success: false, error: playerErr.message };
    }

    // 3. Update player_sports
    const psUpdate: Record<string, unknown> = {};
    if (data.position !== undefined) {
        psUpdate.position = data.position;
    }
    if (data.number !== undefined) {
        psUpdate.shirt_number = data.number !== null ? String(data.number) : null;
    }

    if (Object.keys(psUpdate).length > 0) {
        await adminSupabase
            .from("player_sports")
            .update(psUpdate)
            .eq("player_id", playerId);
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
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

    // 1. Try deleting from tournament_roster_submissions first
    const { data: subDeleted, error: subErr } = await adminSupabase
        .from("tournament_roster_submissions")
        .delete()
        .eq("id", playerId)
        .select();

    if (!subErr && subDeleted && subDeleted.length > 0) {
        revalidatePath(`/manager/my-teams/${teamId}`);
        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        return { success: true };
    }

    // 2. Try deleting from tournament_players
    const { data: tpDeleted, error: tpErr } = await adminSupabase
        .from("tournament_players")
        .delete()
        .eq("id", playerId)
        .select();

    if (!tpErr && tpDeleted && tpDeleted.length > 0) {
        revalidatePath(`/manager/my-teams/${teamId}`);
        revalidatePath(`/dashboard/tournament-teams/${teamId}`);
        return { success: true };
    }

    // 3. Fallback: Delete from global players
    const { error } = await adminSupabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
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

    const sourceRes = await getPlayers(sourceTeamId);
    if (!sourceRes.success || !sourceRes.data || sourceRes.data.length === 0) {
        return { success: false, error: sourceRes.error || "Source team has no players to import" };
    }
    const sourcePlayers = sourceRes.data;

    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", targetTeamId).single();
    let globalCheck = null;
    
    if (!participationCheck) {
        const { data: gCheck } = await adminSupabase.from("teams").select("id").eq("id", targetTeamId).single();
        globalCheck = gCheck;
    }

    if (!participationCheck && !globalCheck) {
        return { success: false, error: "Target team not found." };
    }

    if (participationCheck) {
        // Clear existing staged players for this target
        await adminSupabase
            .from("tournament_roster_submissions")
            .delete()
            .eq("tournament_team_id", targetTeamId);

        // Insert into staging table
        const stagedToInsert = sourcePlayers.map(p => ({
            tournament_team_id: targetTeamId,
            name: p.name,
            shirt_number: p.number ? String(p.number) : null,
            position: p.position || null,
            tel: p.tel || null,
            photo_url: p.photo_url || null
        }));

        const { error: stagedError } = await adminSupabase
            .from("tournament_roster_submissions")
            .insert(stagedToInsert);

        if (stagedError) {
            console.error("[importRoster] Staged insert failed:", stagedError);
            return { success: false, error: stagedError.message };
        }

        revalidatePath(`/manager/my-teams/${targetTeamId}`);
        revalidatePath(`/dashboard/tournament-teams/${targetTeamId}`);
        return { success: true, message: `Successfully imported ${sourcePlayers.length} players to staging.` };
    }

    let targetGlobalTeamId = null;
    let targetSportId = null;
    let targetTournamentId = null;

    if (globalCheck) {
        targetGlobalTeamId = globalCheck.id;
        const { data: teamData } = await adminSupabase.from("teams").select("sport_id").eq("id", targetGlobalTeamId).single();
        if (teamData) targetSportId = teamData.sport_id;
    }

    if (!targetTournamentId) {
        const { data: anyTour } = await adminSupabase.from("tournaments").select("id").limit(1).single();
        if (anyTour) {
            targetTournamentId = anyTour.id;
        }
    }

    if (!targetTournamentId) {
        return { success: false, error: "Target tournament context not found." };
    }

    const playersToInsert = sourcePlayers.map(p => ({
        master_id: p.global_player_id,
        display_name: p.name,
        tel: p.tel || null
    }));

    const { data: newPlayers, error: insertError } = await adminSupabase
        .from("players")
        .insert(playersToInsert)
        .select("id, master_id");

    if (insertError) {
        console.error("[importRoster] Bulk insert failed:", insertError);
        return { success: false, error: insertError.message };
    }

    if (newPlayers && newPlayers.length > 0 && targetSportId) {
        const sportsToInsert = newPlayers.map((np, idx) => {
            const sourceP = sourcePlayers[idx];
            return {
                player_id: np.id,
                sport_id: targetSportId,
                team_id: targetTeamId,
                position: sourceP.position || null,
                shirt_number: sourceP.number ? String(sourceP.number) : null
            };
        });

        const { error: sportsError } = await adminSupabase
            .from("player_sports")
            .insert(sportsToInsert);

        if (sportsError) {
            console.error("[importRoster] player_sports bulk insert failed:", sportsError);
        }
    }

    revalidatePath(`/manager/my-teams/${targetTeamId}`);
    revalidatePath(`/dashboard/tournament-teams/${targetTeamId}`);
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

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .eq("team_id", teamId);

    const now = new Date().toISOString();

    // 1. Update player_sports.deleted_at
    const { error: psError } = await adminSupabase
        .from("player_sports")
        .update({ deleted_at: now })
        .eq("team_id", teamId);

    if (psError) return { success: false, error: psError.message };

    // 2. Update players.deleted_at
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r) => r.player_id);
        const { error: pError } = await adminSupabase
            .from("players")
            .update({ deleted_at: now })
            .in("id", playerIds);
        if (pError) return { success: false, error: pError.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    await logActivity('RESET_ROSTER', 'team', teamId, { reset_by: user.id });
    return { success: true };
}

/**
 * Restore all soft-deleted players for a team roster.
 */
export async function restoreRoster(teamId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .eq("team_id", teamId);

    // 1. Update player_sports.deleted_at to null
    const { error: psError } = await adminSupabase
        .from("player_sports")
        .update({ deleted_at: null })
        .eq("team_id", teamId);

    if (psError) return { success: false, error: psError.message };

    // 2. Update players.deleted_at to null
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r) => r.player_id);
        const { error: pError } = await adminSupabase
            .from("players")
            .update({ deleted_at: null })
            .in("id", playerIds);
        if (pError) return { success: false, error: pError.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    revalidatePath(`/dashboard/tournament-teams/${teamId}`);
    await logActivity('RESTORE_ROSTER', 'team', teamId, { restored_by: user.id });
    return { success: true };
}

/**
 * Check if a team has any soft-deleted players.
 */
export async function hasSoftDeletedPlayers(teamId: string): Promise<ActionResponse<boolean>> {
    const supabase = await createClient();

    // Check if there are any records in player_sports where deleted_at IS NOT NULL
    const { count, error } = await supabase
        .from("player_sports")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .not("deleted_at", "is", null);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: (count || 0) > 0 };
}

/**
 * Search global teams by contact email.
 */
export async function getTeamsByEmail(email: string): Promise<ActionResponse<Array<{ id: string; name: string }>>> {
    try {
        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("teams")
            .select("id, name")
            .eq("contact_email", email.trim().toLowerCase())
            .is("deleted_at", null);

        if (error) {
            console.error("Error fetching teams by email:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error("Unexpected error in getTeamsByEmail:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Submit a team management request.
 * Inserts a row into team_management_requests with status='pending'.
 * When approved by the organizer, the team's user_id will be changed to the requester.
 */
export async function submitTeamManagementRequest(
    teamId: string,
    contactPhone: string,
    message?: string
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Check if a pending request already exists for this user + team
        const { data: existing } = await adminSupabase
            .from("team_management_requests")
            .select("id")
            .eq("team_id", teamId)
            .eq("requester_id", user.id)
            .eq("status", "pending")
            .maybeSingle();

        if (existing) {
            return { success: false, error: "คุณมีคำขอที่รอดำเนินการอยู่แล้วสำหรับทีมนี้" };
        }

        const { error } = await adminSupabase
            .from("team_management_requests")
            .insert({
                team_id: teamId,
                requester_id: user.id,
                contact_phone: contactPhone,
                message: message || null,
            });

        if (error) {
            console.error("Error submitting team management request:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error in submitTeamManagementRequest:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

