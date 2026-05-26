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
        .from("tournament_invitations")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .eq("status", "accepted")
        .in("role", ["co_organizer", "staff"])
        .is("deleted_at", null)
        .maybeSingle();
    
    if (membership) return true;

    return false;
}

export async function addPlayer(
    teamId: string,
    _prevState: ActionResponse,
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
            team_id,
            teams ( sport_id ),
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .eq("id", teamId)
        .single();
    
    if (!participation) return { success: false, error: "Team not found" };

    const tournamentId = (participation.tournament_categories as any)?.tournament_id;
    if (!tournamentId) return { success: false, error: "Tournament context not found" };

    const authorized = await isAuthorizedOrganizer(tournamentId, user.id);
    if (!authorized) return { success: false, error: "Unauthorized to manage this roster" };

    const name = formData.get("name") as string;
    const number = formData.get("number") as string;
    const position = formData.get("position") as string;
    const birthDate = formData.get("birth_date") as string;
    const globalPlayerId = formData.get("global_player_id") as string;
    const tel = formData.get("tel") as string;

    if (!name) {
        return { success: false, error: "Player name is required" };
    }

    const globalTeamId = participation.team_id;
    const sportId = (participation.teams as any)?.sport_id;

    // 1. Ensure master player
    let finalMasterId = globalPlayerId;
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
                birthday: birthDate || '1970-01-01',
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
    }

    // 2. Insert local player profile into players
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

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function getPlayers(teamId: string): Promise<{ success: boolean; data?: Player[]; error?: string }> {
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
        query = query.eq("team_id", participation.team_id);
    } else {
        query = query.eq("team_id", teamId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching players:", error);
        return { success: false, error: "Failed to fetch players" };
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
        .select(`
            id,
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .eq("team_id", globalTeamId);
        
    let authorized = false;
    let tournamentId = null;
    if (tournamentTeams && tournamentTeams.length > 0) {
        for (const tt of tournamentTeams) {
            const tId = (tt.tournament_categories as any)?.tournament_id;
            if (tId) {
                const isAuth = await isAuthorizedOrganizer(tId, user.id);
                if (isAuth) {
                    authorized = true;
                    tournamentId = tId;
                    break;
                }
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

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updatePlayer(
    playerId: string,
    data: { name?: string; number?: number | null; position?: string | null; birth_date?: string | null; photo_url?: string | null; tel?: string | null }
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
        .select(`
            id,
            tournament_category_id,
            tournament_categories ( tournament_id )
        `)
        .eq("team_id", globalTeamId);
        
    let authorized = false;
    let tournamentId = null;
    if (tournamentTeams && tournamentTeams.length > 0) {
        for (const tt of tournamentTeams) {
            const tId = (tt.tournament_categories as any)?.tournament_id;
            if (tId) {
                const isAuth = await isAuthorizedOrganizer(tId, user.id);
                if (isAuth) {
                    authorized = true;
                    tournamentId = tId;
                    break;
                }
            }
        }
    }

    if (!authorized || !tournamentId) return { success: false, error: "Unauthorized to manage this roster" };

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

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
