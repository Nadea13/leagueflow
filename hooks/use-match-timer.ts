import { useState, useRef, useEffect } from "react";
import { Match } from "@/types";
import { updateMatch } from "@/app/[locale]/dashboard/tournaments/[id]/actions";

export function useMatchTimer(match: Match, tournamentId: string) {
    // Helper to convert 1-based minute to seconds (approximate start of that minute)
    // Minute 1 -> 0s
    // Minute 2 -> 60s
    const getApproxSecondsFromMinute = (m: number | string) => {
        const min = typeof m === 'number' ? m : parseInt(m as string) || 0;
        // If 0, treat as 0. If >=1, subtract 1.
        const adjusted = min > 0 ? min - 1 : 0;
        return adjusted * 60;
    };

    // Initialize time
    const initialTime = match.status === 'live' && match.timer_status === 'playing'
        ? getApproxSecondsFromMinute(match.current_minute || 0)
        : (match.elapsed_before_pause || 0);

    const [time, setTime] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedMinuteRef = useRef<number | null>(null);

    // Sync with Server State
    useEffect(() => {
        if (match.status === 'live') {
            if (match.timer_status === 'paused') {
                // Paused -> show static accumulated time
                // Trust elapsed_before_pause strictly when paused
                setTime(match.elapsed_before_pause || 0);
                setIsRunning(false);
            } else {
                // Playing
                setIsRunning(true);

                // Logic: Should we sync time from current_minute?
                // match.current_minute is 1-based bucket (1 = 0-59s, 2 = 60-119s)
                const serverApproxTime = getApproxSecondsFromMinute(match.current_minute || 0);

                // Problem: current_minute loses second-precision.
                // Rule: 
                // 1. If we are ALREADY running locally, do NOT sync backwards or forwards based on rough minute bucket, 
                //    unless the difference is massive (e.g. > 2 minutes sync issue).
                // 2. If we just mounted (or re-connected), we might accept the approx time.

                // We only force-set time if the discrepancy suggests we are completely wrong (e.g. wrong minute bucket by a margin).
                // serverApproxTime is the *start* of the minute.
                // e.g. match is at 1:30 (90s). DB says "2" (60s+). serverApproxTime = 60.
                // 60 vs 90 -> Diff 30.
                // We shouldn't reset to 60.

                // What if match is at 1:59 (119s). DB says "2". serverApproxTime = 60.
                // Diff 59.

                // What if match is at 2:01 (121s). DB says "3". serverApproxTime = 120.
                // Diff 1.

                // So serverApproxTime is always <= actual time (floored).
                // Max difference normally is ~60 seconds.

                // So if local time is LESS than serverApproxTime, we are definitely behind (lagging).
                // e.g. Local 50s. DB says "2" (60s+). We must jump to at least 60s.
                if (time < serverApproxTime) {
                    setTime(serverApproxTime);
                }

                // If local time is significantly AHEAD of the END of that minute?
                // e.g. Local 130s (2:10). DB says "2" (60s-119s). 
                // That implies we haven't updated the server yet, or server is lagging.
                // We generally trust local time in forward direction as we are the driver.

            }
        } else if (match.status === 'scheduled') {
            setTime(match.elapsed_before_pause || 0);
            setIsRunning(false);
        } else if (match.status === 'finished') {
            setIsRunning(false);
        }
    }, [match.status, match.timer_status, match.elapsed_before_pause, match.current_minute]);

    // Interval
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning]);

    // Auto-save
    useEffect(() => {
        if (isRunning) {
            // Logic: 0-59s -> Minute 1. 60-119s -> Minute 2.
            const currentMinute = Math.floor(time / 60) + 1;

            if (lastSavedMinuteRef.current !== currentMinute) {
                lastSavedMinuteRef.current = currentMinute;
                // console.log("Auto-saving:", currentMinute);
                updateMatch(match.id, { current_minute: currentMinute }, tournamentId);
            }
        }
    }, [isRunning, time, match.id, tournamentId]);

    return {
        time,
        setTime,
        isRunning,
        setIsRunning
    };
}
