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


    const formatTeamName = (name: string | undefined) => {
        return name || "";
    };

    return (
        <div className="bg-card border rounded-xl relative overflow-hidden w-full group">
            <div className="p-2 lg:p-4 flex flex-col items-center justify-center relative z-10 w-full">
                <div className="flex items-center justify-between w-full max-w-5xl gap-4 md:gap-12">
                    <div
                        className="flex-1 flex flex-row-reverse items-center justify-start gap-2 md:flex-col md:items-center md:gap-4 cursor-pointer group/home min-w-0"
                        onClick={() => onTeamClick?.(match.home_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-12 h-12 md:w-24 md:h-24 bg-foreground/5 rounded-full border border-foreground/10 p-1 md:p-2 relative group/logo shrink-0">
                            {match.home_team?.logo_url ? (
                                <Image src={match.home_team.logo_url} width={64} height={64} className="w-full h-full object-contain relative z-10 rounded-full" alt="" />
                            ) : (
                                <span className="text-2xl font-black text-foreground/20 relative z-10">{getInitials(match.home_team?.name || '')}</span>
                            )}
                        </div>
                        <div className="min-w-0 max-w-[80px] md:max-w-none">
                            <h2 className="text-xs md:text-base lg:text-4xl font-black tracking-tighter text-foreground truncate group-hover/home:text-primary transition-colors">
                                {formatTeamName(match.home_team?.name)}
                            </h2>
                        </div>
                    </div>

                    {/* Central Score Area */}
                    <div className="flex flex-col items-center gap-0 md:gap-4 px-0 md:px-6 md:border-x border-foreground/5 shrink-0">
                        {timerTime !== undefined && (
                            <MatchTimer
                                time={timerTime}
                                readOnly={timerReadOnly}
                                customText={timerCustomText}
                                addedTime={addedTime}
                            />
                        )}

                        <div className="flex items-center gap-4 md:gap-6 tabular-nums">
                            <span className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{homeScore}</span>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-primary text-2xl lg:text-4xl font-black">-</span>
                            </div>
                            <span className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{awayScore}</span>
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
                                    <div className="px-2 py-0.5 rounded text-xs md:text-base font-black tracking-widest text-primary">
                                        (PEN {showHomeScore} - {showAwayScore})
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div
                        className="flex-1 flex flex-row items-center justify-start gap-2 md:flex-col md:items-center md:gap-4 cursor-pointer group/away min-w-0"
                        onClick={() => onTeamClick?.(match.away_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-12 h-12 md:w-24 md:h-24 bg-foreground/5 rounded-full border border-foreground/10 p-1 md:p-2 relative group/logo shrink-0">
                            {match.away_team?.logo_url ? (
                                <Image src={match.away_team.logo_url} width={64} height={64} className="w-full h-full object-contain relative z-10 rounded-full" alt="" />
                            ) : (
                                <span className="text-2xl font-black text-foreground/20 relative z-10">{getInitials(match.away_team?.name || '')}</span>
                            )}
                        </div>
                        <div className="min-w-0 max-w-[80px] md:max-w-none">
                            <h2 className="text-xs md:text-base lg:text-4xl font-black tracking-tighter text-foreground truncate group-hover/away:text-primary transition-colors">
                                {formatTeamName(match.away_team?.name)}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
