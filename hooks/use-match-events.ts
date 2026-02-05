import { useState, useEffect } from "react";
import { MatchEvent, EventType } from "@/types";
import { addMatchEvent, deleteMatchEvent, getMatchEvents } from "@/app/[locale]/dashboard/tournaments/[id]/event-actions";

export function useMatchEvents(matchId: string, tournamentId: string) {
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load events on mount
    useEffect(() => {
        const loadEvents = async () => {
            setIsLoading(true);
            const res = await getMatchEvents(matchId);
            if (res.success && res.data) {
                setEvents(res.data);
            }
            setIsLoading(false);
        };
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
