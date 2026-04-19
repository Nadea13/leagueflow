"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ActionResponse, GlobalPlayer } from "@/types/index";
import { deleteFileFromUrl } from "@/lib/supabase/storage";
import { validateUploadedFile } from "@/lib/file-validation";

async function isAuthorizedForPlayer(playerId: string, userId: string) {
    const supabase = await createClient();
    
    const { data: player } = await supabase
        .from("players")
        .select("team_id, global_team_id")
        .eq("id", playerId)
        .single();
    
    if (!player) return false;

    const teamId = player.team_id || player.global_team_id;
    if (!teamId) return false;

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
        .select("user_id, tournament_id")
        .eq("id", teamId)
        .single();
    
    if (participation) {
        if (participation.user_id === userId) return true;

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

async function isAuthorizedForGlobalPlayer(globalPlayerId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if user created this global player
    const { data: gp } = await supabase
        .from("global_players")
        .select("created_by")
        .eq("id", globalPlayerId)
        .single();
    
    if (gp && gp.created_by === userId) return true;

    // Check if user is an organizer of ANY tournament where this player is participating
    const { data: participations } = await supabase
        .from("players")
        .select("team_id, tournament_teams!inner(tournament_id)")
        .eq("global_player_id", globalPlayerId);
    
    if (participations) {
        for (const p of participations as unknown as Array<{ team_id: string | null; tournament_teams: { tournament_id: string } | null }>) {
            const tournamentId = p.tournament_teams?.tournament_id;
            if (tournamentId) {
                // Check if user is organizer
                const { data: tournament } = await supabase
                    .from("tournaments")
                    .select("user_id")
                    .eq("id", tournamentId)
                    .single();
                
                if (tournament && tournament.user_id === userId) return true;

                const { data: membership } = await supabase
                    .from("tournament_members")
                    .select("role")
                    .eq("tournament_id", tournamentId)
                    .eq("user_id", userId)
                    .eq("status", "accepted")
                    .in("role", ["admin", "editor"])
                    .single();
                
                if (membership) return true;
            }
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
        .from("global_players")
        .select("*", { count: "exact" });

    if (search) {
        query = query.ilike("name", `%${search}%`);
    }

    const { data, error, count } = await query
        .order("name", { ascending: true })
        .range(from, to);

    if (error) {
        return { success: false, error: error.message };
    }

    return {
        success: true,
        data: {
            players: (data as GlobalPlayer[]) || [],
            totalCount: count || 0,
        },
    };
}

export async function searchGlobalPlayers(query: string): Promise<ActionResponse<GlobalPlayer[]>> {
    const supabase = await createClient();

    let dbQuery = supabase
        .from("global_players")
        .select("*");

    if (query && query.trim().length > 0) {
        dbQuery = dbQuery.ilike("name", `%${query.trim()}%`);
    }

    const { data, error } = await dbQuery
        .order("name", { ascending: true })
        .limit(20);

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
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data, error } = await adminSupabase
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
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForPlayer(playerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to link this player" };

    const { error } = await adminSupabase
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
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForPlayer(playerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to unlink this player" };

    const { error } = await adminSupabase
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

export async function getPlayerTournamentHistory(globalPlayerId: string): Promise<ActionResponse<unknown[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("players")
        .select(`
            id,
            name,
            number,
            position,
            team_id,
            tournament_teams (
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

    // Cleanup old ID card if exists
    const { data: existingPlayer } = await adminSupabase
        .from("global_players")
        .select("id_card_url")
        .eq("id", globalPlayerId)
        .single();
    
    if (existingPlayer?.id_card_url) {
        await deleteFileFromUrl(existingPlayer.id_card_url, 'player-docs');
    }

    const { error: updateError } = await adminSupabase
        .from("global_players")
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

    // Cleanup old photo if exists
    const { data: existingPlayer } = await adminSupabase
        .from("global_players")
        .select("photo_url")
        .eq("id", globalPlayerId)
        .single();
    
    if (existingPlayer?.photo_url) {
        await deleteFileFromUrl(existingPlayer.photo_url, 'player-photos');
    }

    const { error: updateError } = await adminSupabase
        .from("global_players")
        .update({ photo_url: publicUrl })
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

    // Fetch photo and ID card URLs for cleanup
    const { data: player } = await adminSupabase
        .from("global_players")
        .select("photo_url, id_card_url")
        .eq("id", globalPlayerId)
        .single();
    
    if (player) {
        if (player.photo_url) {
            await deleteFileFromUrl(player.photo_url, 'player-photos');
        }
        if (player.id_card_url) {
            await deleteFileFromUrl(player.id_card_url, 'player-docs');
        }
    }

    const { error } = await adminSupabase
        .from("global_players")
        .delete()
        .eq("id", globalPlayerId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
