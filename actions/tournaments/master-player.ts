"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth-server";
import { ActionResponse, GlobalPlayer } from "@/types/index";
import { deleteFileFromUrl } from "@/lib/supabase/storage";
import { validateUploadedFile } from "@/lib/file-validation";
import { uploadToR2 } from "@/lib/r2";
import { resolveStorageUrl } from "@/lib/storage-utils";
import { classifyPlayerNames } from "@/lib/name-helper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';


async function isAuthorizedForPlayer(playerId: string, userId: string): Promise<boolean> {
    const adminSupabase = createAdminClient();
    
    // 0. Check if system admin
    const { data: userProfile } = await adminSupabase
        .from("users")
        .select("role, is_organizer")
        .eq("id", userId)
        .single();
    if (userProfile?.role === "admin" || userProfile?.role === "super_admin") return true;

    // 1. Check player -> master_player -> user_id
    const { data: playerRec } = await adminSupabase
        .from("players")
        .select("master_id, master_players(user_id)")
        .eq("id", playerId)
        .single();
    
    if (playerRec) {
        const mpUserId = (playerRec.master_players as unknown as { user_id?: string } | null)?.user_id;
        if (mpUserId === userId) return true;
    }

    const { data: ps } = await adminSupabase
        .from("player_sports")
        .select("team_id")
        .eq("player_id", playerId);
    
    if (!ps || ps.length === 0) return true;
    const teamIds = ps.map((p) => p.team_id).filter(Boolean) as string[];

    // 2. Check global team ownership
    const { data: globalTeams } = await adminSupabase
        .from("teams")
        .select("id")
        .in("id", teamIds)
        .eq("user_id", userId);
    
    if (globalTeams && globalTeams.length > 0) return true;

    // 3. Check tournament team ownership/management
    const { data: participations } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            teams ( user_id ),
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .or(`id.in.(${teamIds.join(',')}),team_id.in.(${teamIds.join(',')})`);
    
    if (participations && participations.length > 0) {
        for (const participation of participations) {
            const teamOwnerId = (participation.teams as unknown as { user_id?: string } | null)?.user_id;
            if (teamOwnerId === userId) return true;

            const tournamentId = (participation.tournament_categories as unknown as { tournament_id?: string } | null)?.tournament_id;
            if (tournamentId) {
                const { data: tournament } = await adminSupabase
                    .from("tournaments")
                    .select("organizer_id")
                    .eq("id", tournamentId)
                    .single();
                
                if (tournament && tournament.organizer_id === userId) return true;

                const { data: membership } = await adminSupabase
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
    }

    return false;
}

async function isAuthorizedForGlobalPlayer(globalPlayerId: string, userId: string): Promise<boolean> {
    const adminSupabase = createAdminClient();
    
    // 0. Check if super admin
    const { data: userProfile } = await adminSupabase
        .from("users")
        .select("role, is_organizer")
        .eq("id", userId)
        .single();
    if (userProfile?.role === "admin" || userProfile?.role === "super_admin") return true;

    // 1. Check if user is the direct owner of the master player profile
    const { data: gp } = await adminSupabase
        .from("master_players")
        .select("user_id")
        .eq("id", globalPlayerId)
        .single();
    
    if (gp && gp.user_id === userId) return true;
    if (gp && !gp.user_id) return true; // If master player profile was created without direct user_id link
    
    // 2. Find local player profiles associated with this master player
    const { data: localPlayers } = await adminSupabase
        .from("players")
        .select("id")
        .eq("master_id", globalPlayerId);

    const localPlayerIds = (localPlayers || []).map((lp) => lp.id);
    const allPlayerIds = Array.from(new Set([...localPlayerIds, globalPlayerId]));

    // 3. Find the teams these local players are registered in
    const { data: sports } = await adminSupabase
        .from("player_sports")
        .select("team_id")
        .in("player_id", allPlayerIds);

    if (!sports || sports.length === 0) {
        return true;
    }
    const teamIds = sports.map((s) => s.team_id).filter(Boolean) as string[];

    // 4. Check if current user is the team manager of any of these teams
    const { data: ownedTeams } = await adminSupabase
        .from("teams")
        .select("id")
        .eq("user_id", userId)
        .in("id", teamIds);
    
    if (ownedTeams && ownedTeams.length > 0) return true;

    // 5. Check if current user is an owner or organizer/staff in tournament_teams
    const { data: tournamentTeams } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            teams ( user_id ),
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .or(`id.in.(${teamIds.join(',')}),team_id.in.(${teamIds.join(',')})`);

    if (tournamentTeams && tournamentTeams.length > 0) {
        for (const tt of tournamentTeams) {
            const teamOwnerId = (tt.teams as unknown as { user_id?: string } | null)?.user_id;
            if (teamOwnerId === userId) return true;

            const tournamentId = (tt.tournament_categories as unknown as { tournament_id?: string } | null)?.tournament_id;
            if (tournamentId) {
                const { data: tournament } = await adminSupabase
                    .from("tournaments")
                    .select("organizer_id")
                    .eq("id", tournamentId)
                    .single();
                
                if (tournament && tournament.organizer_id === userId) return true;

                const { data: membership } = await adminSupabase
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
    }

    // 6. Check tournament_roster_submissions
    const { data: rosterSubs } = await adminSupabase
        .from("tournament_roster_submissions")
        .select(`
            id,
            tournament_team_id,
            tournament_teams (
                id,
                team_id,
                teams ( user_id ),
                tournament_category_id,
                tournament_categories ( tournament_id )
            )
        `)
        .eq("master_player_id", globalPlayerId);

    if (rosterSubs && rosterSubs.length > 0) {
        for (const sub of rosterSubs) {
            const tt = sub.tournament_teams as unknown as {
                team_id?: string;
                teams?: { user_id?: string };
                tournament_categories?: { tournament_id?: string };
            } | null;

            if (tt?.teams?.user_id === userId) return true;
            const tournamentId = tt?.tournament_categories?.tournament_id;
            if (tournamentId) {
                const { data: tournament } = await adminSupabase
                    .from("tournaments")
                    .select("organizer_id")
                    .eq("id", tournamentId)
                    .single();
                if (tournament && tournament.organizer_id === userId) return true;
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
        .from("master_players")
        .select("*", { count: "exact" });

    if (search) {
        const term = search.trim();
        query = query.or(`first_name_local.ilike.%${term}%,last_name_local.ilike.%${term}%,first_name_intl.ilike.%${term}%,last_name_intl.ilike.%${term}%,nickname.ilike.%${term}%`);
    }

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        return { success: false, error: error.message };
    }

    const mapped: GlobalPlayer[] = (data || []).map((mp) => {
        const rawName = mp.name || (mp.first_name_local ? `${mp.first_name_local} ${mp.last_name_local || ''}` : `${mp.first_name_intl || ''} ${mp.last_name_intl || ''}`).trim();
        return {
            id: mp.id,
            name: rawName || 'Unnamed Player',
            first_name_local: mp.first_name_local,
            middle_name_local: mp.middle_name_local,
            last_name_local: mp.last_name_local,
            first_name_intl: mp.first_name_intl,
            middle_name_intl: mp.middle_name_intl,
            last_name_intl: mp.last_name_intl,
            photo_url: resolveStorageUrl(mp.photo_url || null),
            id_card_url: resolveStorageUrl(mp.id_card_url || null),
            date_of_birth: mp.birthday,
            birthday: mp.birthday,
            athlete_types: [], 
            created_by: mp.user_id,
            created_at: mp.created_at
        };
    });

    return {
        success: true,
        data: {
            players: mapped,
            totalCount: count || 0,
        },
    };
}

export async function createGlobalPlayer(
    name: string,
    photoUrl?: string | null,
    idCardUrl?: string | null,
    dateOfBirth?: string | null,
    _athleteTypes: string[] = []
): Promise<ActionResponse<GlobalPlayer>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    const classified = classifyPlayerNames({ name });

    const { data, error } = await supabase
        .from("master_players")
        .insert({
            user_id: user.id,
            first_name_local: classified.first_name_local,
            middle_name_local: classified.middle_name_local,
            last_name_local: classified.last_name_local,
            first_name_intl: classified.first_name_intl,
            middle_name_intl: classified.middle_name_intl,
            last_name_intl: classified.last_name_intl,
            photo_url: photoUrl || null,
            id_card_url: idCardUrl || null,
            birthday: dateOfBirth || null,
            gender: 'unspecified',
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    const mp = data;
    const rawName = mp.name || (mp.first_name_local ? `${mp.first_name_local} ${mp.last_name_local || ''}` : `${mp.first_name_intl || ''} ${mp.last_name_intl || ''}`).trim();
    const mapped: GlobalPlayer = {
        id: mp.id,
        name: rawName || 'Unnamed Player',
        first_name_local: mp.first_name_local,
        middle_name_local: mp.middle_name_local,
        last_name_local: mp.last_name_local,
        first_name_intl: mp.first_name_intl,
        middle_name_intl: mp.middle_name_intl,
        last_name_intl: mp.last_name_intl,
        photo_url: resolveStorageUrl(mp.photo_url || null),
        id_card_url: resolveStorageUrl(mp.id_card_url || null),
        date_of_birth: mp.birthday,
        birthday: mp.birthday,
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
        first_name_local?: string;
        middle_name_local?: string;
        last_name_local?: string;
        first_name_intl?: string;
        middle_name_intl?: string;
        last_name_intl?: string;
        first_name_en?: string;
        middle_name_en?: string;
        last_name_en?: string;
        first_name_th?: string;
        middle_name_th?: string;
        last_name_th?: string;
        gender?: string;
        tel?: string | null;
        photo_url?: string | null;
        profile_img?: string | null;
        favorite_sport_id?: string | null;
        preferred_hand?: string | null;
        preferred_foot?: string | null;
    }
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const authorized = await isAuthorizedForGlobalPlayer(globalPlayerId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to update this global player" };

    const classified = classifyPlayerNames({
        name: data.name,
        first_name: data.first_name,
        last_name: data.last_name,
        first_name_local: data.first_name_local || data.first_name_th,
        middle_name_local: data.middle_name_local || data.middle_name_th,
        last_name_local: data.last_name_local || data.last_name_th,
        first_name_intl: data.first_name_intl || data.first_name_en,
        middle_name_intl: data.middle_name_intl || data.middle_name_en,
        last_name_intl: data.last_name_intl || data.last_name_en,
    });

    const updateData: Record<string, unknown> = {};
    if (classified.first_name_local !== null) updateData.first_name_local = classified.first_name_local;
    if (classified.middle_name_local !== null) updateData.middle_name_local = classified.middle_name_local;
    if (classified.last_name_local !== null) updateData.last_name_local = classified.last_name_local;
    if (classified.first_name_intl !== null) updateData.first_name_intl = classified.first_name_intl;
    if (classified.middle_name_intl !== null) updateData.middle_name_intl = classified.middle_name_intl;
    if (classified.last_name_intl !== null) updateData.last_name_intl = classified.last_name_intl;

    if (data.date_of_birth !== undefined) {
        updateData.birthday = data.date_of_birth || null;
    }
    if (data.gender !== undefined) {
        updateData.gender = data.gender;
    }
    if (data.tel !== undefined) {
        updateData.tel = data.tel;
    }
    if (data.favorite_sport_id !== undefined) {
        updateData.favorite_sport_id = data.favorite_sport_id ? parseInt(data.favorite_sport_id) : null;
    }
    if (data.preferred_hand !== undefined) {
        updateData.preferred_hand = data.preferred_hand;
    }
    if (data.preferred_foot !== undefined) {
        updateData.preferred_foot = data.preferred_foot;
    }
    const newPhotoUrl = data.photo_url !== undefined ? data.photo_url : data.profile_img;
    if (newPhotoUrl !== undefined) {
        updateData.photo_url = newPhotoUrl;
        
        // If updating photo_url to null (removed), delete old file
        if (newPhotoUrl === null) {
            const { data: existingPlayer } = await adminSupabase
                .from("master_players")
                .select("photo_url")
                .eq("id", globalPlayerId)
                .single();
            
            if (existingPlayer?.photo_url) {
                await deleteFileFromUrl(existingPlayer.photo_url, 'players');
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

    // Sync to players table
    const playerSync: Record<string, unknown> = {};
    const syncFirst = updateData.first_name_intl || updateData.first_name_local;
    const syncLast = updateData.last_name_intl || updateData.last_name_local;
    if (syncFirst) {
        playerSync.first_name = syncFirst as string;
    }
    if (syncLast) {
        playerSync.last_name = syncLast as string;
    }
    if (data.name) {
        playerSync.name = data.name.trim();
    }
    if (updateData.birthday) {
        playerSync.birth_date = updateData.birthday;
        playerSync.date_of_birth = updateData.birthday;
    }
    if (updateData.tel !== undefined) {
        playerSync.tel = updateData.tel;
    }
    if (updateData.photo_url !== undefined) {
        playerSync.photo_url = updateData.photo_url;
    }

    if (Object.keys(playerSync).length > 0) {
        await adminSupabase
            .from("players")
            .update(playerSync)
            .or(`id.eq.${globalPlayerId},master_id.eq.${globalPlayerId}`);

        await adminSupabase
            .from("tournament_players")
            .update(playerSync)
            .or(`id.eq.${globalPlayerId},master_player_id.eq.${globalPlayerId}`);
    }

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

export async function updateGlobalPlayerPhoto(
    globalPlayerId: string,
    formData: FormData
): Promise<ActionResponse<{ url: string }>> {
    const session = await getServerSession().catch(() => null);
    if (!session?.user) return { success: false, error: "Authentication required" };

    const file = formData.get("photo") as File;
    if (!file) return { success: false, error: "No file provided" };

    const fileCheck = validateUploadedFile(file);
    if (!fileCheck.valid) return { success: false, error: fileCheck.error };

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `players/${globalPlayerId}/photo_${Date.now()}.${fileExt}`;

    const uploadRes = await uploadToR2(file, fileName, file.type);
    if (!uploadRes.success || !uploadRes.url) {
        console.error("[updateGlobalPlayerPhoto] Upload error:", uploadRes.error);
        return { 
            success: false, 
            error: `Upload failed: ${uploadRes.error || "Unknown error"}` 
        };
    }

    const publicUrl = uploadRes.url;

    // Call Go API to update master player photo if valid UUID
    try {
        await fetch(`${API_BASE_URL}/master-players/${globalPlayerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                photo_url: publicUrl,
            }),
        });
    } catch (err) {
        console.warn("[updateGlobalPlayerPhoto] PUT master-players failed:", err);
    }

    return { success: true, data: { url: publicUrl } };
}
