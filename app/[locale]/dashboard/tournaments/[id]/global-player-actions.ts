"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ActionResponse, GlobalPlayer } from "@/types/index";
import { deleteFileFromUrl } from "@/lib/supabase/storage";
import { validateUploadedFile } from "@/lib/file-validation";

async function isAuthorizedForPlayer(playerId: string, userId: string) {
    const supabase = await createClient();
    
    const { data: psRecords } = await supabase
        .from("player_sports")
        .select("team_id")
        .eq("player_id", playerId);
        
    if (!psRecords || psRecords.length === 0) return false;

    for (const ps of psRecords) {
        const teamId = ps.team_id;
        if (!teamId) continue;

        // Check global team ownership
        const { data: globalTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("id", teamId)
            .eq("user_id", userId)
            .single();
        
        if (globalTeam) return true;

        // Check tournament team ownership/management
        const { data: participations } = await supabase
            .from("tournament_teams")
            .select("user_id, tournament_id")
            .eq("team_id", teamId);
        
        if (participations) {
            for (const participation of participations) {
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
        }
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
    const { data: playerProfiles } = await supabase
        .from("players")
        .select("id")
        .eq("master_id", globalPlayerId);
    
    if (playerProfiles && playerProfiles.length > 0) {
        const playerIds = playerProfiles.map(p => p.id);
        const { data: psData } = await supabase
            .from("player_sports")
            .select("team_id")
            .in("player_id", playerIds);
            
        if (psData && psData.length > 0) {
            const teamIds = psData.map(ps => ps.team_id).filter(Boolean);
            const { data: tournamentTeams } = await supabase
                .from("tournament_teams")
                .select("tournament_id")
                .in("team_id", teamIds);
                
            if (tournamentTeams && tournamentTeams.length > 0) {
                for (const tt of tournamentTeams) {
                    const tournamentId = tt.tournament_id;
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

    const { data: profiles, error: profileErr } = await supabase
        .from("players")
        .select("id, display_name, created_at")
        .eq("master_id", globalPlayerId);

    if (profileErr) return { success: false, error: profileErr.message };
    if (!profiles || profiles.length === 0) return { success: true, data: [] };

    const playerIds = profiles.map(p => p.id);
    const { data: psData, error: psErr } = await supabase
        .from("player_sports")
        .select(`
            position,
            shirt_number,
            team_id,
            player_id
        `)
        .in("player_id", playerIds);

    if (psErr) return { success: false, error: psErr.message };
    if (!psData || psData.length === 0) return { success: true, data: [] };

    const teamIds = psData.map(ps => ps.team_id).filter(Boolean);
    const { data: ttData, error: ttErr } = await supabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            name,
            logo_url,
            tournament_id,
            tournaments (
                id,
                name,
                format,
                status
            )
        `)
        .in("team_id", teamIds);

    if (ttErr) return { success: false, error: ttErr.message };

    const mapped = psData.map((ps: any) => {
        const profile = profiles.find(p => p.id === ps.player_id);
        const tt = ttData?.find(t => t.team_id === ps.team_id);
        if (!tt) return null;
        return {
            id: ps.player_id,
            name: profile?.display_name || "",
            number: ps.shirt_number ? parseInt(ps.shirt_number) : null,
            position: ps.position || null,
            team_id: tt.id,
            created_at: profile?.created_at,
            tournament_teams: {
                id: tt.id,
                name: tt.name,
                logo_url: tt.logo_url,
                tournament_id: tt.tournament_id,
                tournaments: tt.tournaments
            }
        };
    }).filter(Boolean);

    return { success: true, data: mapped };
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
