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
        <div className="bg-background border rounded-xl relative overflow-hidden group">
            <div className="px-2 py-2 md:px-4 md:py-4 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black tracking-tighter text-foreground">{t("match_log") || "Match Log"}</h3>
                </div>
            </div>

            <div className="relative z-10">
                <div className="max-h-[500px] overflow-y-auto px-2 pb-2 md:px-4 md:pb-4 space-y-2 md:space-y-4 no-scrollbar scroll-smooth">
                    {events.length === 0 ? (
                        <EmptyState
                            icon={Clock}
                            title={t("no_events") || "No events yet"}
                            description="Live match updates will appear here"
                            className="py-12 min-h-0"
                        />
                    ) : (
                        events.map((event: MatchEvent) => {
                            const evtConfig = EVENT_TYPES.find(e => e.type === event.event_type);
                            const globalEventTypes = ['kick_off', 'half_time', 'full_time', 'match_paused', 'match_resumed', 'add_time'];
                            const isNeutral = !event.team_id || globalEventTypes.includes(event.event_type);
                            const isHome = !isNeutral && event.team_id === match.home_team_id;
                            
                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "relative flex items-center gap-2 md:gap-4 group/item w-full",
                                        isNeutral ? "flex-row justify-center" : (isHome ? "flex-row" : "flex-row-reverse")
                                    )}
                                >
                                    {/* Minute Indicator (Hidden for neutral events) */}
                                    {!isNeutral && (
                                        <div className="w-6 flex flex-col items-center">
                                            <span className={cn(
                                                "text-sm font-black tracking-tighter drop-shadow-sm transition-colors",
                                                isHome ? "text-muted-foreground group-hover/item:text-primary" : "text-muted-foreground group-hover/item:text-foreground"
                                            )}>
                                                {event.minute}&apos;
                                            </span>
                                        </div>
                                    )}

                                    <div className={cn(
                                        "flex-1 min-w-0 transition-all relative rounded-sm",
                                        isNeutral ? "py-2" : "p-2 md:p-4 bg-foreground/5 border border-foreground/5 group-hover/item:bg-foreground/10 group-hover/item:border-foreground/10",
                                        !isNeutral && (isHome ? "text-left" : "text-right")
                                    )}>
                                        <div className={cn(
                                            "flex items-center justify-between gap-4",
                                            isNeutral ? "flex-row" : (isHome ? "flex-row" : "flex-row-reverse")
                                        )}>
                                            {isNeutral ? (
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="flex-1 h-[1px] bg-primary/40" />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-black tracking-wider text-primary">
                                                            {t(evtConfig?.label || event.event_type)}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-muted-foreground">
                                                                {event.minute}&apos;
                                                            </span>
                                                            {!!(event.extra_info as Record<string, unknown> | null)?.added_minutes && (
                                                                <span className="text-sm font-black text-muted-foreground">
                                                                    (+{String((event.extra_info as Record<string, unknown>).added_minutes)} MIN)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 h-[1px] bg-primary/40" />
                                                </div>
                                            ) : (
                                                <div className="min-w-0">
                                                    <div className={cn(
                                                        "flex items-center gap-2 mb-1",
                                                        isNeutral ? "justify-center" : (isHome ? "flex-row" : "flex-row-reverse")
                                                    )}>
                                                        <span className={cn(
                                                            "text-[10px] font-black tracking-widest",
                                                            event.event_type === 'goal' ? "text-primary" :
                                                            event.event_type === 'yellow_card' ? "text-yellow-500" :
                                                            event.event_type === 'red_card' ? "text-red-500" :
                                                            (isNeutral ? "text-foreground/60" : "text-muted-foreground")
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
                                                        "text-xs font-black tracking-widest truncate",
                                                        event.event_type === 'yellow_card' ? "text-yellow-500" :
                                                        event.event_type === 'red_card' ? "text-red-500" : "text-foreground",
                                                        isNeutral ? "text-center" : ""
                                                    )}>
                                                        {event.player_name || "Match Event"}
                                                    </p>
                                                    {!!(event.extra_info as Record<string, unknown> | null)?.reason && (
                                                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{String((event.extra_info as Record<string, unknown>).reason)}</p>
                                                    )}
                                                </div>
                                            )}

                                            {!readOnly && onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-foreground/20 hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
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
