'use client'

import { Match, MatchEvent, Player } from "@/types";
import { EVENT_TYPES } from "./constants";
import { Trash2, Clock } from "lucide-react";
// Removed unused Card, CardContent imports
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

interface EventLogProps {
    events: MatchEvent[];
    match: Match;
    readOnly?: boolean;
    onDelete?: (eventId: string) => void;
    players?: Player[];
}

export function EventLog({ events, match, readOnly = false, onDelete, players = [] }: EventLogProps) {
    const t = useTranslations("Console");

    return (
        <div className="bg-card border rounded-sm relative overflow-hidden group">
            <div className="relative z-10">
                <div className="overflow-y-auto no-scrollbar scroll-smooth">
                    {events.length === 0 ? (
                        <EmptyState
                            icon={Clock}
                            title={t("no_events") || "No events yet"}
                            description={t("live_updates_desc") || "Live match updates will appear here"}
                        />
                    ) : (
                        events.map((event: MatchEvent) => {
                            const evtConfig = EVENT_TYPES.find(e => e.type === event.event_type);
                            const globalEventTypes = ['kick_off', 'half_time', 'full_time', 'match_paused', 'match_resumed', 'add_time'];
                            const isNeutral = !event.team_id || globalEventTypes.includes(event.event_type);
                            const isHome = !isNeutral && event.team_id === match.home_team_id;
                            const isUnknownPlayer = 
                                !event.player_name ||
                                event.player_id === 'unknown' ||
                                event.player_name.toLowerCase() === 'unknown' ||
                                event.player_name === 'ไม่ระบุชื่อ' ||
                                event.player_name === 'Unknown Player';
                            
                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "relative flex items-center gap-1 lg:gap-2 group/item w-full p-2 lg:p-4 transition-all duration-300",
                                        isNeutral ? "flex-row justify-center" : (isHome ? "flex-row" : "flex-row-reverse"),
                                        event.isPending && "opacity-75 select-none"
                                    )}
                                >
                                    {/* Minute Indicator (Hidden for neutral events) */}
                                    {!isNeutral && (
                                        <div className="w-10 flex flex-col items-center">
                                            <span className="text-xs font-black tracking-tighter drop-shadow-sm transition-colors text-muted-foreground group-hover/item:text-foreground">
                                                {event.event_type === 'penalty_shot' ? 'PSO' : `${event.minute}'`}
                                            </span>
                                        </div>
                                    )}

                                    <div className={cn(
                                        "flex-1 min-w-0 transition-all relative rounded-sm",
                                        isNeutral ? "py-2" : "p-1 lg:p-2 border",
                                        !isNeutral && (isHome ? "text-left" : "text-right")
                                    )}>
                                        <div className={cn(
                                            "flex items-center justify-between gap-1 lg:gap-2",
                                            isNeutral ? "flex-row" : (isHome ? "flex-row" : "flex-row-reverse")
                                        )}>
                                            {isNeutral ? (
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="flex-1 h-[1px] bg-primary/40" />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-black tracking-wider text-primary">
                                                            {t(evtConfig?.label || event.event_type)}
                                                            {event.isPending && ` (${t("pending")})`}
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
                                                        "flex items-center gap-2",
                                                        isNeutral ? "justify-center" : (isHome ? "flex-row" : "flex-row-reverse")
                                                    )}>
                                                        <span className={cn(
                                                            "text-xs font-black tracking-widest",
                                                            event.event_type === 'goal' ? "text-primary" :
                                                            event.event_type === 'yellow_card' ? "text-yellow-500" :
                                                            event.event_type === 'red_card' ? "text-red-500" :
                                                            (isNeutral ? "text-foreground/60" : "text-muted-foreground")
                                                        )}>
                                                            {event.event_type === 'penalty_shot'
                                                                ? (event.extra_info?.scored ? t("penalty_scored") : t("penalty_missed"))
                                                                : t(evtConfig?.label || event.event_type)}
                                                            {event.isPending && ` (${t("pending")})`}
                                                        </span>
                                                        {!isNeutral && (
                                                            <>
                                                                 <span className="text-xs">•</span>
                                                                 <span className="text-xs font-bold truncate max-w-[120px]">
                                                                    {isHome ? match.home_team?.name : match.away_team?.name}
                                                                 </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {event.event_type === 'substitution' ? (
                                                        <p className="text-xs font-black tracking-widest truncate text-foreground">
                                                            <span className="text-red-500">▼ {t("out_lbl")}:</span> {String(event.extra_info?.out_player_name || t("unknown_player"))} {" "}
                                                            <span className="text-emerald-500">▲ {t("in_lbl")}:</span> {String(event.extra_info?.in_player_name || t("unknown_player"))}
                                                        </p>
                                                    ) : (
                                                        <div className={cn(
                                                            "text-xs font-black tracking-widest flex flex-wrap items-center gap-1.5",
                                                            event.event_type === 'yellow_card' ? "text-yellow-500" :
                                                            event.event_type === 'red_card' ? "text-red-500" : "text-foreground",
                                                            isNeutral ? "justify-center" : (isHome ? "justify-start" : "justify-end")
                                                        )}>
                                                            {!isUnknownPlayer && <span>{event.player_name}</span>}

                                                            {/* Own Goal badge */}
                                                            {!!(event.extra_info as Record<string, unknown> | null)?.is_own_goal && (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-xs border border-destructive/20">
                                                                    {t("own_goal") || "ทำเข้าประตูตัวเอง"}
                                                                    {!!(event.extra_info as Record<string, unknown> | null)?.own_goal_player_name && (
                                                                        <span className="font-semibold">({String((event.extra_info as Record<string, unknown>).own_goal_player_name)})</span>
                                                                    )}
                                                                </span>
                                                            )}

                                                            {/* Foul extras: card, penalty, fouled player */}
                                                            {event.event_type === 'foul' && (() => {
                                                                const cardType = (event.extra_info as Record<string, unknown> | null)?.card_type as string | undefined;
                                                                const isPen = !!(event.extra_info as Record<string, unknown> | null)?.is_penalty;
                                                                const fouledName = (event.extra_info as Record<string, unknown> | null)?.fouled_player_name as string | undefined;
                                                                return (
                                                                    <span className="inline-flex flex-wrap items-center gap-1 text-[11px] font-bold text-muted-foreground">
                                                                        {cardType === 'yellow' && (
                                                                            <span className="inline-flex items-center gap-1 text-amber-500 font-bold mt-1">
                                                                                <span className="w-2 h-3 bg-amber-400 rounded-xs inline-block" />
                                                                                {t("yellow_card")}
                                                                            </span>
                                                                        )}
                                                                        {cardType === 'red' && (
                                                                            <span className="inline-flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                                                                <span className="w-2 h-3 bg-red-600 rounded-xs inline-block" />
                                                                                {t("red_card")}
                                                                            </span>
                                                                        )}
                                                                        {isPen && (
                                                                            <span className="text-destructive font-black bg-destructive/10 px-1.5 py-0.5 rounded-xs border border-destructive/20">
                                                                                ⚽ {t("penalty")}
                                                                            </span>
                                                                        )}
                                                                        {fouledName && (
                                                                            <span className="text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-xs">
                                                                                {t("fouled_player")}: {fouledName}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                );
                                                            })()}

                                                            {/* Second yellow indicator for red card */}
                                                            {!!(event.extra_info as Record<string, unknown> | null)?.is_second_yellow && (
                                                                <span className="inline-flex items-center text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-xs border border-amber-500/20">
                                                                    (2nd Yellow)
                                                                </span>
                                                            )}

                                                            {/* Goal assist info */}
                                                            {event.event_type === 'goal' && (() => {
                                                                const assistId = (event.extra_info as Record<string, unknown> | null)?.assist_player_id as string | undefined;
                                                                if (!assistId || assistId === 'none') return null;
                                                                const assistName = ((event.extra_info as Record<string, unknown> | null)?.assist_player_name as string | undefined) || 
                                                                    players?.find(p => p.id === assistId)?.name;
                                                                if (!assistName) return null;
                                                                return (
                                                                    <span className="text-muted-foreground text-[11px] font-semibold bg-muted/40 px-1.5 py-0.5 rounded-xs">
                                                                        {t("assist")}: {assistName}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                    {!!(event.extra_info as Record<string, unknown> | null)?.reason && (
                                                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{String((event.extra_info as Record<string, unknown>).reason)}</p>
                                                    )}
                                                </div>
                                            )}

                                            {!readOnly && onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="h-8 w-8 text-foreground/20 hover:text-destructive hover:bg-destructive/10 opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
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
