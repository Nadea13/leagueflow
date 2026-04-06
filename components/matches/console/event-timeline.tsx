'use client'

import { Match, Player } from "@/types";
import { EVENT_TYPES } from "./constants";
import { Trash2, Clock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface EventTimelineProps {
    events: any[];
    match: Match;
    players: Player[];
    readOnly?: boolean;
    onDelete?: (eventId: string) => void;
}

export function EventTimeline({ events, match, players, readOnly = false, onDelete }: EventTimelineProps) {
    const t = useTranslations("Console");

    return (
        <div className="bg-white/5 border border-white/5 relative overflow-hidden group">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rotate-12 translate-x-4 -translate-y-4 pointer-events-none" />
            
            <div className="px-4 pt-2 md:px-6 md:pt-6 flex items-center justify-between px-4 relative z-10">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary">{t("match_log") || "Match Log"}</h3>
                    <p className="text-[8px] text-muted-foreground italic">CHRONOLOGICAL EVENT HISTORY</p>
                </div>
            </div>

            <div className="px-4 md:px-6 my-2 md:my-3">
                <div className="border-t border-white/5"/>
            </div>

            <div className="relative z-10">
                <div className="max-h-[500px] overflow-y-auto px-4 pb-4 md:px-6 md:pb-6 space-y-2 md:space-y-3 no-scrollbar scroll-smooth">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-20">
                            <Clock className="w-10 h-10 mb-4 text-white" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">{t("no_events")}</p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const evtConfig = EVENT_TYPES.find(e => e.type === event.event_type);
                            const isNeutral = !event.team_id;
                            const isHome = !isNeutral && event.team_id === match.home_team_id;
                            const accentColor = isNeutral ? 'bg-white/20' :
                                             event.event_type === 'red_card' ? 'bg-red-500' : 
                                             event.event_type === 'yellow_card' ? 'bg-yellow-400' : 
                                             'bg-secondary';
                            
                            return (
                                <div 
                                    key={event.id} 
                                    className={cn(
                                        "relative flex items-center gap-2 md:gap-3 group/item w-full",
                                        isNeutral ? "flex-row justify-center" : (isHome ? "flex-row" : "flex-row-reverse")
                                    )}
                                >
                                    {/* Minute Indicator (Hidden for neutral events) */}
                                    {!isNeutral && (
                                        <div className="w-6 flex flex-col items-center">
                                            <span className={cn(
                                                "text-sm font-black italic tracking-tighter drop-shadow-sm transition-colors",
                                                isHome ? "text-white/40 group-hover/item:text-secondary" : "text-white/40 group-hover/item:text-white"
                                            )}>
                                                {event.minute}'
                                            </span>
                                        </div>
                                    )}

                                    <div className={cn(
                                        "flex-1 min-w-0 transition-all relative",
                                        isNeutral ? "py-2" : "p-2 md:p-3 bg-white/5 border border-white/5 group-hover/item:bg-white/10 group-hover/item:border-white/10",
                                        !isNeutral && (isHome ? "text-left" : "text-right")
                                    )}>
                                        {/* Status Accent Bar (Only for team events) */}
                                        {!isNeutral && <div className={cn("absolute top-0 w-[2px] h-full", accentColor, isHome ? "left-0" : "right-0")} />}
                                        
                                        <div className={cn(
                                            "flex items-center justify-between gap-4",
                                            isNeutral ? "flex-row" : (isHome ? "flex-row" : "flex-row-reverse")
                                        )}>
                                            {isNeutral ? (
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="flex-1 h-[1px] bg-secondary/40" />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] italic text-secondary drop-shadow-md">
                                                            {t(evtConfig?.label || event.event_type)}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black italic text-white/40">
                                                                {event.minute}'
                                                            </span>
                                                            {event.extra_info?.added_minutes && (
                                                                <span className="text-sm1 font-black italic text-white/40">
                                                                    (+{event.extra_info.added_minutes} MIN)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 h-[1px] bg-secondary/40" />
                                                </div>
                                            ) : (
                                                <div className="min-w-0">
                                                    <div className={cn(
                                                        "flex items-center gap-2 mb-1",
                                                        isNeutral ? "justify-center" : (isHome ? "flex-row" : "flex-row-reverse")
                                                    )}>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest italic",
                                                            event.event_type === 'goal' ? "text-secondary" : (isNeutral ? "text-white/60" : "text-white/40")
                                                        )}>
                                                            {event.event_type === 'penalty_shot' 
                                                                ? (event.extra_info?.scored ? t("penalty_scored") : t("penalty_missed"))
                                                                : t(evtConfig?.label || event.event_type)}
                                                        </span>
                                                        {!isNeutral && (
                                                            <>
                                                                <span className="text-[10px] text-white/20">•</span>
                                                                <span className="text-[10px] font-black uppercase italic tracking-tighter text-white truncate max-w-[120px]">
                                                                    {isHome ? match.home_team?.name : match.away_team?.name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <p className={cn(
                                                        "text-xs font-black uppercase italic tracking-widest text-white truncate",
                                                        isNeutral ? "text-center" : ""
                                                    )}>
                                                        {event.player_name || "Match Event"}
                                                    </p>
                                                    {event.extra_info?.reason && (
                                                        <p className="text-[9px] text-white/40 italic mt-1 font-medium">{event.extra_info.reason}</p>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {!readOnly && onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                                                    onClick={() => onDelete(event.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
