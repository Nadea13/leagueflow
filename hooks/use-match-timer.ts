import { useState, useRef, useEffect } from "react";
import { Match, MatchEvent } from "@/types";

export function useMatchTimer(match: Match, tournamentId: string, events: MatchEvent[]) {
    // Initialize time with strict trust in elapsed_before_pause
    const [time, setTime] = useState(match.elapsed_before_pause || 0);
    const [isRunning, setIsRunning] = useState(match.timer_status === 'playing');

    // Sync isRunning with server state
    useEffect(() => {
        setIsRunning(match.timer_status === 'playing');
    }, [match.timer_status]);

    const localStartRef = useRef<number | null>(null);
    const lastStatusRef = useRef<string>(match.timer_status || 'paused');

    // Timer calculation logic
    useEffect(() => {
        // When status changes to playing, record local start time for optimistic counting
        if (isRunning && lastStatusRef.current !== 'playing') {
            localStartRef.current = Date.now();
        } else if (!isRunning) {
            localStartRef.current = null;
        }
        lastStatusRef.current = isRunning ? 'playing' : 'paused';

        const updateTimer = () => {
            if (!isRunning) {
                setTime(match.elapsed_before_pause || 0);
                return;
            }

            // 1. Try to find the latest marker event (kick_off or match_resumed)
            const markers = events.filter(e => e.event_type === 'kick_off' || e.event_type === 'match_resumed');
            const latestMarker = markers.length > 0 
                ? [...markers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                : null;

            if (latestMarker) {
                const now = Date.now();
                const markerTimestamp = latestMarker.extra_info?.start_timestamp || new Date(latestMarker.created_at).getTime();
                const diffSeconds = Math.max(0, Math.floor((now - markerTimestamp) / 1000));
                const finalTime = (match.elapsed_before_pause || 0) + diffSeconds;
                
                setTime(prev => prev !== finalTime ? finalTime : prev);
            } else if (localStartRef.current) {
                // 2. Fallback to local start time (optimistic UI)
                const now = Date.now();
                const diffSeconds = Math.max(0, Math.floor((now - localStartRef.current) / 1000));
                const finalTime = (match.elapsed_before_pause || 0) + diffSeconds;
                
                setTime(prev => prev !== finalTime ? finalTime : prev);
            }
        };

        // Initial update
        updateTimer();

        // 100ms interval for high-precision responsiveness, but updateTimer uses Date.now() so it's accurate
        const interval = setInterval(updateTimer, 100);
        return () => clearInterval(interval);
    }, [isRunning, match.id, match.elapsed_before_pause, events]);

    return {
        time,
        setTime,
        isRunning,
        setIsRunning
    };
}
