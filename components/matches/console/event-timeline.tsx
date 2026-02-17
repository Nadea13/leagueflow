import { MatchEvent, Match } from "@/types";
import { Button } from "@/components/ui/button";
import { Timer, Trash2, Flag, Play, Pause, Square, Goal as IconGoal } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_TYPES } from "./constants";
import { useTranslations } from "next-intl";

interface EventTimelineProps {
    events: MatchEvent[];
    match: Match;
    players: any[]; // Combined Home + Away players for lookup
    readOnly?: boolean;
    onDelete: (eventId: string) => void;
}

export function EventTimeline({ events, match, players, readOnly = false, onDelete }: EventTimelineProps) {
    const t = useTranslations("Console");
    const tMatch = useTranslations("Match");

    return (
        <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Timer className="w-4 h-4" /> {t("timeline")}
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {events.length === 0 && <p className="text-center text-muted-foreground text-sm italic py-4">{t("no_events")}</p>}
                {events.map(event => {
                    const isAddTime = event.event_type === 'add_time';
                    const isSystemEvent = ['kick_off', 'half_time', 'full_time'].includes(event.event_type);

                    // Render Logic
                    if (isAddTime) {
                        return (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded border border-dashed border-slate-300 text-sm">
                                <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-400">
                                    <Timer className="w-4 h-4" />
                                    <span>{t("added_time_msg", { min: event.extra_info?.added_minutes || '?' })}</span>
                                    <span className="text-xs font-normal text-muted-foreground ml-2">(@ {event.minute}')</span>
                                </div>
                                {!readOnly && (
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={() => onDelete(event.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    }

                    if (isSystemEvent) {
                        let label = "";
                        let icon = Flag;
                        switch (event.event_type) {
                            case 'kick_off': label = t("kick_off"); icon = Play; break;
                            case 'half_time': label = t("half_time"); icon = Pause; break;
                            case 'full_time': label = t("full_time"); icon = Square; break;
                        }
                        const SysIcon = icon;
                        return (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border border-l-4 border-l-primary/50 text-sm">
                                <div className="flex items-center gap-3 font-bold text-primary">
                                    <SysIcon className="w-4 h-4" />
                                    <span>{label}</span>
                                    <span className="text-xs font-normal text-muted-foreground ml-2">(@ {event.minute}')</span>
                                </div>
                                {!readOnly && (
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={() => onDelete(event.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    }

                    const typeConfig = EVENT_TYPES.find(t => t.type === event.event_type);
                    const Icon = typeConfig?.icon || IconGoal;
                    const isHome = event.team_id === match.home_team_id;

                    // Resolve Player Names (Optimistic or prop based)
                    const playerName = event.player_name || t("unknown_player");
                    const assistPlayerName = event.extra_info?.assist_player_id
                        ? players.find(p => p.id === event.extra_info.assist_player_id)?.name
                        : null;

                    return (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border text-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center min-w-[30px]">
                                    <span className="font-mono font-bold text-blue-600">{event.minute}'</span>
                                </div>
                                <div className={cn("p-1.5 rounded-full bg-muted/50", typeConfig?.color)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {playerName}
                                        {event.event_type === 'goal' && assistPlayerName && (
                                            <span className="text-muted-foreground font-normal ml-1">
                                                ({t("assist")}: {assistPlayerName})
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {typeConfig?.label && t(typeConfig.label)} • {isHome ? tMatch("home") : tMatch("away")}
                                    </span>
                                </div>
                            </div>
                            {!readOnly && (
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={() => onDelete(event.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
