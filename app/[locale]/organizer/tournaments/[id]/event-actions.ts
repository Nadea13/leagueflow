"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, MatchEvent } from "@/types";
import { addGoal, deleteGoal, updateMatchScore } from "./actions";

export async function getMatchEvents(matchId: string): Promise<ActionResponse<MatchEvent[]>> {
    const supabase = await createClient();

    // We want to fetch events and ideally join with players to get names
    // But supabase simple client might not do deep joins easily without defined relationships
    // For now we fetch raw events and we'll map names on client or simple join
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

    // Map player details to flat structure if needed, or keep as is
    const events = data.map((event: any) => ({
        ...event,
        player_name: event.players?.name || "Unknown"
    }));

    return { success: true, data: events };
}

export async function addMatchEvent(
    matchId: string,
    teamId: string,
    eventType: string,
    minute: number,
    playerId: string | null,
    extraInfo: any = null,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Create the Event
    // --- Implementation: Defensive ID Resolution ---
    // Some matches might have been generated with 'team_id' (global) instead of 'tournament_team_id' (participation).
    // match_events.team_id REFERENCES tournament_teams(id).
    
    let effectiveTeamId = teamId;
    let eventData = null;
    let { data: initialData, error } = await supabase
        .from("match_events")
        .insert({
            match_id: matchId,
            team_id: effectiveTeamId,
            event_type: eventType,
            minute: minute,
            player_id: playerId || null,
            extra_info: extraInfo || {},
            created_at: new Date().toISOString(),
        })
        .select()
        .single();

    eventData = initialData;

    // --- Database Healing & Admin Retry ---
    const adminSupabase = createAdminClient();
    
    if (error?.code === '23503' || error?.code === '23502') {
        // Fetch source of truth for match and team context
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
            error: error.message + " (Hint: Your database schema might be outdated. Please run the provided SQL repair script.)" 
        };
    }

    // 2. Sync with Goals table if it's a goal
    if (eventType === 'goal') {
        // We need the player name for the old goals table
        let playerName = "Unknown";
        if (playerId) {
            const { data: playerData } = await supabase
                .from("players")
                .select("name")
                .eq("id", playerId)
                .single();
            if (playerData) playerName = playerData.name;
        }

        // Call the legacy addGoal to keep Top Scorers working
        // We pass the new event ID in a way we can track it? 
        // Or we just let them be loosely coupled. 
        // For simplicity, we just add it. The delete logic will be tricky.
        // IMPROVEMENT: We store the 'goal_id' in the match_event's extra_info

        const goalRes = await addGoal(matchId, teamId, playerName, tournamentId, minute);

        if (goalRes.success && goalRes.data) {
            // Update the event with the linked goal_id
            await supabase
                .from("match_events")
                .update({ extra_info: { ...extraInfo, linked_goal_id: goalRes.data.id } })
                .eq("id", eventData.id);
        }
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, data: eventData };
}

export async function deleteMatchEvent(eventId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Get the event first to check for linked stuff
    const { data: event, error: fetchError } = await supabase
        .from("match_events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (fetchError || !event) {
        return { success: false, error: "Event not found" };
    }

    // 2. If it's a goal and has a linked_goal_id, delete that too
    if (event.event_type === 'goal' && event.extra_info?.linked_goal_id) {
        await deleteGoal(event.extra_info.linked_goal_id, tournamentId);
    }

    // 3. Delete the event
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
