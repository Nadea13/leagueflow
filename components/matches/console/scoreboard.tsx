import { Match } from "@/types";

import Image from "next/image";
import { MatchTimer } from "./match-timer";

interface ScoreboardProps {
    match: Match;
    homeScore: number;
    awayScore: number;
    onTeamClick?: (teamId: string) => void;
    // Timer props
    timerTime?: number;
    timerReadOnly?: boolean;
    timerCustomText?: string | number | null;
    onAddTime?: () => void;
    addedTime?: number | null;
}

export function Scoreboard({ match, homeScore, awayScore, onTeamClick, timerTime, timerReadOnly, timerCustomText, onAddTime, addedTime }: ScoreboardProps) {


    const formatTeamName = (name: string | undefined) => {
        if (!name) return "";
        return name.length > 8 ? `${name.substring(0, 8).trim()}...` : name;
    };

    return (
        <div className="bg-card border border-foreground/5 relative overflow-hidden w-full group">
            <div className="p-4 lg:p-6 flex flex-col items-center justify-center relative z-10 w-full">
                <div className="flex items-center justify-between w-full max-w-5xl gap-4 md:gap-12">
                    <div
                        className="flex-1 text-center md:text-right space-y-2 md:space-y-3 cursor-pointer group/home"
                        onClick={() => onTeamClick?.(match.home_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-none bg-foreground/5 border border-foreground/10 p-2 md:p-3 relative group/logo">
                            <div className="absolute inset-0 bg-secondary/5 scale-0 group-hover/logo:scale-100 transition-transform duration-500" />
                            {match.home_team?.logo_url ? (
                                <Image src={match.home_team.logo_url} width={64} height={64} className="w-16 h-16 object-contain relative z-10" alt="" unoptimized />
                            ) : (
                                <span className="text-2xl font-black text-foreground/20 relative z-10">{match.home_team?.name?.substring(0, 2).toUpperCase() || 'H'}</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl lg:text-4xl font-black tracking-tighter text-foreground truncate group-hover/home:text-secondary transition-colors">
                                {formatTeamName(match.home_team?.name)}
                            </h2>
                            <p className="text-[10px] font-black tracking-[0.3em] text-secondary/60">HOME</p>
                        </div>
                    </div>

                    {/* Central Score Area */}
                    <div className="flex flex-col items-center gap-4 md:gap-6 px-0 md:px-6 md:border-x border-foreground/5">
                        <div className="px-4 py-1.5 bg-secondary/10 border border-secondary/20">
                            <span className="text-[10px] font-black tracking-[0.2em] text-secondary inline-block">
                                {match.stage || "Tournament Match"}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 md:gap-6 tabular-nums">
                            <span className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{homeScore}</span>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-secondary text-2xl lg:text-4xl font-black opacity-30 animate-pulse">-</span>
                            </div>
                            <span className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter text-foreground">{awayScore}</span>
                        </div>

                        {timerTime !== undefined && (
                            <MatchTimer
                                time={timerTime}
                                readOnly={timerReadOnly}
                                customText={timerCustomText}
                                addedTime={addedTime}
                            />
                        )}

                        {match.status === 'finished' && (
                            <div className="bg-secondary/20 text-secondary border border-secondary/30 px-4 py-1 text-[10px] font-black tracking-[0.2em]">
                                Final Result
                            </div>
                        )}
                    </div>

                    <div
                        className="flex-1 text-center md:text-left space-y-4 cursor-pointer group/away"
                        onClick={() => onTeamClick?.(match.away_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-none bg-foreground/5 border border-foreground/10 p-2 md:p-3 relative group/logo">
                            <div className="absolute inset-0 bg-foreground/5 scale-0 group-hover/logo:scale-100 transition-transform duration-500" />
                            {match.away_team?.logo_url ? (
                                <Image src={match.away_team.logo_url} width={64} height={64} className="w-16 h-16 object-contain relative z-10" alt="" unoptimized />
                            ) : (
                                <span className="text-2xl font-black text-foreground/20 relative z-10">{match.away_team?.name?.substring(0, 2).toUpperCase() || 'A'}</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl lg:text-4xl font-black tracking-tighter text-foreground truncate group-hover/away:text-secondary transition-colors">
                                {formatTeamName(match.away_team?.name)}
                            </h2>
                            <p className="text-[10px] font-black tracking-[0.3em] text-foreground/40">AWAY</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
