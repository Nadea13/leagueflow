"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, MatchEvent } from "@/types";
import { validateTournamentAccess } from "@/lib/security";

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
                display_name
            )
        `)
        .eq("match_id", matchId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching events:", error);
        return { success: false, error: error.message };
    }

    // Map player details to flat structure if needed, or keep as is
    const events = data.map((event: MatchEvent & { players?: { display_name?: string } | null }) => ({
        ...event,
        player_name: event.players?.display_name || "Unknown"
    }));

    return { success: true, data: events };
}

export async function addMatchEvent(
    matchId: string,
    teamId: string | null,
    eventType: string,
    minute: number,
    playerId: string | null,
    extraInfo: Record<string, unknown> | null = null,
    tournamentId: string
): Promise<ActionResponse<MatchEvent>> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Create the Event
    // --- Implementation: Defensive ID Resolution ---
    // Some matches might have been generated with 'team_id' (global) instead of 'tournament_team_id' (participation).
    // match_events.team_id REFERENCES tournament_teams(id).
    
    const isValidUuid = (id: string | null): boolean => {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    };

    const resolvedPlayerId = isValidUuid(playerId) ? playerId : null;
    const effectiveTeamId = isValidUuid(teamId) ? teamId : null;
    let eventData = null;
    const { data: initialData, error: initialError } = await supabase
        .from("match_events")
        .insert({
            match_id: matchId,
            team_id: effectiveTeamId,
            event_type: eventType,
            minute: minute,
            player_id: resolvedPlayerId,
            extra_info: extraInfo || {},
            created_at: new Date().toISOString(),
        })
        .select()
        .single();
    
    let error = initialError;

    eventData = initialData;

    // --- Database Healing & Admin Retry ---
    const adminSupabase = createAdminClient();
    
    if (teamId && (error?.code === '23503' || error?.code === '23502')) {
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
                    team_id: isValidUuid(candidate) ? candidate : null,
                    event_type: eventType,
                    minute: minute,
                    player_id: resolvedPlayerId,
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

    // 2. Sync score if it's a goal
    if (eventType === 'goal') {
        // --- Live Score Sync ---
        // Fetch all goals for this match to get the definitive score
        const { data: goalEvents } = await supabase
            .from("match_events")
            .select("team_id")
            .eq("match_id", matchId)
            .eq("event_type", "goal");

        if (goalEvents) {
            // We need to know which team is home/away to update correctly
            const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id").eq("id", matchId).single();
            if (match) {
                const home_score = goalEvents.filter(e => e.team_id === match.home_team_id).length;
                const away_score = goalEvents.filter(e => e.team_id === match.away_team_id).length;
                await supabase.from("matches").update({ home_score, away_score }).eq("id", matchId);
            }
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true, data: eventData };
}

export async function deleteMatchEvent(eventId: string, tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

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

    const isGoal = event.event_type === 'goal';
    const matchId = event.match_id;

    // 3. Delete the event
    const { error } = await supabase
        .from("match_events")
        .delete()
        .eq("id", eventId);

    if (error) {
        return { success: false, error: error.message };
    }

    // --- Live Score Sync (On Delete) ---
    if (isGoal) {
        const { data: goalEvents } = await supabase
            .from("match_events")
            .select("team_id")
            .eq("match_id", matchId)
            .eq("event_type", "goal");

        const { data: match } = await supabase.from("matches").select("home_team_id, away_team_id").eq("id", matchId).single();
        
        if (match) {
            const home_score = goalEvents?.filter(e => e.team_id === match.home_team_id).length || 0;
            const away_score = goalEvents?.filter(e => e.team_id === match.away_team_id).length || 0;
            await supabase.from("matches").update({ home_score, away_score }).eq("id", matchId);
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}
