"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MatchScoreBoxProps } from "./types";

export function FootballScoreBox({
    match,
    isLive,
    isFinished,
    isEditMode,
    isLiveStatus,
    liveTime,
    matchTime,
    formatTime,
    formatSeconds,
    handleTimeUpdate,
    getScore,
}: MatchScoreBoxProps) {
    const homeScore = getScore(match.home_score);
    const awayScore = getScore(match.away_score);
    const hasPenalty = (match.penalty_home_score ?? 0) > 0 || (match.penalty_away_score ?? 0) > 0;

    return (
        <div className="flex items-center justify-center shrink-0">
            <div
                className={cn(
                    "flex flex-col items-center justify-center transition-all duration-300",
                    isLive ? "text-primary-foreground scale-110" : isFinished ? "text-foreground" : "text-muted-foreground/40"
                )}
            >
                {isLive || isFinished ? (
                    <div className="flex flex-col w-[4rem] items-center leading-none">
                        <div className="flex items-center gap-1 md:gap-2">
                            <span className="text-base md:text-lg font-black text-foreground tracking-tighter">
                                {homeScore}
                            </span>
                            <span className="text-muted-foreground font-black text-xs md:text-sm">-</span>
                            <span className="text-base md:text-lg font-black text-foreground tracking-tighter">
                                {awayScore}
                            </span>
                        </div>

                        {hasPenalty && (
                            <span className="text-[9px] font-bold tracking-tighter text-muted-foreground mt-0.5">
                                ({match.penalty_home_score ?? 0}-{match.penalty_away_score ?? 0} PK)
                            </span>
                        )}

                        {isLiveStatus && (
                            <span className="text-[9px] font-bold text-primary tabular-nums mt-0.5">
                                {formatSeconds(liveTime)}
                            </span>
                        )}
                    </div>
                ) : isEditMode ? (
                    <div className="flex flex-col items-center justify-center transition-transform duration-300">
                        <Input
                            type="time"
                            value={formatTime(matchTime) || ""}
                            className="bg-card text-foreground h-8 text-xs w-24"
                            onChange={(e) => handleTimeUpdate(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-w-[3.5rem] transition-transform duration-300">
                        <span className="text-xs md:text-sm font-bold text-foreground tracking-tight leading-none hover:text-primary transition-colors">
                            {formatTime(match.match_time) || "--:--"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
