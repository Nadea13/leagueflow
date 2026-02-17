import { useState, useEffect } from "react";
import { MatchEvent, EventType } from "@/types";
import { addMatchEvent, deleteMatchEvent, getMatchEvents } from "@/app/[locale]/dashboard/tournaments/[id]/event-actions";

export function useMatchEvents(matchId: string, tournamentId: string, initialData?: MatchEvent[]) {
    const [events, setEvents] = useState<MatchEvent[]>(initialData || []);
    const [isLoading, setIsLoading] = useState(!initialData); // If initialData exists, not loading

    // Load events on mount (only if no initial data or to sync?)
    // If we want to support Realtime, we should probably fetch to be sure, or rely on realtime subscription separately (which we don't have for events yet, only matches table).
    // Actually, we don't have realtime for events table in this code. `LiveMatchConsole` subscribes to `matches` table changes.
    // So fetching on mount is the only way to get updates if we don't have `initialData` or if it's stale.
    // But for Public View, `initialData` comes from Server Component so it's fresh.
    // And client fetch will likely fail.

    useEffect(() => {
        const loadEvents = async () => {
            // If we have initial data, maybe we don't need to fetch immediately?
            // But if we are in admin mode, we might want to.
            // Let's always try to fetch, but handle specific failures gracefully.
            if (!initialData) setIsLoading(true);

            const res = await getMatchEvents(matchId);
            if (res.success && res.data) {
                setEvents(res.data);
            }
            // If failed (e.g. RLS), we stick with initialData if any.

            setIsLoading(false);
        };

        // If we provided initialData, we might want to skip fetch to avoid RLS 403 errors in console
        // checking if matchId exists is enough usually.
        loadEvents();
    }, [matchId]);

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
            setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: res.data.id } : e));
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
