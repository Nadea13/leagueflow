"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Player } from "@/types/index";

async function isAuthorizedOrganizer(tournamentId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if user is the owner of the tournament
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("organizer_id")
        .eq("id", tournamentId)
        .single();
    
    if (tournament && tournament.organizer_id === userId) return true;

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
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    // Fetch tournament_id to check authorization and team info
    const { data: participation } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            tournament_id,
            team_id,
            teams ( sport_id )
        `)
        .eq("id", teamId)
        .single();
    
    if (!participation) return { success: false, error: "Team not found" };

    const authorized = await isAuthorizedOrganizer(participation.tournament_id, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const position = formData.get("position") as string;
    const birthDate = formData.get("birthDate") as string;

    if (!name) {
        return { success: false, error: "Player name is required" };
    }

    const globalTeamId = participation.team_id;
    const teamsObj = participation.teams as unknown as { sport_id: string } | { sport_id: string }[] | null;
    const teamsList = Array.isArray(teamsObj) ? teamsObj : (teamsObj ? [teamsObj] : []);
    const sportId = teamsList[0]?.sport_id;
    const tournamentId = participation.tournament_id;

    // 1. Ensure master player
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

    const { data: newMaster, error: masterErr } = await adminSupabase
        .from("master_players")
        .insert({
            first_name_en: firstName,
            last_name_en: lastName,
            gender: 'unspecified',
            birthday: birthDate || '1970-01-01',
            status: 'active',
            verified: false
        })
        .select("id")
        .single();

    if (masterErr || !newMaster) {
        console.error("[addPlayer] Create master player failed:", masterErr);
        return { success: false, error: "Failed to create master player profile" };
    }

    // 2. Insert local player profile into players
    const { data: newPlayer, error: playerError } = await adminSupabase
        .from("players")
        .insert({
            master_id: newMaster.id,
            display_name: name,
        })
        .select("id")
        .single();

    if (playerError || !newPlayer) {
        console.error("[addPlayer] Create player failed:", playerError);
        return { success: false, error: "Failed to insert player profile: " + playerError?.message };
    }

    // 3. Link via player_sports
    if (sportId) {
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
            console.error("[addPlayer] Create player_sports record failed:", psError);
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function getPlayers(teamId: string): Promise<{ success: boolean; data?: Player[]; error?: string }> {
    const supabase = await createClient();

    // First, check if teamId matches a tournament_teams (participation)
    const { data: participation } = await supabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            tournament_id,
            roster_status
        `)
        .eq("id", teamId)
        .single();

    if (participation && participation.roster_status !== 'approved') {
        const { data: staged, error: stagedErr } = await supabase
            .from("tournament_roster_submissions")
            .select("*")
            .eq("tournament_team_id", teamId)
            .eq("status", "approved");

        if (stagedErr) {
            console.error("Error fetching staged players:", stagedErr);
            return { success: false, error: "Failed to fetch staged players" };
        }

        const mappedPlayers: Player[] = (staged || []).map((s) => ({
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
            status: s.status,
            created_at: s.created_at,
            deleted_at: null
        }));

        return { success: true, data: mappedPlayers };
    }

    if (participation) {
        const { data, error } = await supabase
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

        if (error) {
            console.error("Error fetching tournament players:", error);
            return { success: false, error: "Failed to fetch tournament players" };
        }

        const mappedPlayers: Player[] = (data || []).map((tp) => {
            const tpObj = tp as unknown as {
                id: string;
                position: string | null;
                shirt_number: string | null;
                tournament_team_id: string;
                player: {
                    id: string;
                    first_name_en: string | null;
                    last_name_en: string | null;
                    first_name_th: string | null;
                    last_name_th: string | null;
                    birthday: string | null;
                    tel: string | null;
                    profile_img: string | null;
                    created_at: string;
                    deleted_at: string | null;
                } | null;
            };
            const mp = tpObj.player;
            return {
                id: tpObj.id,
                name: (mp ? (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim() : ''),
                number: tpObj.shirt_number ? parseInt(tpObj.shirt_number) : null,
                position: tpObj.position || null,
                birth_date: mp?.birthday || null,
                photo_url: mp?.profile_img || null,
                team_id: teamId,
                global_team_id: null,
                global_player_id: mp?.id || null,
                tel: mp?.tel || null,
                created_at: mp?.created_at || new Date().toISOString(),
                deleted_at: mp?.deleted_at || null
            };
        });

        return { success: true, data: mappedPlayers };
    }

    let query = supabase.from("player_sports").select(`
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
        console.error("Error fetching players:", error);
        return { success: false, error: "Failed to fetch players" };
    }

    // Map and filter in memory to ensure accuracy
    const mappedPlayers: Player[] = (data || []).map((ps) => {
        const psObj = ps as unknown as {
            id: string;
            shirt_number: string | null;
            position: string | null;
            deleted_at?: string | null;
            player?: {
                id: string;
                display_name: string;
                tel?: string | null;
                created_at: string;
                deleted_at?: string | null;
                master_player?: {
                    id: string;
                    first_name_en?: string | null;
                    last_name_en?: string | null;
                    first_name_th?: string | null;
                    last_name_th?: string | null;
                    birthday?: string | null;
                    profile_img?: string | null;
                    tel?: string | null;
                } | null;
            } | null;
        };
        const p = psObj.player;
        const mp = p?.master_player;
        return {
            id: p?.id || psObj.id,
            name: p?.display_name || (mp ? (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim() : ''),
            number: psObj.shirt_number ? parseInt(psObj.shirt_number) : null,
            position: psObj.position || null,
            birth_date: mp?.birthday || null,
            photo_url: mp?.profile_img || null,
            team_id: null,
            global_team_id: teamId,
            global_player_id: mp?.id || null,
            tel: p?.tel || mp?.tel || null,
            created_at: p?.created_at || new Date().toISOString(),
            deleted_at: psObj.deleted_at || p?.deleted_at || null
        };
    });

    mappedPlayers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: mappedPlayers };
}

export async function getTournamentPlayersDirect(teamId: string): Promise<{ success: boolean; data?: Player[]; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
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

    if (error) {
        console.error("Error fetching tournament players direct:", error);
        return { success: false, error: "Failed to fetch tournament players" };
    }

    const mappedPlayers: Player[] = (data || []).map((tp) => {
        const tpObj = tp as unknown as {
            id: string;
            position: string | null;
            shirt_number: string | null;
            tournament_team_id: string;
            player: {
                id: string;
                first_name_en: string | null;
                last_name_en: string | null;
                first_name_th: string | null;
                last_name_th: string | null;
                birthday: string | null;
                tel: string | null;
                profile_img: string | null;
                created_at: string;
                deleted_at: string | null;
            } | null;
        };
        const mp = tpObj.player;
        return {
            id: tpObj.id,
            name: (mp ? (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim() : ''),
            number: tpObj.shirt_number ? parseInt(tpObj.shirt_number) : null,
            position: tpObj.position || null,
            birth_date: mp?.birthday || null,
            photo_url: mp?.profile_img || null,
            team_id: teamId,
            global_team_id: null,
            global_player_id: mp?.id || null,
            tel: mp?.tel || null,
            created_at: mp?.created_at || new Date().toISOString(),
            deleted_at: mp?.deleted_at || null
        };
    });

    return { success: true, data: mappedPlayers };
}

export async function deletePlayer(playerId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    // Get the player_sports record to identify team context
    const { data: psRecords } = await supabase
        .from("player_sports")
        .select("team_id")
        .eq("player_id", playerId);
        
    if (!psRecords || psRecords.length === 0) return { success: false, error: "Player team context not found" };
    const globalTeamId = psRecords[0].team_id;

    // Find the tournament team registered in a tournament that this user has admin/editor access to
    const { data: tournamentTeams } = await supabase
        .from("tournament_teams")
        .select("tournament_id")
        .eq("team_id", globalTeamId);
        
    let authorized = false;
    let tournamentId = null;
    if (tournamentTeams && tournamentTeams.length > 0) {
        for (const tt of tournamentTeams) {
            const isAuth = await isAuthorizedOrganizer(tt.tournament_id, user.id);
            if (isAuth) {
                authorized = true;
                tournamentId = tt.tournament_id;
                break;
            }
        }
    }

    if (!authorized || !tournamentId) return { success: false, error: "Unauthorized to manage this roster" };

    const { error } = await adminSupabase
        .from("players")
        .delete()
        .eq("id", playerId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
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

    // Get the player_sports record to identify team context
    const { data: psRecords } = await supabase
        .from("player_sports")
        .select("team_id")
        .eq("player_id", playerId);
        
    if (!psRecords || psRecords.length === 0) return { success: false, error: "Player team context not found" };
    const globalTeamId = psRecords[0].team_id;

    // Find the tournament team registered in a tournament that this user has admin/editor access to
    const { data: tournamentTeams } = await supabase
        .from("tournament_teams")
        .select("tournament_id")
        .eq("team_id", globalTeamId);
        
    let authorized = false;
    let tournamentId = null;
    if (tournamentTeams && tournamentTeams.length > 0) {
        for (const tt of tournamentTeams) {
            const isAuth = await isAuthorizedOrganizer(tt.tournament_id, user.id);
            if (isAuth) {
                authorized = true;
                tournamentId = tt.tournament_id;
                break;
            }
        }
    }

    if (!authorized || !tournamentId) return { success: false, error: "Unauthorized to manage this roster" };

    // 1. Update players table
    const playerUpdate: Record<string, string> = {};
    if (data.name !== undefined) {
        playerUpdate.display_name = data.name;
    }

    if (Object.keys(playerUpdate).length > 0) {
        const { error: playerErr } = await adminSupabase
            .from("players")
            .update(playerUpdate)
            .eq("id", playerId);

        if (playerErr) {
            return { success: false, error: playerErr.message };
        }
    }

    // 2. Update player_sports table
    const psUpdate: Record<string, string | null> = {};
    if (data.position !== undefined) {
        psUpdate.position = data.position;
    }
    if (data.number !== undefined) {
        psUpdate.shirt_number = data.number !== null ? String(data.number) : null;
    }

    if (Object.keys(psUpdate).length > 0) {
        const { error: psErr } = await adminSupabase
            .from("player_sports")
            .update(psUpdate)
            .eq("player_id", playerId);

        if (psErr) {
            return { success: false, error: psErr.message };
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}
