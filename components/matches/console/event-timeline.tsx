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
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary">{t("match_log") || "Match Log"}</h3>
                    <p className="text-[9px] text-muted-foreground italic">CHRONOLOGICAL EVENT HISTORY</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 border-white/5 bg-white/5 hover:bg-white/10 hover:border-secondary/50 rounded-none text-[9px] font-black uppercase tracking-widest transition-all group">
                    {t("view_report") || "Full Report"} <ArrowRight className="h-3 w-3 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>

            <div className="relative z-10">
                <div className="max-h-[500px] overflow-y-auto px-6 py-6 space-y-4 no-scrollbar scroll-smooth">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-20">
                            <Clock className="w-10 h-10 mb-4 text-white" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">{t("no_events")}</p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const evtConfig = EVENT_TYPES.find(e => e.type === event.event_type);
                            const isHome = event.team_id === match.home_team_id;
                            const accentColor = event.event_type === 'red_card' ? 'bg-red-500' : 
                                             event.event_type === 'yellow_card' ? 'bg-yellow-400' : 
                                             'bg-secondary';
                            
                            return (
                                <div 
                                    key={event.id} 
                                    className="relative flex items-center gap-6 group/item"
                                >
                                    {/* Minute Indicator */}
                                    <div className="w-10 flex flex-col items-center">
                                        <span className="text-sm font-black italic tracking-tighter text-white/40 drop-shadow-sm group-hover/item:text-secondary transition-colors">
                                            {event.minute}'
                                        </span>
                                    </div>

                                    {/* Icon & Connector */}
                                    <div className="relative flex flex-col items-center">
                                        <div className={cn(
                                            "w-10 h-10 flex items-center justify-center rounded-none border border-white/10 p-2 z-10 transition-all group-hover/item:scale-110",
                                            event.event_type === 'goal' ? "bg-secondary text-black" : "bg-white/5 text-white/50"
                                        )}>
                                            {evtConfig && <evtConfig.icon className="h-5 w-5" />}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 py-3 px-4 bg-white/5 border border-white/5 group-hover/item:bg-white/10 group-hover/item:border-white/10 transition-all relative">
                                        {/* Status Accent Bar */}
                                        <div className={cn("absolute top-0 left-0 w-[2px] h-full", accentColor)} />
                                        
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest italic",
                                                        event.event_type === 'goal' ? "text-secondary" : "text-white/40"
                                                    )}>
                                                        {event.event_type === 'penalty_shot' 
                                                            ? (event.extra_info?.scored ? t("penalty_scored") : t("penalty_missed"))
                                                            : t(evtConfig?.label || event.event_type)}
                                                    </span>
                                                    <span className="text-[10px] text-white/20">•</span>
                                                    <span className="text-[10px] font-black uppercase italic tracking-tighter text-white truncate max-w-[120px]">
                                                        {isHome ? match.home_team?.name : match.away_team?.name}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-black uppercase italic tracking-widest text-white truncate">
                                                    {event.player_name || "Match Event"}
                                                </p>
                                                {event.extra_info?.reason && (
                                                    <p className="text-[9px] text-white/40 italic mt-1 font-medium">{event.extra_info.reason}</p>
                                                )}
                                            </div>

                                            {!readOnly && onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100 transition-all"
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
