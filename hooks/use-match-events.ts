import { useState, useEffect, useCallback } from "react";
import { MatchEvent, EventType } from "@/types";
import { addMatchEvent, deleteMatchEvent, getMatchEvents } from "@/actions/tournaments/event";
import { createClient } from "@/lib/supabase/client";

export interface QueuedAction {
    id: string;
    type: "add_event" | "delete_event";
    matchId: string;
    teamId: string | null;
    eventType?: EventType;
    minute?: number;
    playerId?: string | null;
    extraInfo?: Record<string, unknown>;
    playerName?: string;
    eventId?: string;
    createdAt: number;
    status: "pending" | "syncing" | "failed";
    error?: string;
}

export function useMatchEvents(matchId: string, tournamentId: string, initialData?: MatchEvent[], isReadOnly?: boolean) {
    const [events, setEvents] = useState<MatchEvent[]>(initialData || []);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [queue, setQueue] = useState<QueuedAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load queue from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`leagueflow-pending-events-${matchId}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setTimeout(() => {
                        setQueue(parsed);
                    }, 0);
                } catch (e) {
                    console.error("Failed to parse local event queue", e);
                }
            }
        }
    }, [matchId]);

    // Save queue to localStorage when changed
    const saveQueue = useCallback((newQueueOrUpdater: QueuedAction[] | ((prev: QueuedAction[]) => QueuedAction[])) => {
        setQueue(prev => {
            const next = typeof newQueueOrUpdater === "function" ? newQueueOrUpdater(prev) : newQueueOrUpdater;
            if (typeof window !== "undefined") {
                localStorage.setItem(`leagueflow-pending-events-${matchId}`, JSON.stringify(next));
            }
            return next;
        });
    }, [matchId]);

    // Load events on mount
    useEffect(() => {
        const supabase = createClient();
        let isMounted = true;

        const fetchEventsClient = async () => {
            const { data, error } = await supabase
                .from('match_events')
                .select(`*, player:players(display_name)`)
                .eq('match_id', matchId)
                .order('created_at', { ascending: false });

            if (isMounted && !error && data) {
                const mapped = data.map((e) => ({
                    ...e,
                    player_name: (e.player as { display_name: string } | null)?.display_name || (e as { player_name?: string }).player_name || "Unknown",
                    player: undefined
                }));
                setEvents(mapped);
            }
            return data;
        };

        const loadEvents = async () => {
            if (isReadOnly) {
                await fetchEventsClient();
            } else {
                const res = await getMatchEvents(matchId);
                if (isMounted && res.success && res.data) setEvents(res.data);
            }
            if (isMounted) setIsLoading(false);
        };

        loadEvents();
        
        const channelId = Math.random().toString(36).substring(7);
        const channel = supabase.channel(`match-events-${matchId}-${channelId}`);
        
        channel
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'match_events', 
                filter: `match_id=eq.${matchId}` 
            }, async (payload) => {
                if (!isMounted) return;

                if (payload.eventType === 'INSERT') {
                    const newEvt = payload.new as MatchEvent;
                    setEvents((prev) => {
                        if (prev.some(e => e.id === newEvt.id)) return prev;
                        return [newEvt, ...prev];
                    });
                    if (isReadOnly) {
                        fetchEventsClient();
                    }
                } else if (payload.eventType === 'DELETE') {
                    setEvents((prev: MatchEvent[]) => prev.filter((e: MatchEvent) => e.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    const updatedEvt = payload.new as MatchEvent;
                    setEvents((prev) => prev.map(e => e.id === updatedEvt.id ? { ...e, ...updatedEvt } : e));
                }
            })
            .subscribe();

        let pollInterval: NodeJS.Timeout | null = null;
        if (isReadOnly) {
            pollInterval = setInterval(() => {
                if (isMounted) fetchEventsClient();
            }, 5000);
        }

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [matchId, isReadOnly]);

    // Sync function
    const syncQueue = useCallback(async () => {
        if (isSyncing || isReadOnly) return;
        
        let pendingItems: QueuedAction[] = [];
        setQueue(prev => {
            pendingItems = prev.filter(a => a.status === 'pending' || a.status === 'failed');
            return prev;
        });

        if (pendingItems.length === 0) return;

        setIsSyncing(true);

        for (const action of pendingItems) {
            saveQueue((prev) => prev.map(q => q.id === action.id ? { ...q, status: 'syncing' as const } : q));

            try {
                let isSuccess = false;
                let errorMsg = "";

                if (action.type === 'add_event') {
                    const res = await addMatchEvent(matchId, action.teamId, action.eventType!, action.minute!, action.playerId ?? null, action.extraInfo!, tournamentId);
                    isSuccess = !!res.success;
                    if (!isSuccess) errorMsg = res.error || "Unknown error";
                } else if (action.type === 'delete_event') {
                    const res = await deleteMatchEvent(action.eventId!, tournamentId);
                    isSuccess = !!res.success || (!!res.error && res.error.toLowerCase().includes("not found"));
                    if (!isSuccess) errorMsg = res.error || "Unknown error";
                }

                if (isSuccess) {
                    saveQueue((prev) => {
                        const next = prev.filter(q => q.id !== action.id);
                        console.log(`[Queue Sync Success] Event ${action.id} synced & removed from queue. Remaining:`, next.length);
                        return next;
                    });
                } else {
                    saveQueue((prev) => {
                        const next = prev.map(q => q.id === action.id ? { ...q, status: 'failed' as const, error: errorMsg } : q);
                        console.error(`[Queue Sync Failed] Event ${action.id} failed:`, errorMsg);
                        return next;
                    });
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                saveQueue((prev) => prev.map(q => q.id === action.id ? { ...q, status: 'failed' as const, error: errorMsg } : q));
            }
        }
        setIsSyncing(false);
    }, [matchId, tournamentId, isSyncing, isReadOnly, saveQueue]);

    // Auto-sync when window becomes online
    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleOnline = () => {
                syncQueue();
            };
            window.addEventListener("online", handleOnline);
            return () => window.removeEventListener("online", handleOnline);
        }
    }, [syncQueue]);

    // Trigger sync automatically when queue receives new items
    useEffect(() => {
        if (queue.some(a => a.status === 'pending')) {
            const timer = setTimeout(() => {
                syncQueue();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [queue, syncQueue]);

    const addEvent = async (
        teamId: string | null,
        type: EventType,
        minute: number,
        playerId: string | null = null,
        extraInfo: Record<string, unknown> = {},
        playerName: string = "Unknown"
    ): Promise<{ success: boolean; error?: string }> => {
        const tempId = `temp-${Date.now()}`;
        const newAction: QueuedAction = {
            id: tempId,
            type: "add_event",
            matchId,
            teamId,
            eventType: type,
            minute,
            playerId,
            extraInfo,
            playerName,
            createdAt: Date.now(),
            status: "pending"
        };

        setQueue(prev => {
            const next = [...prev, newAction];
            if (typeof window !== "undefined") {
                localStorage.setItem(`leagueflow-pending-events-${matchId}`, JSON.stringify(next));
            }
            return next;
        });

        setTimeout(() => {
            syncQueue();
        }, 50);

        return { success: true };
    };

    const deleteEvent = async (eventId: string): Promise<{ success: boolean; error?: string }> => {
        if (eventId.startsWith("temp-")) {
            setQueue(prev => {
                const next = prev.filter(a => a.id !== eventId);
                if (typeof window !== "undefined") {
                    localStorage.setItem(`leagueflow-pending-events-${matchId}`, JSON.stringify(next));
                }
                return next;
            });
            return { success: true };
        }

        const newAction: QueuedAction = {
            id: `del-${eventId}-${Date.now()}`,
            type: "delete_event",
            matchId,
            teamId: null,
            eventId,
            createdAt: Date.now(),
            status: "pending"
        };

        setQueue(prev => {
            const next = [...prev, newAction];
            if (typeof window !== "undefined") {
                localStorage.setItem(`leagueflow-pending-events-${matchId}`, JSON.stringify(next));
            }
            return next;
        });

        setTimeout(() => {
            syncQueue();
        }, 50);

        return { success: true };
    };

    const combinedEvents = [...events];
    queue.forEach(action => {
        if (action.type === 'add_event') {
            const exists = events.some(e => e.id === action.id || 
                (e.event_type === action.eventType && e.minute === action.minute && (e.player_id ?? null) === (action.playerId ?? null) && e.team_id === action.teamId));
            if (!exists) {
                combinedEvents.push({
                    id: action.id,
                    match_id: action.matchId,
                    team_id: action.teamId,
                    event_type: action.eventType!,
                    minute: action.minute!,
                    player_id: action.playerId!,
                    extra_info: action.extraInfo!,
                    created_at: new Date(action.createdAt).toISOString(),
                    player_name: action.playerName!,
                    isPending: true
                } as MatchEvent & { isPending?: boolean });
            }
        }
    });

    const deletedIds = new Set(queue.filter(a => a.type === 'delete_event').map(a => a.eventId));
    const visibleEvents = combinedEvents
        .filter(e => !deletedIds.has(e.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
        events: visibleEvents,
        rawEvents: events,
        queue,
        isSyncing,
        syncQueue,
        addEvent,
        deleteEvent,
        isLoading
    };
}
