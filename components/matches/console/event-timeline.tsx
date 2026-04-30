'use client'

import { Match, MatchEvent } from "@/types";
import { EVENT_TYPES } from "./constants";
import { Trash2, Clock } from "lucide-react";
// Removed unused Card, CardContent imports
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

interface EventTimelineProps {
    events: MatchEvent[];
    match: Match;
    readOnly?: boolean;
    onDelete?: (eventId: string) => void;
}

export function EventTimeline({ events, match, readOnly = false, onDelete }: EventTimelineProps) {
    const t = useTranslations("Console");

    return (
        <div className="bg-card border border-foreground/5 relative overflow-hidden group">
            <div className="px-4 pt-2 md:px-6 md:pt-6 flex items-center justify-between px-4 relative z-10">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black tracking-widest text-secondary">{t("match_log") || "Match Log"}</h3>
                    <p className="text-[8px] text-muted-foreground">CHRONOLOGICAL EVENT HISTORY</p>
                </div>
            </div>

            <div className="px-4 md:px-6 my-2 md:my-3">
                <div className="border-t border-foreground/5"/>
            </div>

            <div className="relative z-10">
                <div className="max-h-[500px] overflow-y-auto px-4 pb-4 md:px-6 md:pb-6 space-y-2 md:space-y-3 no-scrollbar scroll-smooth">
                    {events.length === 0 ? (
                        <EmptyState
                            icon={Clock}
                            title={t("no_events") || "No events yet"}
                            description="Live match updates will appear here"
                            className="py-12 border-none bg-transparent min-h-0"
                        />
                    ) : (
                        events.map((event: any) => {
                            const evtConfig = EVENT_TYPES.find(e => e.type === event.event_type);
                            const globalEventTypes = ['kick_off', 'half_time', 'full_time', 'match_paused', 'match_resumed', 'add_time'];
                            const isNeutral = !event.team_id || globalEventTypes.includes(event.event_type);
                            const isHome = !isNeutral && event.team_id === match.home_team_id;
                            const accentColor = isNeutral ? 'bg-foreground/20' :
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
                                                "text-sm font-black tracking-tighter drop-shadow-sm transition-colors",
                                                isHome ? "text-foreground/40 group-hover/item:text-secondary" : "text-foreground/40 group-hover/item:text-foreground"
                                            )}>
                                                {event.minute}&apos;
                                            </span>
                                        </div>
                                    )}

                                    <div className={cn(
                                        "flex-1 min-w-0 transition-all relative",
                                        isNeutral ? "py-2" : "p-2 md:p-3 bg-foreground/5 border border-foreground/5 group-hover/item:bg-foreground/10 group-hover/item:border-foreground/10",
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
                                                        <span className="text-[10px] font-black tracking-[0.3em] text-secondary drop-shadow-md">
                                                            {t(evtConfig?.label || event.event_type)}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-foreground/40">
                                                                {event.minute}&apos;
                                                            </span>
                                                            {event.extra_info?.added_minutes && (
                                                                <span className="text-sm1 font-black text-foreground/40">
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
                                                            "text-[9px] font-black tracking-widest",
                                                            event.event_type === 'goal' ? "text-secondary" : (isNeutral ? "text-foreground/60" : "text-foreground/40")
                                                        )}>
                                                            {event.event_type === 'penalty_shot' 
                                                                ? (event.extra_info?.scored ? t("penalty_scored") : t("penalty_missed"))
                                                                : t(evtConfig?.label || event.event_type)}
                                                        </span>
                                                        {!isNeutral && (
                                                            <>
                                                                <span className="text-[10px] text-foreground/20">•</span>
                                                                <span className="text-[10px] font-black tracking-tighter text-foreground truncate max-w-[120px]">
                                                                    {isHome ? match.home_team?.name : match.away_team?.name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <p className={cn(
                                                        "text-xs font-black tracking-widest text-foreground truncate",
                                                        isNeutral ? "text-center" : ""
                                                    )}>
                                                        {event.player_name || "Match Event"}
                                                    </p>
                                                    {event.extra_info?.reason && (
                                                        <p className="text-[9px] text-foreground/40 mt-1 font-medium">{event.extra_info.reason}</p>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {!readOnly && onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
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
