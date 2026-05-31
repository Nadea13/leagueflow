"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ActionResponse, GlobalPlayer } from "@/types/index";
import { deleteFileFromUrl } from "@/lib/supabase/storage";
import { validateUploadedFile } from "@/lib/file-validation";

async function isAuthorizedForPlayer(playerId: string, userId: string) {
    const supabase = await createClient();
    
    const { data: ps } = await supabase
        .from("player_sports")
        .select("team_id")
        .eq("player_id", playerId)
        .limit(1);
    
    if (!ps || ps.length === 0) return false;
    const teamId = ps[0].team_id;

    // Check global team ownership
    const { data: globalTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("user_id", userId)
        .single();
    
    if (globalTeam) return true;

    // Check tournament team ownership/management
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
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_id")
                .eq("id", tournamentId)
                .single();
            
            if (tournament && tournament.organizer_id === userId) return true;

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

async function isAuthorizedForGlobalPlayer(globalPlayerId: string, userId: string) {
    const adminSupabase = createAdminClient();
    
    // 1. Check if user is the direct owner of the master player profile
    const { data: gp } = await adminSupabase
        .from("master_players")
        .select("user_id")
        .eq("id", globalPlayerId)
        .single();
    
    if (gp && gp.user_id === userId) return true;
    
    // 2. Find local player profiles associated with this master player
    const { data: localPlayers } = await adminSupabase
        .from("players")
        .select("id")
        .eq("master_id", globalPlayerId);

    if (!localPlayers || localPlayers.length === 0) return false;
    const localPlayerIds = localPlayers.map(lp => lp.id);

    // 3. Find the teams these local players are registered in
    const { data: sports } = await adminSupabase
        .from("player_sports")
        .select("team_id")
        .in("player_id", localPlayerIds);

    if (!sports || sports.length === 0) return false;
    const teamIds = sports.map(s => s.team_id).filter(Boolean) as string[];

    // 4. Check if current user is the team manager of any of these teams
    const { data: ownedTeams } = await adminSupabase
        .from("teams")
        .select("id")
        .eq("user_id", userId)
        .in("id", teamIds);
    
    if (ownedTeams && ownedTeams.length > 0) return true;

    // 5. Check if current user is an organizer or authorized staff member of a tournament hosting any of these teams
    const { data: tournamentTeams } = await adminSupabase
        .from("tournament_teams")
        .select("tournament_category_id")
        .in("team_id", teamIds);

    if (tournamentTeams && tournamentTeams.length > 0) {
        const categoryIds = tournamentTeams.map(tt => tt.tournament_category_id).filter(Boolean) as string[];
        
        const { data: categories } = await adminSupabase
            .from("tournament_categories")
            .select("tournament_id")
            .in("id", categoryIds);

        if (categories && categories.length > 0) {
            const tournamentIds = categories.map(c => c.tournament_id).filter(Boolean) as string[];

            // Check if user is the tournament owner/organizer
            const { data: tournaments } = await adminSupabase
                .from("tournaments")
                .select("id")
                .eq("organizer_id", userId)
                .in("id", tournamentIds);

            if (tournaments && tournaments.length > 0) return true;

            // Check if user is an accepted co-organizer or staff member of the tournament
            const { data: memberships } = await adminSupabase
                .from("tournament_invitations")
                .select("tournament_id")
                .eq("user_id", userId)
                .eq("status", "accepted")
                .in("role", ["co_organizer", "staff"])
                .is("deleted_at", null)
                .in("tournament_id", tournamentIds);

            if (memberships && memberships.length > 0) return true;
        }
    }

    return false;
}

export async function getGlobalPlayers(
    page: number = 1,
    pageSize: number = 10,
    search: string = ""
): Promise<ActionResponse<{ players: GlobalPlayer[]; totalCount: number }>> {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from("master_players")
        .select("*", { count: "exact" });

    if (search) {
        const term = search.trim();
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
    }

    const { data, error, count } = await query
        .order("first_name", { ascending: true })
        .range(from, to);

    if (error) {
        return { success: false, error: error.message };
    }

    const mapped: GlobalPlayer[] = (data || []).map((mp) => ({
        id: mp.id,
        name: `${mp.first_name} ${mp.last_name}`.trim(),
        photo_url: mp.profile_img,
        id_card_url: mp.id_card_url,
        date_of_birth: mp.birthday,
        athlete_types: [], 
        created_by: mp.user_id,
        created_at: mp.created_at
    }));

    return {
        success: true,
        data: {
            players: mapped,
            totalCount: count || 0,
        },
    };
}

export async function searchGlobalPlayers(query: string): Promise<ActionResponse<GlobalPlayer[]>> {
    const supabase = await createClient();

    let dbQuery = supabase
        .from("master_players")
        .select("*");

    if (query && query.trim().length > 0) {
        const term = query.trim();
        dbQuery = dbQuery.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
    }

    const { data, error } = await dbQuery
        .order("first_name", { ascending: true })
        .limit(20);

    if (error) {
        return { success: false, error: error.message };
    }

    const mapped: GlobalPlayer[] = (data || []).map((mp) => ({
        id: mp.id,
        name: `${mp.first_name} ${mp.last_name}`.trim(),
        photo_url: mp.profile_img,
        id_card_url: mp.id_card_url,
        date_of_birth: mp.birthday,
        athlete_types: [], 
        created_by: mp.user_id,
        created_at: mp.created_at
    }));

    return { success: true, data: mapped };
}

export async function createGlobalPlayer(
    name: string,
    photoUrl?: string | null,
    dateOfBirth?: string | null,
): Promise<ActionResponse<GlobalPlayer>> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

    const { data, error } = await adminSupabase
        .from("master_players")
        .insert({
            user_id: user.id,
            first_name: firstName,
            last_name: lastName,
            profile_img: photoUrl || null,
            birthday: dateOfBirth || '1970-01-01',
            gender: 'unspecified',
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    const mp = data;
    const mapped: GlobalPlayer = {
        id: mp.id,
        name: `${mp.first_name} ${mp.last_name}`.trim(),
        photo_url: mp.profile_img,
        id_card_url: mp.id_card_url,
        date_of_birth: mp.birthday,
        athlete_types: [], 
        created_by: mp.user_id,
        created_at: mp.created_at
    };

    return { success: true, data: mapped };
}

export async function updateGlobalPlayerInfo(
    globalPlayerId: string,
    data: { 
        name?: string; 
        date_of_birth?: string | null;
        first_name?: string;
        last_name?: string;
        gender?: string;
        tel?: string | null;
        profile_img?: string | null;
    }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForGlobalPlayer(globalPlayerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to update this global player" };

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) {
        const nameParts = data.name.trim().split(" ");
        updateData.first_name = nameParts[0];
        updateData.last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
    }
    if (data.first_name !== undefined) {
        updateData.first_name = data.first_name;
    }
    if (data.last_name !== undefined) {
        updateData.last_name = data.last_name;
    }
    if (data.date_of_birth !== undefined) {
        updateData.birthday = data.date_of_birth || '1970-01-01';
    }
    if (data.gender !== undefined) {
        updateData.gender = data.gender;
    }
    if (data.tel !== undefined) {
        updateData.tel = data.tel;
    }
    if (data.profile_img !== undefined) {
        updateData.profile_img = data.profile_img;
        
        // If updating profile_img to null (removed), delete old file
        if (data.profile_img === null) {
            const { data: existingPlayer } = await adminSupabase
                .from("master_players")
                .select("profile_img")
                .eq("id", globalPlayerId)
                .single();
            
            if (existingPlayer?.profile_img) {
                await deleteFileFromUrl(existingPlayer.profile_img, 'player-photos');
            }
        }
    }

    const { error } = await adminSupabase
        .from("master_players")
        .update(updateData)
        .eq("id", globalPlayerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function updateGlobalPlayerAthleteTypes(): Promise<ActionResponse> {
    // Stubbed out for the new schema since master_players does not have athlete_types.
    return { success: true };
}

export async function linkPlayerToGlobal(
    playerId: string,
    globalPlayerId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForPlayer(playerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to link this player" };

    const { error } = await adminSupabase
        .from("players")
        .update({ master_id: globalPlayerId })
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function unlinkPlayerFromGlobal(playerId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForPlayer(playerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to unlink this player" };

    const { error } = await adminSupabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function getGlobalPlayer(globalPlayerId: string): Promise<ActionResponse<GlobalPlayer>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("master_players")
        .select("*")
        .eq("id", globalPlayerId)
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    const mp = data;
    const mapped: GlobalPlayer = {
        id: mp.id,
        name: `${mp.first_name} ${mp.last_name}`.trim(),
        photo_url: mp.profile_img,
        id_card_url: mp.id_card_url,
        date_of_birth: mp.birthday,
        athlete_types: [], 
        created_by: mp.user_id,
        created_at: mp.created_at
    };

    return { success: true, data: mapped };
}

export async function getPlayerTournamentHistory(globalPlayerId: string): Promise<ActionResponse<unknown[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("players")
        .select(`
            id,
            display_name,
            tel,
            player_sports (
                id,
                position,
                shirt_number,
                team_id,
                tournament_teams:team_id (
                    id,
                    tournament_category_id,
                    tournament_categories (
                        tournaments (
                            id,
                            name,
                            format,
                            status
                        )
                    )
                )
            )
        `)
        .eq("master_id", globalPlayerId)
        .order("created_at", { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    const mappedData = (data || []).map((p) => {
        const ps = p.player_sports?.[0];
        const tt = ps?.tournament_teams?.[0];
        const tournament = tt?.tournament_categories?.tournaments;
        return {
            id: p.id,
            name: p.display_name,
            number: ps?.shirt_number ? parseInt(ps.shirt_number) : null,
            position: ps?.position || null,
            team_id: ps?.team_id || null,
            tournament_teams: tt ? {
                id: tt.id,
                name: tt.name,
                logo_url: tt.logo_url,
                tournament_id: tournament?.id || null,
                tournaments: tournament || null
            } : null
        };
    });

    return { success: true, data: mappedData };
}

export async function updateGlobalPlayerIdCard(
    globalPlayerId: string,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForGlobalPlayer(globalPlayerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to update this global player" };

    const file = formData.get("id_card") as File;

    if (!file) return { success: false, error: "No file provided" };

    const fileCheck = validateUploadedFile(file);
    if (!fileCheck.valid) return { success: false, error: fileCheck.error };

    const fileExt = file.name.split('.').pop();
    const fileName = `${globalPlayerId}/id_card_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('player-docs')
        .upload(fileName, file);

    if (uploadError) {
        console.error("[updateGlobalPlayerIdCard] Upload error:", uploadError);
        return { 
            success: false, 
            error: `Upload failed: ${uploadError.message}` 
        };
    }

    const { data: { publicUrl } } = supabase.storage
        .from('player-docs')
        .getPublicUrl(fileName);

    const { data: existingPlayer } = await adminSupabase
        .from("master_players")
        .select("id_card_url")
        .eq("id", globalPlayerId)
        .single();
    
    if (existingPlayer?.id_card_url) {
        await deleteFileFromUrl(existingPlayer.id_card_url, 'player-docs');
    }

    const { error: updateError } = await adminSupabase
        .from("master_players")
        .update({ id_card_url: publicUrl })
        .eq("id", globalPlayerId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    return { success: true };
}

export async function updateGlobalPlayerPhoto(
    globalPlayerId: string,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForGlobalPlayer(globalPlayerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to update this global player" };

    const file = formData.get("photo") as File;

    if (!file) return { success: false, error: "No file provided" };

    const fileCheck = validateUploadedFile(file);
    if (!fileCheck.valid) return { success: false, error: fileCheck.error };

    const fileExt = file.name.split('.').pop();
    const fileName = `${globalPlayerId}/photo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, file);

    if (uploadError) {
        console.error("[updateGlobalPlayerPhoto] Upload error:", uploadError);
        return { 
            success: false, 
            error: `Upload failed: ${uploadError.message}` 
        };
    }

    const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName);

    const { data: existingPlayer } = await adminSupabase
        .from("master_players")
        .select("profile_img")
        .eq("id", globalPlayerId)
        .single();
    
    if (existingPlayer?.profile_img) {
        await deleteFileFromUrl(existingPlayer.profile_img, 'player-photos');
    }

    const { error: updateError } = await adminSupabase
        .from("master_players")
        .update({ profile_img: publicUrl })
        .eq("id", globalPlayerId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    return { success: true };
}

export async function deleteGlobalPlayer(globalPlayerId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForGlobalPlayer(globalPlayerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to delete this global player" };

    const { data: player } = await adminSupabase
        .from("master_players")
        .select("profile_img, id_card_url")
        .eq("id", globalPlayerId)
        .single();
    
    if (player) {
        if (player.profile_img) {
            await deleteFileFromUrl(player.profile_img, 'player-photos');
        }
        if (player.id_card_url) {
            await deleteFileFromUrl(player.id_card_url, 'player-docs');
        }
    }

    const { error } = await adminSupabase
        .from("master_players")
        .delete()
        .eq("id", globalPlayerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
