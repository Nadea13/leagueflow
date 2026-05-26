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
        const teamOwnerId = (participation.teams as any)?.user_id;
        if (teamOwnerId === userId) return true;

        const tournamentId = (participation.tournament_categories as any)?.tournament_id;
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
            await logActivity('CREATE_TEAM', 'team', insertedTeam.id, { name, sport_id: sportId });
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
        const mappedData = (data || []).map((team: any) => {
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
                tournament_categories (
                    tournaments ( * )
                )
            `)
            .eq("id", teamId)
            .is("deleted_at", null)
            .single();

        if (participation) {
            const flatTournament = (participation.tournament_categories as any)?.tournaments;
            data = {
                ...participation,
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
        
        participations = (pData || []).map((p: any) => ({
            ...p,
            tournament: p.tournament_categories?.tournaments
        }));
    } else {
        participations = [data];
    }

    // Fetch Registration Status
    const { data: userTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("user_id", user.id);
    
    const ownedTeamIds = userTeams?.map((t: any) => t.id) || [];
    
    let registrations: any[] = [];
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
            registrations = regData.map((r: any) => ({
                tournament_team_id: r.id,
                payment_status: (r.payment_status || 'pending').toUpperCase(),
                slip_url: r.slip_img,
                tournament_id: r.tournament_categories?.tournament_id
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

        // Detect which table to update
        const { data: globalTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("id", teamId)
            .eq("user_id", user.id)
            .maybeSingle();

        const tableName = globalTeam ? "teams" : "tournament_teams";

        let updateData: any = {};
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
                const playerIds = psRecords.map((r: any) => r.player_id);
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
                const playerIds = psRecords.map((r: any) => r.player_id);
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
            tournament_categories ( tournament_id )
        `)
        .eq("id", teamId)
        .single();

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
            deleted_at,
            master_player:master_id (
                id,
                first_name,
                last_name,
                birthday,
                tel,
                profile_img
            )
        )
    `)
    .is("deleted_at", null)
    .is("player.deleted_at", null);

    if (participation) {
        const globalTeamId = participation.team_id;
        query = query.eq("team_id", globalTeamId);
    } else {
        query = query.eq("team_id", teamId);
    }

    const { data, error } = await query;

    if (error) {
        console.error(`[getPlayers] Error fetching players for ${teamId}:`, error);
        return { success: false, error: error.message, data: [] };
    }

    // Map and filter in memory to ensure accuracy
    const mappedPlayers: Player[] = (data || [])
        .map((ps: any) => {
            const p = ps.player;
            const mp = p?.master_player;
            return {
                id: p?.id || ps.id,
                name: p?.display_name || (mp ? `${mp.first_name} ${mp.last_name}` : ''),
                number: ps.shirt_number ? parseInt(ps.shirt_number) : null,
                position: ps.position || null,
                birth_date: mp?.birthday || null,
                photo_url: mp?.profile_img || null,
                team_id: participation ? teamId : null,
                global_team_id: participation ? null : teamId,
                global_player_id: mp?.id || null,
                tel: p?.tel || mp?.tel || null,
                created_at: p?.created_at || new Date().toISOString(),
                deleted_at: ps.deleted_at || p?.deleted_at || null
            } as any;
        });

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
                first_name: firstName,
                last_name: lastName,
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
                .from('player-photos')
                .upload(fileName, photoFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('player-photos')
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
                team_id: globalTeamId,
                position: position || null,
                shirt_number: number || null
            });
            
        if (psError) {
            // Log but don't fail the whole action if the table doesn't exist yet in the live DB
            console.error("[addPlayer] player_sports insert failed:", psError);
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
    data: { name?: string; number?: number | null; position?: string | null; birth_date?: string | null; photo_url?: string | null; tel?: string | null }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForTeam(teamId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    // 1. Update players
    const playerUpdate: any = {};
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
    const psUpdate: any = {};
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

    let targetGlobalTeamId = null;
    let targetSportId = null;
    let targetTournamentId = null;

    if (participationCheck) {
        const { data: part } = await adminSupabase
            .from("tournament_teams")
            .select(`
                team_id,
                tournament_category_id,
                tournament_categories ( tournament_id )
            `)
            .eq("id", targetTeamId)
            .single();
        if (part) {
            targetGlobalTeamId = part.team_id;
            targetTournamentId = (part.tournament_categories as any)?.tournament_id;
            const { data: teamData } = await adminSupabase.from("teams").select("sport_id").eq("id", targetGlobalTeamId).single();
            if (teamData) targetSportId = teamData.sport_id;
        }
    } else if (globalCheck) {
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
                team_id: targetGlobalTeamId,
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

    // Fetch globalTeamId from teamId (could be participation ID or global team ID)
    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();
    let globalTeamId = teamId;
    if (participationCheck) {
        const { data: part } = await adminSupabase.from("tournament_teams").select("team_id").eq("id", teamId).single();
        if (part) globalTeamId = part.team_id;
    }

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .eq("team_id", globalTeamId);

    const now = new Date().toISOString();

    // 1. Update player_sports.deleted_at
    const { error: psError } = await adminSupabase
        .from("player_sports")
        .update({ deleted_at: now })
        .eq("team_id", globalTeamId);

    if (psError) return { success: false, error: psError.message };

    // 2. Update players.deleted_at
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r: any) => r.player_id);
        const { error: pError } = await adminSupabase
            .from("players")
            .update({ deleted_at: now })
            .in("id", playerIds);
        if (pError) return { success: false, error: pError.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
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

    // Fetch globalTeamId from teamId (could be participation ID or global team ID)
    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();
    let globalTeamId = teamId;
    if (participationCheck) {
        const { data: part } = await adminSupabase.from("tournament_teams").select("team_id").eq("id", teamId).single();
        if (part) globalTeamId = part.team_id;
    }

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .eq("team_id", globalTeamId);

    // 1. Update player_sports.deleted_at to null
    const { error: psError } = await adminSupabase
        .from("player_sports")
        .update({ deleted_at: null })
        .eq("team_id", globalTeamId);

    if (psError) return { success: false, error: psError.message };

    // 2. Update players.deleted_at to null
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r: any) => r.player_id);
        const { error: pError } = await adminSupabase
            .from("players")
            .update({ deleted_at: null })
            .in("id", playerIds);
        if (pError) return { success: false, error: pError.message };
    }

    revalidatePath(`/manager/my-teams/${teamId}`);
    await logActivity('RESTORE_ROSTER', 'team', teamId, { restored_by: user.id });
    return { success: true };
}

/**
 * Check if a team has any soft-deleted players.
 */
export async function hasSoftDeletedPlayers(teamId: string): Promise<ActionResponse<boolean>> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Fetch globalTeamId from teamId (could be participation ID or global team ID)
    const { data: participationCheck } = await adminSupabase.from("tournament_teams").select("id").eq("id", teamId).single();
    let globalTeamId = teamId;
    if (participationCheck) {
        const { data: part } = await adminSupabase.from("tournament_teams").select("team_id").eq("id", teamId).single();
        if (part) globalTeamId = part.team_id;
    }

    // Check if there are any records in player_sports where deleted_at IS NOT NULL
    const { count, error } = await supabase
        .from("player_sports")
        .select("*", { count: "exact", head: true })
        .eq("team_id", globalTeamId)
        .not("deleted_at", "is", null);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: (count || 0) > 0 };
}

