"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, MatchEvent } from "@/types";
import { addGoal, deleteGoal, updateMatchScore } from "./general";
import { validateTournamentAccess } from "@/lib/security";

export async function getMatchEvents(matchId: string): Promise<ActionResponse<MatchEvent[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("match_events")
        .select(`
            *,
            players (
                name,
                number
            )
        `)
        .eq("match_id", matchId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching events:", error);
        return { success: false, error: error.message };
    }

    const events = (data || []).map((event: any) => ({
        ...event,
        player_name: event.players?.name || "Unknown"
    }));

    return { success: true, data: events as MatchEvent[] };
}

export async function addMatchEvent(
    matchId: string,
    teamId: string | null,
    eventType: string,
    minute: number,
    playerId: string | null,
    extraInfo: any = null,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    let eventData = null;
    let { data: initialData, error } = await supabase
        .from("match_events")
        .insert({
            match_id: matchId,
            team_id: teamId,
            event_type: eventType,
            minute: minute,
            player_id: playerId || null,
            extra_info: extraInfo || {},
            created_at: new Date().toISOString(),
        })
        .select()
        .single();

    eventData = initialData;

    // Database Healing & Admin Retry
    const adminSupabase = createAdminClient();
    
    if (teamId && (error?.code === '23503' || error?.code === '23502')) {
        const { data: mTruth } = await adminSupabase.from("matches").select("*").eq("id", matchId).single();
        const { data: tTruth } = await adminSupabase.from("tournament_teams").select("*").eq("id", teamId).single();
        
        const candidates = new Set<string>();
        candidates.add(teamId);
        if (tTruth?.team_id) candidates.add(tTruth.team_id);
        if (mTruth?.home_team_id) candidates.add(mTruth.home_team_id);
        if (mTruth?.away_team_id) candidates.add(mTruth.away_team_id);

        for (const candidate of candidates) {
            const retry = await adminSupabase
                .from("match_events")
                .insert({
                    match_id: matchId,
                    team_id: candidate,
                    event_type: eventType,
                    minute: minute,
                    player_id: playerId || null,
                    extra_info: extraInfo || {},
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();
            
            if (!retry.error) {
                error = null;
                eventData = retry.data;
                break;
            } else {
                error = retry.error;
            }
        }
    }

    if (error) {
        console.error("[addMatchEvent] Final error:", error);
        return { 
            success: false, 
            error: error.message + " (Hint: Your database schema might be outdated.)" 
        };
    }

    // Sync with Goals table if it's a goal
    if (eventType === 'goal') {
        let playerName = "Unknown";
        if (playerId) {
            const { data: playerData } = await supabase
                .from("players")
                .select("name")
                .eq("id", playerId)
                .single();
            if (playerData) playerName = playerData.name;
        }

        const goalRes = await addGoal(matchId, teamId as string, playerName, tournamentId, minute);

        if (goalRes.success && goalRes.data) {
            await supabase
                .from("match_events")
                .update({ extra_info: { ...extraInfo, linked_goal_id: (goalRes.data as any).id } })
                .eq("id", eventData.id);
        }
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, data: eventData };
}

export async function deleteMatchEvent(eventId: string, tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: event, error: fetchError } = await supabase
        .from("match_events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (fetchError || !event) {
        return { success: false, error: "Event not found" };
    }

    if (event.event_type === 'goal' && event.extra_info?.linked_goal_id) {
        await deleteGoal(event.extra_info.linked_goal_id, tournamentId);
    }

    const { error } = await supabase
        .from("match_events")
        .delete()
        .eq("id", eventId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
