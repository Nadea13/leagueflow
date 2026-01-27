"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPlayers } from "@/app/[locale]/dashboard/tournaments/[id]/player-actions";
import { addMatchEvent, deleteMatchEvent, getMatchEvents } from "@/app/[locale]/dashboard/tournaments/[id]/event-actions"; // New Import
import { updateMatch } from "@/app/[locale]/dashboard/tournaments/[id]/actions";

import {
    Flag, Play, Pause, Plus, Timer, Trash2, AlertTriangle, Trophy,
    Goal as IconGoal, CreditCard, RotateCw, ShieldAlert, MonitorPlay,
    Square
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Interface Definitions
import { Match, Goal, Team, Player, MatchEvent, EventType } from "@/types";

const EVENT_TYPES: { type: EventType; label: string; icon: any; color: string }[] = [
    { type: 'goal', label: 'Goal', icon: IconGoal, color: 'text-green-600' },
    { type: 'yellow_card', label: 'Yellow Card', icon: Square, color: 'text-yellow-500' },
    { type: 'red_card', label: 'Red Card', icon: Square, color: 'text-red-600' },
    { type: 'substitution', label: 'Subs', icon: RotateCw, color: 'text-blue-500' },
    { type: 'penalty', label: 'Penalty', icon: ShieldAlert, color: 'text-indigo-600' },
    { type: 'var', label: 'VAR', icon: MonitorPlay, color: 'text-purple-600' },
];

interface LiveMatchConsoleProps {
    match: Match;
    tournamentId: string;
    goals: Goal[];
    trigger?: ReactNode;
}

export function LiveMatchConsole({ match, tournamentId, goals = [], trigger }: LiveMatchConsoleProps) {
    const t = useTranslations("Console");
    const tCommon = useTranslations("Common");
    const tMatch = useTranslations("Match");
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // --- Local State (Optimistic UI) ---
    const [localEvents, setLocalEvents] = useState<MatchEvent[]>([]); // New Events State
    const [localStatus, setLocalStatus] = useState<string>(match.status);

    // Players State
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

    // Timer State (Client Side Only for MVP)
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Dialogs State
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [woDialogOpen, setWoDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Event Entry Data
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
    const [eventPlayerId, setEventPlayerId] = useState<string>("");
    const [assistPlayerId, setAssistPlayerId] = useState<string>(""); // Extra for goals
    const [subInPlayerId, setSubInPlayerId] = useState<string>(""); // Extra for subs
    const [eventMinute, setEventMinute] = useState<string>("");

    // Computed Scores from Local Events (Goals)
    const homeScore = localEvents.filter(e => e.team_id === match.home_team_id && e.event_type === 'goal').length;
    const awayScore = localEvents.filter(e => e.team_id === match.away_team_id && e.event_type === 'goal').length;

    // Fetch Data on Mount
    useEffect(() => {
        const loadData = async () => {
            // 1. Players
            if (match.home_team_id) {
                const res = await getPlayers(match.home_team_id);
                if (res.success && res.data) setHomePlayers(res.data);
            }
            if (match.away_team_id) {
                const res = await getPlayers(match.away_team_id);
                if (res.success && res.data) setAwayPlayers(res.data);
            }
            // 2. Events
            const eventRes = await getMatchEvents(match.id);
            if (eventRes.success && eventRes.data) {
                setLocalEvents(eventRes.data);
            }
        };
        loadData();
    }, [match.id, match.home_team_id, match.away_team_id]);

    // ... Timer Logic ...
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ... Sync Logic ...
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            router.refresh();
        } else {
            setLocalStatus(match.status);
            // Re-fetch events? Maybe not needed if optimistic works well
        }
    };

    // ... Handlers (Start/End/Pause) ...
    const handleStartMatch = async () => {
        setLocalStatus('live');
        setIsRunning(true);
        await updateMatch(match.id, { status: 'live' }, tournamentId);
        router.refresh();
    };

    const handlePauseMatch = () => setIsRunning(false);

    const handleEndMatch = async () => {
        if (!confirm(t("confirm_end"))) return;
        setLocalStatus('finished');
        setLoading(true);
        setIsRunning(false);

        await updateMatch(match.id, {
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore
        }, tournamentId);

        setOpen(false);
        router.refresh();
        setLoading(false);
    };

    const handleWalkover = async (winnerId: string | null | undefined) => {
        if (!winnerId || !confirm(t("confirm_walkover"))) return;
        setLocalStatus('finished');
        setLoading(true);
        const isHomeWinner = winnerId === match.home_team_id;
        await updateMatch(match.id, {
            status: 'finished',
            home_score: isHomeWinner ? 3 : 0,
            away_score: isHomeWinner ? 0 : 3,
            winner_id: winnerId
        }, tournamentId);
        setWoDialogOpen(false);
        setOpen(false);
        router.refresh();
        setLoading(false);
    };

    // --- Action Handlers ---

    const handleOpenActionDialog = (teamId: string | null | undefined, type: EventType) => {
        if (!teamId) return alert(t("error_team_missing"));

        setSelectedTeamId(teamId);
        setSelectedEventType(type);
        setEventMinute(`${Math.ceil((time || 1) / 60)}`);
        setEventPlayerId("");
        setAssistPlayerId("");
        setSubInPlayerId("");
        setEventDialogOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!selectedTeamId || !selectedEventType) return;

        const minute = parseInt(eventMinute.replace(/[^0-9]/g, '')) || 0;

        // Extra Info Construction
        let extraInfo: any = {};
        if (selectedEventType === 'goal' && assistPlayerId && assistPlayerId !== 'none') extraInfo.assist_player_id = assistPlayerId;
        if (selectedEventType === 'substitution') {
            extraInfo.out_player_id = eventPlayerId;
            extraInfo.in_player_id = subInPlayerId;
        }

        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const newEvent: MatchEvent = {
            id: tempId,
            match_id: match.id,
            team_id: selectedTeamId,
            event_type: selectedEventType,
            minute: minute,
            player_id: eventPlayerId || null,
            extra_info: extraInfo,
            created_at: new Date().toISOString(),
            // Optimistic player name lookup
            player_name: [...homePlayers, ...awayPlayers].find(p => p.id === eventPlayerId)?.name || "Unknown"
        };

        setLocalEvents(prev => [newEvent, ...prev].sort((a, b) => b.minute - a.minute));
        setEventDialogOpen(false);

        // Server Action
        const res = await addMatchEvent(match.id, selectedTeamId, selectedEventType, minute, eventPlayerId || null, extraInfo, tournamentId);

        if (!res.success) {
            console.error("Failed to add event:", res.error);
            alert("Failed to save event");
            // Revert
            setLocalEvents(prev => prev.filter(e => e.id !== tempId));
        } else {
            // Replace temp ID with real ID if needed, or just let revalidation handle it next open
            if (res.data) {
                setLocalEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: res.data.id } : e));
            }
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm(t("confirm_delete_event") || "Delete event?")) return;

        const backup = [...localEvents];
        setLocalEvents(prev => prev.filter(e => e.id !== eventId)); // Optimistic delete

        const res = await deleteMatchEvent(eventId, tournamentId);
        if (!res.success) {
            alert("Failed to delete event");
            setLocalEvents(backup);
        }
    };

    // --- RENDER ---
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className={cn("gap-2", localStatus === 'live' && "border-red-500 text-red-600")}>
                        {localStatus === 'live' && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                        {t("console")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        <DialogTitle>{t("match_console")}</DialogTitle>
                        <Badge variant={localStatus === 'live' ? 'destructive' : 'secondary'} className={localStatus === 'live' ? 'animate-pulse' : ''}>
                            {localStatus.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="font-mono text-3xl font-black text-primary tabular-nums">
                            {formatTime(time)}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => setWoDialogOpen(true)} title={t("walkover")}>
                            <Flag className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50 dark:bg-slate-950/50">

                    {/* Controls */}
                    <div className="flex justify-center">
                        {!isRunning ? (
                            <Button type="button" size="icon" className="h-20 w-20 rounded-full bg-green-600 hover:bg-green-700 shadow-xl" onClick={handleStartMatch}>
                                <Play className="h-10 w-10 ml-1 fill-current" />
                            </Button>
                        ) : (
                            <Button type="button" size="icon" variant="outline" className="h-20 w-20 rounded-full border-4" onClick={handlePauseMatch}>
                                <Pause className="h-8 w-8 fill-current" />
                            </Button>
                        )}
                    </div>

                    {/* Scoreboard */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        {/* Home */}
                        <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
                            {match.home_team?.logo_url && <img src={match.home_team.logo_url} className="w-16 h-16 object-contain" />}
                            <h3 className="font-bold text-center">{match.home_team?.name}</h3>
                            <div className="text-6xl font-black">{homeScore}</div>
                            <div className="grid grid-cols-3 gap-2 w-full mt-2">
                                {EVENT_TYPES.filter(t => t.type !== 'var').map(evt => (
                                    <Button
                                        key={evt.type}
                                        variant="outline"
                                        size="sm"
                                        className={cn("h-10 p-0 flex flex-col items-center justify-center gap-0.5", evt.color)}
                                        onClick={() => handleOpenActionDialog(match.home_team_id, evt.type)}
                                        disabled={!match.home_team_id}
                                    >
                                        <evt.icon className="h-4 w-4" />
                                        <span className="text-[10px] uppercase font-bold">{evt.label.split(' ')[0]}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="text-2xl font-black text-muted-foreground/30">VS</div>

                        {/* Away */}
                        <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
                            {match.away_team?.logo_url && <img src={match.away_team.logo_url} className="w-16 h-16 object-contain" />}
                            <h3 className="font-bold text-center">{match.away_team?.name}</h3>
                            <div className="text-6xl font-black">{awayScore}</div>
                            <div className="grid grid-cols-3 gap-2 w-full mt-2">
                                {EVENT_TYPES.filter(t => t.type !== 'var').map(evt => (
                                    <Button
                                        key={evt.type}
                                        variant="outline"
                                        size="sm"
                                        className={cn("h-10 p-0 flex flex-col items-center justify-center gap-0.5", evt.color)}
                                        onClick={() => handleOpenActionDialog(match.away_team_id, evt.type)}
                                        disabled={!match.away_team_id}
                                    >
                                        <evt.icon className="h-4 w-4" />
                                        <span className="text-[10px] uppercase font-bold">{evt.label.split(' ')[0]}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Timer className="w-4 h-4" /> {t("timeline")}
                        </div>
                        <div className="space-y-2">
                            {localEvents.length === 0 && <p className="text-center text-muted-foreground text-sm italic py-4">{t("no_events")}</p>}
                            {localEvents.map(event => {
                                const typeConfig = EVENT_TYPES.find(t => t.type === event.event_type);
                                const Icon = typeConfig?.icon || IconGoal;
                                const isHome = event.team_id === match.home_team_id;

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
                                                    {event.player_name || t("unknown_player")}
                                                    {event.event_type === 'goal' && event.extra_info?.assist_player_id && (
                                                        <span className="text-muted-foreground font-normal ml-1">
                                                            ({t("assist")}: {[...homePlayers, ...awayPlayers].find(p => p.id === event.extra_info.assist_player_id)?.name})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {typeConfig?.label} • {isHome ? tMatch("home") : tMatch("away")}
                                                </span>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteEvent(event.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={handleEndMatch}>{t("end_match")}</Button>
                </DialogFooter>

                {/* Nested Dialog: Add Event */}
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {selectedEventType && (() => {
                                    const cfg = EVENT_TYPES.find(t => t.type === selectedEventType);
                                    if (!cfg) return "Add Event";
                                    const Icon = cfg.icon;
                                    return <><Icon className={cn("h-5 w-5", cfg.color)} /> {cfg.label}</>;
                                })()}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {/* Time Input */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">{t("time")}</Label>
                                <Input
                                    value={eventMinute}
                                    onChange={e => setEventMinute(e.target.value)}
                                    className="col-span-3"
                                    type="number"
                                />
                            </div>

                            {/* Main Player Selection */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">
                                    {selectedEventType === 'substitution' ? "Player OUT" : t("player")}
                                </Label>
                                <div className="col-span-3">
                                    <Select value={eventPlayerId} onValueChange={setEventPlayerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("player_name")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(selectedTeamId === match.home_team_id ? homePlayers : awayPlayers).map((player) => (
                                                <SelectItem key={player.id} value={player.id}>
                                                    {player.number ? `#${player.number} ` : ""}{player.name}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="unknown">Unknown Player</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Conditional Inputs */}

                            {/* Goal: Assist */}
                            {selectedEventType === 'goal' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">{t("assist")}</Label>
                                    <div className="col-span-3">
                                        <Select value={assistPlayerId} onValueChange={setAssistPlayerId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("no_assist")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t("no_assist")}</SelectItem>
                                                {(selectedTeamId === match.home_team_id ? homePlayers : awayPlayers).map((player) => (
                                                    <SelectItem key={player.id} value={player.id}>
                                                        {player.number ? `#${player.number} ` : ""}{player.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Substitution: Player IN */}
                            {selectedEventType === 'substitution' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Player IN</Label>
                                    <div className="col-span-3">
                                        <Select value={subInPlayerId} onValueChange={setSubInPlayerId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Player In" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(selectedTeamId === match.home_team_id ? homePlayers : awayPlayers).map((player) => (
                                                    <SelectItem key={player.id} value={player.id}>
                                                        {player.number ? `#${player.number} ` : ""}{player.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setEventDialogOpen(false)}>{tCommon("cancel")}</Button>
                            <Button type="button" onClick={handleSaveEvent} disabled={!eventPlayerId}>{tCommon("save")}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Nested Dialog: W.O. */}
                <Dialog open={woDialogOpen} onOpenChange={setWoDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> {t("walkover")}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <Button type="button" variant="outline" className="h-24 flex flex-col gap-2 border-2 hover:border-primary" onClick={() => handleWalkover(match.home_team_id)}>
                                <Trophy className="w-6 h-6 mb-1" />
                                <span className="font-bold">{match.home_team?.name} {t("wins")}</span>
                            </Button>
                            <Button type="button" variant="outline" className="h-24 flex flex-col gap-2 border-2 hover:border-primary" onClick={() => handleWalkover(match.away_team_id)}>
                                <Trophy className="w-6 h-6 mb-1" />
                                <span className="font-bold">{match.away_team?.name} {t("wins")}</span>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </DialogContent>
        </Dialog>
    );
}