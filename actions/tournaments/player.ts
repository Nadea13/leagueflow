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
        .map((ps) => {
            const p = ps.player as unknown as {
                id: string;
                display_name: string;
                tel: string | null;
                deleted_at: string | null;
                master_player: {
                    id: string;
                    first_name: string;
                    last_name: string;
                    birthday: string | null;
                    tel: string | null;
                    profile_img: string | null;
                } | null;
            } | null;
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
                created_at: new Date().toISOString(),
                deleted_at: ps.deleted_at || p?.deleted_at || null
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
            const tId = (tt.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id;
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
