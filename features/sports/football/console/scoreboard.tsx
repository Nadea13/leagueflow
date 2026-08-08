import { useState, useEffect } from "react";
import { Match, MatchEvent } from "@/types";
import Image from "next/image";

import { MatchTimer } from "./timer";

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
    homeScore: number;
    awayScore: number;
    events?: MatchEvent[];
    onTeamClick?: (teamId: string) => void;
    // Timer props
    timerTime?: number;
    timerReadOnly?: boolean;
    timerCustomText?: string | number | null;
    addedTime?: number | null;
}

export function Scoreboard({ match, homeScore, awayScore, events = [], onTeamClick, timerTime, timerReadOnly, timerCustomText, addedTime }: ScoreboardProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTeamName = (name: string | undefined) => {
        return name || "";
    };

    const calculatePossession = () => {
        if (!events || events.length === 0) return { home: 50, away: 50, total: 0 };

        const homeTeamId = match.home_team_id;
        const awayTeamId = match.away_team_id;

        // Sort events chronologically by created_at
        const sortedEvents = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let homeTimeMs = 0;
        let awayTimeMs = 0;
        let currentPossessor: 'home' | 'away' | null = null;
        let lastTimestamp: number | null = null;

        sortedEvents.forEach((evt) => {
            const evtTime = new Date(evt.created_at).getTime();

            if (currentPossessor && lastTimestamp !== null && evtTime > lastTimestamp) {
                const duration = evtTime - lastTimestamp;
                if (currentPossessor === 'home') homeTimeMs += duration;
                if (currentPossessor === 'away') awayTimeMs += duration;
            }

            const isHome = evt.team_id === homeTeamId;
            const isAway = evt.team_id === awayTeamId;

            // Direct possession actions
            if (evt.event_type === 'possession' || evt.event_type === 'pass' || evt.event_type === 'cross') {
                if (isHome) currentPossessor = 'home';
                else if (isAway) currentPossessor = 'away';
            }
            // Turnover actions transfer possession to opposite team
            else if (evt.event_type === 'bad_pass' || evt.event_type === 'miss_cross') {
                if (isHome) currentPossessor = 'away';
                else if (isAway) currentPossessor = 'home';
            }
            // Stoppage events pause possession accumulation
            else if (
                evt.event_type === 'goal' ||
                evt.event_type === 'yellow_card' ||
                evt.event_type === 'red_card' ||
                evt.event_type === 'substitution' ||
                evt.event_type === 'injury' ||
                evt.event_type === 'corner' ||
                evt.event_type === 'offside' ||
                evt.event_type === 'half_time' ||
                evt.event_type === 'full_time' ||
                evt.event_type === 'match_paused' ||
                evt.event_type === 'walkover'
            ) {
                currentPossessor = null;
            }

            lastTimestamp = evtTime;
        });

        // Accumulate live duration up to now if match timer is playing and match is live
        if (currentPossessor && lastTimestamp !== null && match.status === 'live' && match.timer_status === 'playing') {
            const currentMs = now;
            if (currentMs > lastTimestamp) {
                const liveDuration = currentMs - lastTimestamp;
                if (currentPossessor === 'home') homeTimeMs += liveDuration;
                if (currentPossessor === 'away') awayTimeMs += liveDuration;
            }
        }

        const totalTimeMs = homeTimeMs + awayTimeMs;
        if (totalTimeMs <= 0) return { home: 50, away: 50, total: 0 };

        const homePct = Math.round((homeTimeMs / totalTimeMs) * 100);
        const awayPct = 100 - homePct;

        return { home: homePct, away: awayPct, total: totalTimeMs };
    };

    const possession = calculatePossession();

    return (
        <div className="bg-card border rounded-sm relative overflow-hidden w-full group">
            <div className="p-2 lg:p-4 flex flex-col items-center justify-center relative z-10 w-full">
                <div className="flex items-center justify-between w-full max-w-5xl gap-4 lg:gap-12">
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
                        </div>
                        <div className="min-w-0 max-w-[80px] lg:max-w-none">
                            <h2 className="text-xs lg:text-3xl font-black tracking-tighter text-foreground truncate group-hover/home:text-primary transition-colors">
                                {formatTeamName(match.home_team?.name)}
                            </h2>
                        </div>
                    </div>

                    {/* Central Score Area */}
                    <div className="flex flex-col items-center">
                        {timerTime !== undefined && (
                            <MatchTimer
                                time={timerTime}
                                readOnly={timerReadOnly}
                                customText={timerCustomText}
                                addedTime={addedTime}
                            />
                        )}

                        <div className="flex items-center gap-4 lg:gap-8 tabular-nums">
                            <span className="text-5xl lg:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{homeScore}</span>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-primary text-2xl lg:text-4xl font-black">-</span>
                            </div>
                            <span className="text-5xl lg:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{awayScore}</span>
                        </div>

                        {/* Penalty Shootout Score */}
                        {(() => {
                            // Calculate local penalty score from events if match object hasn't updated yet
                            const pEvents = events.filter(e => e.event_type === 'penalty_shot');
                            const localHomeScore = pEvents.filter(e => e.team_id === match.home_team_id && e.extra_info?.scored === true).length;
                            const localAwayScore = pEvents.filter(e => e.team_id === match.away_team_id && e.extra_info?.scored === true).length;

                            const showHomeScore = match.penalty_home_score !== null && match.penalty_home_score !== undefined ? match.penalty_home_score : localHomeScore;
                            const showAwayScore = match.penalty_away_score !== null && match.penalty_away_score !== undefined ? match.penalty_away_score : localAwayScore;
                            
                            // Only show if there's at least one penalty shot logged
                            if (pEvents.length > 0) {
                                return (
                                    <div className="px-2 py-0.5 rounded text-xs lg:text-base font-black tracking-widest text-primary">
                                        (PEN {showHomeScore} - {showAwayScore})
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

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
                        </div>
                        <div className="min-w-0 max-w-[80px] lg:max-w-none">
                            <h2 className="text-xs lg:text-3xl font-black tracking-tighter text-foreground truncate group-hover/away:text-primary transition-colors">
                                {formatTeamName(match.away_team?.name)}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Possession Gauge Bar */}
                <div className="w-full max-w-xs sm:max-w-md flex flex-col">
                    <div className="flex justify-between items-center text-xs lg:text-sm font-black tabular-nums">
                        <span className="text-primary">{possession.home}%</span>
                        <span className="text-[10px] lg:text-xs font-bold tracking-widest text-muted-foreground">
                            Possession / การครองบอล
                        </span>
                        <span className="text-muted-foreground">{possession.away}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-primary rounded-l-full transition-all duration-500 ease-out"
                            style={{ width: `${possession.home}%` }}
                        />
                        <div
                            className="h-full bg-muted-foreground rounded-r-full transition-all duration-500 ease-out"
                            style={{ width: `${possession.away}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
