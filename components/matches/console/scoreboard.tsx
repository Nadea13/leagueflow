import { Match, EventType } from "@/types";
import { useTranslations } from "next-intl";
import { MatchTimer } from "./match-timer";

interface ScoreboardProps {
    match: Match;
    homeScore: number;
    awayScore: number;
    isPro?: boolean;
    readOnly?: boolean;
    onAction: (teamId: string, type: EventType) => void;
    onTeamClick?: (teamId: string) => void;
    // Timer props
    timerTime?: number;
    timerReadOnly?: boolean;
    timerCustomText?: string | number | null;
    onAddTime?: () => void;
    addedTime?: number | null;
}

export function Scoreboard({ match, homeScore, awayScore, isPro = false, readOnly = false, onAction, onTeamClick, timerTime, timerReadOnly, timerCustomText, onAddTime, addedTime }: ScoreboardProps) {
    const t = useTranslations("Console");

    return (
        <div className="bg-white/5 border border-white/5 relative overflow-hidden w-full group">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 -rotate-12 translate-x-8 -translate-y-8 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-1 bg-gradient-to-r from-secondary/50 to-transparent" />
            
            <div className="p-8 lg:p-12 flex flex-col items-center justify-center relative z-10 w-full">
                <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-5xl gap-8 md:gap-12">
                    <div 
                        className="flex-1 text-center md:text-right space-y-4 cursor-pointer group/home"
                        onClick={() => onTeamClick?.(match.home_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-none bg-white/5 border border-white/10 p-4 relative group/logo">
                            <div className="absolute inset-0 bg-secondary/5 scale-0 group-hover/logo:scale-100 transition-transform duration-500" />
                            {match.home_team?.logo_url ? (
                                <img src={match.home_team.logo_url} className="w-16 h-16 object-contain relative z-10" alt="" />
                            ) : (
                                <span className="text-2xl font-black text-white/20 relative z-10">{match.home_team?.name?.substring(0, 2).toUpperCase() || 'H'}</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white truncate group-hover/home:text-secondary transition-colors">
                                {match.home_team?.name}
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary/60">HOME SQUAD</p>
                        </div>
                    </div>

                    {/* Central Score Area */}
                    <div className="flex flex-col items-center gap-6 px-12 md:border-x border-white/5">
                        <div className="px-4 py-1.5 bg-secondary/10 border border-secondary/20 skew-x-[-12deg]">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary skew-x-[12deg] inline-block">
                                {match.stage || "Tournament Match"}
                            </span>
                        </div>

                        <div className="flex items-center gap-6 tabular-nums">
                            <span className="text-7xl lg:text-9xl font-black tracking-tighter text-white">{homeScore}</span>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-secondary text-2xl lg:text-4xl font-black opacity-30 animate-pulse">:</span>
                            </div>
                            <span className="text-7xl lg:text-9xl font-black tracking-tighter text-white">{awayScore}</span>
                        </div>
                        
                        {timerTime !== undefined && (
                            <MatchTimer
                                time={timerTime}
                                readOnly={timerReadOnly}
                                customText={timerCustomText}
                                onAddTime={onAddTime}
                                addedTime={addedTime}
                            />
                        )}

                        {match.status === 'finished' && (
                            <div className="bg-secondary/20 text-secondary border border-secondary/30 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                                Final Result
                            </div>
                        )}
                    </div>

                    <div 
                        className="flex-1 text-center md:text-left space-y-4 cursor-pointer group/away"
                        onClick={() => onTeamClick?.(match.away_team_id || "")}
                    >
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-none bg-white/5 border border-white/10 p-4 relative group/logo">
                            <div className="absolute inset-0 bg-white/5 scale-0 group-hover/logo:scale-100 transition-transform duration-500" />
                            {match.away_team?.logo_url ? (
                                <img src={match.away_team.logo_url} className="w-16 h-16 object-contain relative z-10" alt="" />
                            ) : (
                                <span className="text-2xl font-black text-white/20 relative z-10">{match.away_team?.name?.substring(0, 2).toUpperCase() || 'A'}</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white truncate group-hover/away:text-secondary transition-colors">
                                {match.away_team?.name}
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">AWAY SQUAD</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
