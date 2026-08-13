"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MatchScoreBoxProps } from "./types";

export function VolleyballScoreBox({
    match,
    events,
    isLive,
    isFinished,
    isEditMode,
    isLiveStatus,
    matchTime,
    formatTime,
    handleTimeUpdate,
    getScore,
}: MatchScoreBoxProps) {
    const homeSetsWon = getScore(match.home_score);
    const awaySetsWon = getScore(match.away_score);

    // Volleyball Set Scores Breakdown from Match Events
    const pointTypes = ['point', 'ace', 'spike', 'block'];
    const setPointsMap = new Map<number, { home: number; away: number }>();

    if (events && events.length > 0) {
        events.forEach(e => {
            if (!pointTypes.includes(e.event_type)) return;
            const extraSet = (e.extra_info as Record<string, unknown> | null)?.set;
            const setNum = typeof extraSet === 'number' ? extraSet : (e.minute || 1);
            const current = setPointsMap.get(setNum) || { home: 0, away: 0 };

            const extra = e.extra_info as Record<string, unknown> | null;
            const isHome = extra?.team_side === 'home' ||
                (e.team_id && (e.team_id === match.home_team_id || e.team_id === match.home_team?.id)) ||
                ((extra?.text as string) || "").includes("Point for home");

            if (isHome) current.home += 1;
            else current.away += 1;
            setPointsMap.set(setNum, current);
        });
    }

    const setNumbers = Array.from(setPointsMap.keys()).sort((a, b) => a - b);
    const currentSetNumber = setNumbers.length > 0 ? setNumbers[setNumbers.length - 1] : 1;
    const currentSetPoints = setPointsMap.get(currentSetNumber) || { home: 0, away: 0 };
    const pastSetNumbers = setNumbers.filter(s => s < currentSetNumber);

    return (
        <div className="flex items-center justify-center shrink-0">
            <div
                className={cn(
                    "flex flex-col items-center justify-center transition-all duration-300",
                    isLive ? "text-primary-foreground scale-105" : isFinished ? "text-foreground" : "text-muted-foreground/40"
                )}
            >
                {isLiveStatus ? (
                    /* Live Mode: Home Sets Won on Left, Home/Away Points in Center, Away Sets Won on Right */
                    <div className="flex flex-col min-w-[6.5rem] items-center leading-none">
                        <div className="flex items-center gap-1 md:gap-2">
                            {/* Home Sets Won (Left Side) */}
                            <span className="text-[10px] md:text-sm font-black tracking-wider text-foreground">
                                {homeSetsWon}
                            </span>

                            {/* Live Set Points (Home - Away) */}
                            <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter">
                                    {currentSetPoints.home}
                                </span>
                                <span className="text-muted-foreground font-black text-xs md:text-sm">-</span>
                                <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter">
                                    {currentSetPoints.away}
                                </span>
                            </div>

                            {/* Away Sets Won (Right Side) */}
                            <span className="text-[10px] md:text-sm font-black tracking-wider text-foreground">
                                {awaySetsWon}
                            </span>
                        </div>

                        {/* Live Set Label & Past Set Scores History */}
                        <div className="flex items-center gap-1.5 flex-wrap justify-center text-[10px] font-bold text-muted-foreground/80">
                            {pastSetNumbers.map((s) => {
                                const pts = setPointsMap.get(s)!;
                                return (
                                    <span key={s} className="px-1 py-0.5 rounded bg-muted/40 text-muted-foreground">
                                        {pts.home}-{pts.away}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ) : isFinished ? (
                    /* Finished Mode: Show Main Sets Score (e.g. 3-1) as Main Score, and All Set Scores History below */
                    <div className="flex flex-col min-w-[5.5rem] items-center leading-none gap-1">
                        <div className="flex items-center gap-1 md:gap-3">
                            <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter">
                                {homeSetsWon}
                            </span>
                            <span className="text-muted-foreground font-black text-[10px] md:text-xs uppercase tracking-wider px-0.5">
                                -
                            </span>
                            <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter">
                                {awaySetsWon}
                            </span>
                        </div>

                        {setNumbers.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap justify-center text-[10px] font-bold text-muted-foreground/80">
                                {setNumbers.map((s) => {
                                    const pts = setPointsMap.get(s)!;
                                    return (
                                        <span key={s} className="px-1 py-0.5 rounded bg-muted/40">
                                            {pts.home}-{pts.away}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : isEditMode ? (
                    <div className="flex flex-col items-center justify-center transition-transform duration-300">
                        <Input
                            type="time"
                            value={formatTime(matchTime) || ""}
                            className="bg-card text-foreground"
                            onChange={(e) => handleTimeUpdate(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-w-[5rem] transition-transform duration-300">
                        <span className="text-lg md:text-xl font-black text-foreground tracking-tighter leading-none hover:text-primary transition-colors">
                            {formatTime(match.match_time) || "--:--"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
