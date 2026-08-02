"use client";

import { Match, MatchEvent } from "@/types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Volleyball } from "lucide-react";

const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

interface ScoreboardProps {
    match: Match;
    events?: MatchEvent[];
    homeSetsWon?: number;
    awaySetsWon?: number;
    currentSetHomePoints?: number;
    currentSetAwayPoints?: number;
    setScoresHistory?: Array<{ set: number; home: number; away: number }>;
    servingTeam?: 'home' | 'away' | null;
    currentSetNumber?: number;
    onTeamClick?: (teamId: string) => void;
}

export function VolleyballScoreboard({
    match,
    events,
    homeSetsWon = 0,
    awaySetsWon = 0,
    currentSetHomePoints = 0,
    currentSetAwayPoints = 0,
    setScoresHistory = [],
    servingTeam = null,
    currentSetNumber = 1,
    onTeamClick
}: ScoreboardProps) {
    const formatTeamName = (name: string | undefined) => {
        return name || "";
    };

    const isHomeEvent = (e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'home') return true;
        if (extra?.team_side === 'away') return false;

        if (e.team_id) {
            if (e.team_id === match.home_team_id || e.team_id === match.home_team?.id) return true;
            if (e.team_id === match.away_team_id || e.team_id === match.away_team?.id) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return true;
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return false;

        return false;
    };

    const isAwayEvent = (e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'away') return true;
        if (extra?.team_side === 'home') return false;

        if (e.team_id) {
            if (e.team_id === match.away_team_id || e.team_id === match.away_team?.id) return true;
            if (e.team_id === match.home_team_id || e.team_id === match.home_team?.id) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return true;
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return false;

        return false;
    };

    const pointTypes = ['point', 'ace', 'spike', 'block'];

    const getSetNumber = (e: MatchEvent) => {
        const extraSet = (e.extra_info as Record<string, unknown> | null)?.set;
        return typeof extraSet === 'number' ? extraSet : (e.minute || 1);
    };

    const setPointsMap = new Map<number, { home: number; away: number }>();
    if (events && events.length > 0) {
        events.forEach(e => {
            if (!pointTypes.includes(e.event_type)) return;
            const setNum = getSetNumber(e);
            const current = setPointsMap.get(setNum) || { home: 0, away: 0 };
            if (isHomeEvent(e)) current.home += 1;
            if (isAwayEvent(e)) current.away += 1;
            setPointsMap.set(setNum, current);
        });
    }

    const allSetNumbers = Array.from(setPointsMap.keys()).sort((a, b) => a - b);
    const maxLoggedSet = allSetNumbers.length > 0 ? Math.max(...allSetNumbers) : (currentSetNumber || 1);

    const derivedHistory: Array<{ set: number; home: number; away: number }> = [];
    let derivedHomeSets = 0;
    let derivedAwaySets = 0;

    for (let s = 1; s <= maxLoggedSet; s++) {
        const pts = setPointsMap.get(s) || { home: 0, away: 0 };
        const targetPts = s === 5 ? 15 : 25;
        const isSetFinishedByScore = (pts.home >= targetPts || pts.away >= targetPts) && Math.abs(pts.home - pts.away) >= 2;
        const isPastSet = s < maxLoggedSet;

        if (isPastSet || isSetFinishedByScore) {
            derivedHistory.push({ set: s, home: pts.home, away: pts.away });
            if (pts.home > pts.away) derivedHomeSets += 1;
            else if (pts.away > pts.home) derivedAwaySets += 1;
        }
    }

    const computedCurrentSetNumber = events && events.length > 0
        ? (derivedHomeSets + derivedAwaySets + 1)
        : currentSetNumber;

    const computedHomePoints = events && events.length > 0
        ? (setPointsMap.get(computedCurrentSetNumber)?.home || 0)
        : currentSetHomePoints;

    const computedAwayPoints = events && events.length > 0
        ? (setPointsMap.get(computedCurrentSetNumber)?.away || 0)
        : currentSetAwayPoints;

    const computedHomeSetsWon = events && events.length > 0 ? derivedHomeSets : homeSetsWon;
    const computedAwaySetsWon = events && events.length > 0 ? derivedAwaySets : awaySetsWon;
    const computedSetScoresHistory = events && events.length > 0 ? derivedHistory : setScoresHistory;

    const latestPointEvent = events ? events.find(e => pointTypes.includes(e.event_type)) : null;
    const computedServingTeam = events
        ? (latestPointEvent ? (isHomeEvent(latestPointEvent) ? 'home' : 'away') : 'home')
        : servingTeam;

    return (
        <div className="bg-card border rounded-sm relative overflow-hidden w-full group">
            <div className="p-2 lg:p-4 flex flex-col items-center justify-center relative z-10 w-full">
                <div className="flex items-center justify-between w-full max-w-5xl gap-4 lg:gap-12">
                    {/* Home Team */}
                    <div
                        className="flex-1 flex flex-row-reverse items-center justify-start gap-2 lg:flex-col lg:items-center lg:gap-4 cursor-pointer group/home min-w-0"
                        onClick={() => onTeamClick?.(match.home_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-12 h-12 lg:w-24 lg:h-24 bg-foreground/5 rounded-full border border-foreground/10 p-1 lg:p-2 relative group/logo shrink-0">
                            {match.home_team?.logo_url ? (
                                <Image src={match.home_team.logo_url} width={64} height={64} className="w-full h-full object-contain relative z-10 rounded-full" alt="" />
                            ) : (
                                <span className="text-2xl font-black text-foreground/20 relative z-10">{getInitials(match.home_team?.name || '')}</span>
                            )}
                            {computedServingTeam === 'home' && (
                                <div className="absolute -bottom-0 -right-0 bg-amber-500 text-black rounded-full p-1 shadow z-20">
                                    <Volleyball className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 max-w-[80px] lg:max-w-none">
                            <h2 className="text-xs lg:text-3xl font-black tracking-tighter text-foreground truncate group-hover/home:text-primary transition-colors">
                                {formatTeamName(match.home_team?.name)}
                            </h2>
                        </div>
                    </div>

                    {/* Central Score Area */}
                    <div className="flex flex-col items-center">
                        {/* Set Indicator */}
                        <div className="flex flex-col items-center mb-1 lg:mb-2">
                            <span className="text-[10px] lg:text-xs font-black tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1.5">
                                <Volleyball className="h-3.5 w-3.5 text-amber-500" />
                                SET {computedCurrentSetNumber}
                            </span>
                        </div>

                        {/* Points Score */}
                        <div className="flex items-center gap-4 lg:gap-8 tabular-nums">
                            <span className="text-5xl lg:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{computedHomePoints}</span>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-primary text-2xl lg:text-4xl font-black">-</span>
                            </div>
                            <span className="text-5xl lg:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{computedAwayPoints}</span>
                        </div>

                        {/* Sets Won Summary */}
                        <div className="px-2 py-0.5 rounded text-xs lg:text-base font-black tracking-widest text-primary">
                            (SETS {computedHomeSetsWon} - {computedAwaySetsWon})
                        </div>
                    </div>

                    {/* Away Team */}
                    <div
                        className="flex-1 flex flex-row items-center justify-start gap-2 lg:flex-col lg:items-center lg:gap-4 cursor-pointer group/away min-w-0"
                        onClick={() => onTeamClick?.(match.away_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-12 h-12 lg:w-24 lg:h-24 rounded-full border p-1 lg:p-2 relative group/logo shrink-0">
                            {match.away_team?.logo_url ? (
                                <Image src={match.away_team.logo_url} width={64} height={64} className="w-full h-full object-contain relative z-10 rounded-full" alt="" />
                            ) : (
                                <span className="text-2xl font-black text-foreground/20 relative z-10">{getInitials(match.away_team?.name || '')}</span>
                            )}
                            {computedServingTeam === 'away' && (
                                <div className="absolute -bottom-0 -right-0 bg-amber-500 text-black rounded-full p-1 shadow z-20">
                                    <Volleyball className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 max-w-[80px] lg:max-w-none">
                            <h2 className="text-xs lg:text-3xl font-black tracking-tighter text-foreground truncate group-hover/away:text-primary transition-colors">
                                {formatTeamName(match.away_team?.name)}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Set Scores History Bar */}
                {computedSetScoresHistory.length > 0 && (
                    <div className="mt-2 lg:mt-4 pt-2 lg:pt-3 border-t flex items-center justify-center gap-2 overflow-x-auto w-full">
                        <span className="text-[11px] font-bold text-muted-foreground mr-1">Sets History:</span>
                        {computedSetScoresHistory.map((s) => (
                            <Badge key={s.set} variant="outline" className="text-[11px] font-mono px-2 py-0.5">
                                Set {s.set}: {s.home}-{s.away}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
