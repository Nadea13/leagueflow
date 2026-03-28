import { useState, useEffect } from "react";
import { MatchEvent, EventType } from "@/types";
import { addMatchEvent, deleteMatchEvent, getMatchEvents } from "@/app/[locale]/organizer/tournaments/[id]/event-actions";
import { createClient } from "@/utils/supabase/client";

export function useMatchEvents(matchId: string, tournamentId: string, initialData?: MatchEvent[], isReadOnly?: boolean) {
    const [events, setEvents] = useState<MatchEvent[]>(initialData || []);
    const [isLoading, setIsLoading] = useState(!initialData); // If initialData exists, not loading

    // Load events on mount (only if no initial data or to sync?)
    // If we want to support Realtime, we should probably fetch to be sure, or rely on realtime subscription separately (which we don't have for events yet, only matches table).
    // Actually, we don't have realtime for events table in this code. `LiveMatchConsole` subscribes to `matches` table changes.
    // So fetching on mount is the only way to get updates if we don't have `initialData` or if it's stale.
    // But for Public View, `initialData` comes from Server Component so it's fresh.
    // And client fetch will likely fail.

    useEffect(() => {
        const supabase = createClient();

        // Client-side fetch using browser Supabase (works for unauthenticated public users)
        const fetchEventsClient = async () => {
            const { data, error } = await supabase
                .from('match_events')
                .select(`*, players(name, number)`)
                .eq('match_id', matchId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map((e: any) => ({
                    ...e,
                    player_name: e.players?.name || e.player_name || "Unknown",
                    players: undefined
                }));
                setEvents(mapped);
            }
            return data;
        };

        // Load on mount
        const loadEvents = async () => {
            if (!initialData) setIsLoading(true);
            if (isReadOnly) {
                // Public view: use client-side query (no auth issues)
                await fetchEventsClient();
            } else {
                // Admin view: use server action (has proper auth context)
                const res = await getMatchEvents(matchId);
                if (res.success && res.data) setEvents(res.data);
            }
            setIsLoading(false);
        };

        loadEvents();
        
        // --- Realtime Subscription ---
        const channel = supabase
            .channel(`match-events-${matchId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'match_events', 
                filter: `match_id=eq.${matchId}` 
            }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newEvent = payload.new as MatchEvent;
                    // Immediately add to state for instant UI update
                    setEvents((prev: MatchEvent[]) => {
                        if (prev.some((e: MatchEvent) => e.id === newEvent.id)) return prev;
                        return [newEvent, ...prev].sort((a: MatchEvent, b: MatchEvent) => {
                            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        });
                    });
                    // Re-fetch with joins for complete data
                    if (isReadOnly) {
                        await fetchEventsClient();
                    } else {
                        const res = await getMatchEvents(matchId);
                        if (res.success && res.data) setEvents(res.data);
                    }
                } else if (payload.eventType === 'DELETE') {
                    setEvents((prev: MatchEvent[]) => prev.filter((e: MatchEvent) => e.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    if (isReadOnly) {
                        await fetchEventsClient();
                    } else {
                        loadEvents();
                    }
                }
            })
            .subscribe();

        // Polling fallback for public/read-only views (uses client-side Supabase)
        let pollInterval: NodeJS.Timeout | null = null;
        if (isReadOnly) {
            pollInterval = setInterval(() => {
                fetchEventsClient();
            }, 5000);
        }

        return () => {
            supabase.removeChannel(channel);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [matchId, isReadOnly]);

    const addEvent = async (
        teamId: string,
        type: EventType,
        minute: number,
        playerId: string | null = null,
        extraInfo: any = {},
        playerName: string = "Unknown"
    ) => {
        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const newEvent: MatchEvent = {
            id: tempId,
            match_id: matchId,
            team_id: teamId,
            event_type: type,
            minute: minute,
            player_id: playerId,
            extra_info: extraInfo,
            created_at: new Date().toISOString(),
            player_name: playerName
        };

        setEvents(prev => [newEvent, ...prev].sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }));

        // Server Action
        // Note: The original code handled optimistic binding of ID via state update or re-fetch.
        // Ideally we update the ID after success.
        const res = await addMatchEvent(matchId, teamId, type, minute, playerId, extraInfo, tournamentId);

        if (res.success && res.data) {
            const realId = res.data.id;
            setEvents(prev => {
                // If realId already exists (added via realtime INSERT), remove tempId
                if (prev.some(e => e.id === realId)) {
                    return prev.filter(e => e.id !== tempId);
                }
                // Else replace tempId with realId
                return prev.map(e => e.id === tempId ? { ...e, id: realId } : e);
            });
            return { success: true };
        } else {
            // Revert on failure
            setEvents(prev => prev.filter(e => e.id !== tempId));
            return { success: false, error: res.error };
        }
    };

    const deleteEvent = async (eventId: string) => {
        const backup = [...events];
        setEvents(prev => prev.filter(e => e.id !== eventId));

        const res = await deleteMatchEvent(eventId, tournamentId);
        if (!res.success) {
            setEvents(backup);
            return { success: false, error: res.error };
        }
        return { success: true };
    };

    return {
        events,
        setEvents, // Exposed for manual updates if needed (e.g. Realtime push)
        addEvent,
        deleteEvent,
        isLoading
    };
}
