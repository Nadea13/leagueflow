"use client";

import { Match, MatchEvent } from "@/types";
import { VOLLEYBALL_EVENT_TYPES } from "./constants";
import { Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

interface EventLogProps {
    events: MatchEvent[];
    match?: Match;
    homeTeamId?: string;
    awayTeamId?: string;
    readOnly?: boolean;
    onDeleteEvent?: (id: string) => void;
}

export function VolleyballEventLog({
    events,
    match,
    homeTeamId,
    awayTeamId,
    readOnly = false,
    onDeleteEvent
}: EventLogProps) {
    const t = useTranslations("Console");

    const resolvedHomeId = match?.home_team_id || match?.home_team?.id || homeTeamId;
    const resolvedAwayId = match?.away_team_id || match?.away_team?.id || awayTeamId;

    const isHomeEvent = (e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'home') return true;
        if (extra?.team_side === 'away') return false;

        if (e.team_id) {
            if (e.team_id === resolvedHomeId) return true;
            if (e.team_id === resolvedAwayId) return false;
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
            if (e.team_id === resolvedAwayId) return true;
            if (e.team_id === resolvedHomeId) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return true;
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return false;

        return false;
    };

    const getSetNumber = (e: MatchEvent) => {
        const extraSet = (e.extra_info as Record<string, unknown> | null)?.set;
        return typeof extraSet === 'number' ? extraSet : (e.minute || 1);
    };

    return (
        <div className="bg-card border rounded-sm relative overflow-hidden group w-full">
            <div className="relative z-10">
                <div className="overflow-y-auto no-scrollbar scroll-smooth">
                    {!events || events.length === 0 ? (
                        <EmptyState
                            icon={Clock}
                            title={t("no_events") || "No events yet"}
                            description={t("live_updates_desc") || "Live match updates will appear here"}
                        />
                    ) : (
                        events.map((event: MatchEvent) => {
                            const evtConfig = VOLLEYBALL_EVENT_TYPES.find(e => e.type === event.event_type);
                            const Icon = evtConfig?.icon || Clock;

                            const isHome = isHomeEvent(event);
                            const isAway = isAwayEvent(event);
                            const isNeutral = !isHome && !isAway;

                            const setNum = getSetNumber(event);
                            const extra = event.extra_info as Record<string, unknown> | null;
                            const textDesc = typeof extra?.text === 'string' ? extra.text : null;
                            const playerName = event.player_name || (extra?.player_name as string | undefined);

                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "relative flex items-center gap-1 lg:gap-2 group/item w-full p-2 lg:p-4 transition-all duration-300",
                                        isNeutral ? "flex-row justify-center" : (isHome ? "flex-row" : "flex-row-reverse"),
                                        event.isPending && "opacity-50 select-none animate-pulse"
                                    )}
                                >
                                    {/* Set Indicator */}
                                    {!isNeutral && (
                                        <div className="w-12 flex flex-col items-center shrink-0">
                                            <span className="text-[10px] font-black tracking-tighter text-muted-foreground group-hover/item:text-foreground">
                                                SET {setNum}
                                            </span>
                                        </div>
                                    )}

                                    {/* Event Card Content */}
                                    <div className={cn(
                                        "flex-1 min-w-0 transition-all relative rounded-sm p-2 border bg-muted/10",
                                        isNeutral ? "py-2" : "border-foreground/10",
                                        !isNeutral && (isHome ? "text-left" : "text-right")
                                    )}>
                                        <div className={cn(
                                            "flex items-center justify-between gap-2",
                                            isNeutral ? "flex-row" : (isHome ? "flex-row" : "flex-row-reverse")
                                        )}>
                                            {isNeutral ? (
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="flex-1 h-[1px] bg-primary/40" />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-black tracking-wider text-primary flex items-center gap-1">
                                                            <Icon className={cn("h-3.5 w-3.5", evtConfig?.color || "text-primary")} />
                                                            {evtConfig?.label?.toUpperCase() || event.event_type.toUpperCase()}
                                                            {event.isPending && ` (${t("pending")})`}
                                                        </span>
                                                        <span className="text-xs font-bold text-muted-foreground">
                                                            SET {setNum}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 h-[1px] bg-primary/40" />
                                                </div>
                                            ) : (
                                                <div className="min-w-0 flex-1">
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        isHome ? "justify-start" : "justify-end"
                                                    )}>
                                                        <div className="p-1 rounded bg-background border shrink-0">
                                                            <Icon className={cn("h-3.5 w-3.5", evtConfig?.color || "text-primary")} />
                                                        </div>
                                                        <span className={cn(
                                                            "text-xs font-black tracking-widest capitalize",
                                                            evtConfig?.color || "text-foreground"
                                                        )}>
                                                            {evtConfig?.label || event.event_type.replace('_', ' ')}
                                                            {event.isPending && ` (${t("pending")})`}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <span className="text-xs font-bold truncate max-w-[140px]">
                                                            {isHome ? (match?.home_team?.name || 'Home') : (match?.away_team?.name || 'Away')}
                                                        </span>
                                                    </div>

                                                    {playerName && playerName !== 'Team' && (
                                                        <p className="text-xs font-bold text-foreground tracking-wide truncate">
                                                            {playerName}
                                                        </p>
                                                    )}
                                                    {textDesc && (
                                                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                            {textDesc}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {!readOnly && onDeleteEvent && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                                                    onClick={() => onDeleteEvent(event.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
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
