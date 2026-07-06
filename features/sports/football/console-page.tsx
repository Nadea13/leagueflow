"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getPlayers } from "@/actions/tournaments/player";
import { updateMatch, advanceStage } from "@/actions/tournaments/general";
import { getPenaltyShootout } from "@/actions/tournaments/penalty";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Timer,
    ArrowLeft,
    Target,
    Undo,
    Ban,
    Activity,
    Square,
    Repeat,
    Flag,
    Stethoscope,
    Shield,
    Tv,
    Users,
    Volleyball,
    XCircle,
    CalendarRange,
    Cloud,
    CloudOff,
    RefreshCw,
    HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

// Types
import { Match, Player, EventType, MatchEvent, PenaltyShot } from "@/types";

// Components & Hooks
import { MatchTimeControl } from "./console/time-control";
import { Scoreboard } from "./console/scoreboard";
import { EventLog } from "./console/log";
import { MatchEventDialog } from "./console/event-dialog";
import { WalkoverDialog } from "./console/walkover-dialog";
import { PenaltyShootoutDialog } from "./console/penalty-shootout-dialog";
import { AddTimeDialog, SetTimeDialog } from "./console/time-dialogs";
import { BroadcastDialog } from "./console/broadcast-dialog";
import { RosterSelectionDialog } from "./console/roster-selection-dialog";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { useMatchEvents } from "@/hooks/use-match-events";
import { EVENT_TYPES } from "./console/constants";

interface ConsolePageProps {
    match: Match;
    tournamentId: string;
    readOnly?: boolean;
    initialEvents?: MatchEvent[];
    backUrl: string;
    tournamentName?: string;
}

export function ConsolePage({ match: initialMatch, tournamentId, readOnly = false, initialEvents, backUrl, tournamentName }: ConsolePageProps) {
    const t = useTranslations("Console");
    const locale = useLocale();
    const tMatch = useTranslations("Match");
    const tCommon = useTranslations("Common");
    const tPublic = useTranslations("PublicView");
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    // --- State ---
    const [match, setMatch] = useState<Match>(initialMatch);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

    // Hooks
    const { events, queue, isSyncing, syncQueue, addEvent, deleteEvent } = useMatchEvents(match.id, tournamentId, initialEvents, readOnly);
    const { time, setTime, isRunning, setIsRunning } = useMatchTimer(match, tournamentId, events);

    // Match updates queue state
    const [matchQueue, setMatchQueue] = useState<{
        id: string;
        data: Parameters<typeof updateMatch>[1];
        status: "pending" | "syncing" | "failed";
    }[]>([]);
    const [isMatchSyncing, setIsMatchSyncing] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`leagueflow-pending-match-${match.id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setTimeout(() => {
                        setMatchQueue(parsed);
                    }, 0);
                } catch (_) {}
            }
        }
    }, [match.id]);

    const saveMatchQueue = useCallback((newQueue: typeof matchQueue) => {
        setMatchQueue(newQueue);
        if (typeof window !== "undefined") {
            localStorage.setItem(`leagueflow-pending-match-${match.id}`, JSON.stringify(newQueue));
        }
    }, [match.id]);

    const syncMatchQueue = useCallback(async () => {
        if (isMatchSyncing || readOnly) return;
        const currentQueue = [...matchQueue];
        if (currentQueue.length === 0) return;

        setIsMatchSyncing(true);
        const updated = [...currentQueue];

        for (let i = 0; i < updated.length; i++) {
            const item = updated[i];
            if (item.status === 'syncing') continue;
            
            item.status = 'syncing';
            saveMatchQueue([...updated]);

            try {
                const res = await updateMatch(match.id, item.data, tournamentId);
                if (res.success) {
                    updated.splice(i, 1);
                    i--;
                } else {
                    item.status = 'failed';
                }
            } catch (_) {
                item.status = 'failed';
            }
            saveMatchQueue([...updated]);
        }
        setIsMatchSyncing(false);
    }, [match.id, tournamentId, matchQueue, isMatchSyncing, readOnly, saveMatchQueue]);

    // Auto-sync match queue on online event
    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleOnline = () => {
                syncMatchQueue();
            };
            window.addEventListener("online", handleOnline);
            return () => window.removeEventListener("online", handleOnline);
        }
    }, [syncMatchQueue]);

    // Trigger sync automatically when queue receives new items
    useEffect(() => {
        if (matchQueue.some(item => item.status === 'pending')) {
            syncMatchQueue();
        }
    }, [matchQueue, syncMatchQueue]);

    const queueMatchUpdate = useCallback(async (data: Parameters<typeof updateMatch>[1]) => {
        const newItem = { id: `match-${Date.now()}`, data, status: 'pending' as const };
        saveMatchQueue([...matchQueue, newItem]);
        setMatch(prev => ({ ...prev, ...data }));
    }, [matchQueue, saveMatchQueue]);

    const isHalfTime = !isRunning && events.length > 0 && (() => {
        const lastTimerEvent = events.find(e =>
            e.event_type === 'kick_off' ||
            e.event_type === 'match_resumed' ||
            e.event_type === 'match_paused' ||
            e.event_type === 'half_time' ||
            e.event_type === 'full_time'
        );
        return lastTimerEvent?.event_type === 'half_time';
    })();

    // Lineup / Roster Selection States
    const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
    const [homeLineup, setHomeLineup] = useState<string[]>([]);
    const [awayLineup, setAwayLineup] = useState<string[]>([]);

    // Dialog States
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [woDialogOpen, setWoDialogOpen] = useState(false);
    const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false);
    const [setTimeDialogOpen, setSetTimeDialogOpen] = useState(false);
    const [overlayDialogOpen, setOverlayDialogOpen] = useState(false);
    const [_penaltyShots, setPenaltyShots] = useState<PenaltyShot[]>([]);

    // Event Selection State
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

    // Confirm Dialog State
    const [confirmConfig, setConfirmConfig] = useState<{
        open: boolean;
        title: string;
        description?: string;
        actionLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void | Promise<void>;
    }>({
        open: false,
        title: "",
        description: "",
        actionLabel: "",
        cancelLabel: "",
        onConfirm: () => {},
    });

    // --- Effects ---
    useEffect(() => {
        setMatch(initialMatch);
    }, [initialMatch]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`match-lineup-${match.id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.home) setHomeLineup(parsed.home);
                    if (parsed.away) setAwayLineup(parsed.away);
                } catch (e) {
                    console.error("Failed to parse saved lineup:", e);
                }
            } else if (!readOnly && match.status !== 'live' && match.status !== 'finished') {
                setRosterDialogOpen(true);
            }
        }
    }, [match.id, match.status, readOnly]);

    const handleSaveLineup = (homeActive: string[], awayActive: string[]) => {
        setHomeLineup(homeActive);
        setAwayLineup(awayActive);
        if (typeof window !== "undefined") {
            localStorage.setItem(
                `match-lineup-${match.id}`,
                JSON.stringify({ home: homeActive, away: awayActive })
            );
        }
    };

    useEffect(() => {
        const loadPlayers = async () => {
            const fetchTeam = async (teamId: string, setter: (players: Player[]) => void) => {
                const { data: ttData } = await supabase
                    .from("tournament_teams")
                    .select("id")
                    .eq("team_id", teamId)
                    .eq("tournament_category_id", match.tournament_category_id)
                    .is("deleted_at", null)
                    .maybeSingle();

                const targetId = ttData?.id || teamId;
                const res = await getPlayers(targetId);
                if (res.success && res.data) setter(res.data);
            };
            if (match.home_team_id) fetchTeam(match.home_team_id, setHomePlayers);
            if (match.away_team_id) fetchTeam(match.away_team_id, setAwayPlayers);
        };
        loadPlayers();
    }, [match.home_team_id, match.away_team_id, match.tournament_category_id, supabase]);

    const fetchShots = useCallback(async () => {
        const res = await getPenaltyShootout(match.id);
        if (res.success && res.data) {
            setPenaltyShots(res.data);
            router.refresh();
        }
    }, [match.id, router]);

    useEffect(() => {
        fetchShots();
    }, [fetchShots]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`match-${match.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
                const _newData = payload.new as Match;
                setMatch(prev => ({ ...prev, ..._newData }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [match.id]);

    // --- Computed Data ---
    const isHomeTeam = (id: string) => id === match.home_team_id || id === match.home_team?.id;
    const isAwayTeam = (id: string) => id === match.away_team_id || id === match.away_team?.id;

    const getScoreValue = (score: unknown): number => {
        if (!score) return 0;
        if (typeof score === 'object' && score !== null && 'total' in score) {
            return Number((score as Record<string, unknown>).total) || 0;
        }
        return Number(score) || 0;
    };

    const dbHomeScore = getScoreValue(match.home_score);
    const dbAwayScore = getScoreValue(match.away_score);

    const homeScore = match.status === 'finished' ? dbHomeScore : events.filter((e: MatchEvent) => e.team_id && isHomeTeam(e.team_id) && e.event_type === 'goal').length;
    const awayScore = match.status === 'finished' ? dbAwayScore : events.filter((e: MatchEvent) => e.team_id && isAwayTeam(e.team_id) && e.event_type === 'goal').length;
    const allPlayers = [...homePlayers, ...awayPlayers];

    // --- Score Sync to DB (for MatchCard) ---
    useEffect(() => {
        if (readOnly || match.status === 'finished') return;

        // Only sync if scores differ from DB values
        if (homeScore !== dbHomeScore || awayScore !== dbAwayScore) {
            const syncScore = setTimeout(() => {
                updateMatch(match.id, { home_score: homeScore, away_score: awayScore }, tournamentId);
            }, 500);
            return () => clearTimeout(syncScore);
        }
    }, [homeScore, awayScore, dbHomeScore, dbAwayScore, match.id, tournamentId, readOnly, match.status]);

    // --- Timer Sync to DB (for MatchCard) ---
    useEffect(() => {
        if (readOnly || match.status !== 'live' || !isRunning) return;

        const currentMinute = Math.floor(time / 60) + 1;

        if (currentMinute !== Number(match.current_minute)) {
            const syncTimer = setTimeout(() => {
                queueMatchUpdate({ current_minute: currentMinute });
            }, 1000);
            return () => clearTimeout(syncTimer);
        }
    }, [time, isRunning, match.status, match.current_minute, match.id, tournamentId, readOnly, queueMatchUpdate]);

    // --- Handlers ---
    const handleStartMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        // Optimistic UI Update
        setIsRunning(true);

        try {
            await addEvent(resolvedTeamId || null, 'kick_off', currentMinute, null, { start_timestamp: Date.now() }, "Kick Off");
            await queueMatchUpdate({ status: 'live', timer_status: 'playing', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("match_started") || "Match Started" });
        } catch (error) {
            console.error("Start match error:", error);
        }
    };

    const handlePauseMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        // Optimistic UI Update
        setIsRunning(false);

        try {
            await addEvent(resolvedTeamId || null, 'match_paused', currentMinute, null, {}, "Match Paused");
            await queueMatchUpdate({ timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("match_paused") || "Match Paused" });
        } catch (error) {
            console.error("Pause match error:", error);
        }
    };

    const handleHalfTime = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        // Optimistic UI Update
        setIsRunning(false);

        try {
            await addEvent(resolvedTeamId || null, 'half_time', currentMinute, null, {}, "Half Time");
            await queueMatchUpdate({ timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("half_time") || "Half Time" });
        } catch (error) {
            console.error("Half time error:", error);
        }
    };

    const handleResumeMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        // Optimistic UI Update
        setIsRunning(true);

        try {
            await addEvent(resolvedTeamId || null, 'match_resumed', currentMinute, null, { start_timestamp: Date.now() }, "Match Resumed");
            await queueMatchUpdate({ timer_status: 'playing', current_minute: currentMinute });
            toast({ title: t("match_resumed") || "Match Resumed" });
        } catch (error) {
            console.error("Resume match error:", error);
        }
    };

    const handleEndMatch = () => {
        setConfirmConfig({
            open: true,
            title: t("confirm_end") || "End Match?",
            description: t("confirm_end_desc") || "Are you sure you want to end the match and record final scores?",
            actionLabel: tCommon("confirm") || "Confirm",
            cancelLabel: tCommon("cancel") || "Cancel",
            onConfirm: async () => {
                const currentMinute = Math.floor(time / 60) + 1;
                const teamId = match.home_team_id || match.away_team_id;
                const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

                setIsRunning(false);
                await addEvent(resolvedTeamId!, 'full_time', currentMinute, null, {}, "Full Time");
                await queueMatchUpdate({ status: 'finished', home_score: homeScore, away_score: awayScore, current_minute: currentMinute });

                // Auto-advance if possible
                await advanceStage(tournamentId);
            }
        });
    };

    const handleWalkover = (winnerId: string) => {
        const isHomeWinner = winnerId === match.home_team_id;
        setConfirmConfig({
            open: true,
            title: t("confirm_walkover") || "Confirm Walkover",
            description: t("confirm_walkover_desc", { teamName: (isHomeWinner ? match.home_team?.name : match.away_team?.name) || "" }) || (isHomeWinner ? `Confirm walkover victory for ${match.home_team?.name}` : `Confirm walkover victory for ${match.away_team?.name}`),
            actionLabel: tCommon("confirm") || "Confirm",
            cancelLabel: tCommon("cancel") || "Cancel",
            onConfirm: async () => {
                try {
                    await addEvent(winnerId, 'walkover', 0, null, { winner_id: winnerId }, `Walkover Victory (${isHomeWinner ? '3-0' : '0-3'})`);
                    await queueMatchUpdate({
                        status: 'finished',
                        home_score: isHomeWinner ? 3 : 0,
                        away_score: isHomeWinner ? 0 : 3,
                        winner_id: winnerId,
                        current_minute: 0,
                        winner_to_node_id: winnerId
                    });

                    // Auto-advance if possible
                    await advanceStage(tournamentId);

                    setWoDialogOpen(false);
                    router.refresh();
                } catch (error) {
                    console.error("Walkover error:", error);
                    toast({
                        title: t("error_recording_walkover") || "Error recording walkover",
                        description: t("please_try_again") || "Please try again",
                        variant: "destructive"
                    });
                }
            }
        });
    };

    const handleAbandonMatch = () => {
        setConfirmConfig({
            open: true,
            title: t("confirm_abandon") || "Abandon Match?",
            description: t("confirm_abandon_desc") || "Are you sure you want to abandon this match?",
            actionLabel: tCommon("confirm") || "Confirm",
            cancelLabel: tCommon("cancel") || "Cancel",
            onConfirm: async () => {
                try {
                    await queueMatchUpdate({
                        status: 'canceled',
                        timer_status: 'stopped',
                    });

                    toast({ title: t("abandoned") });
                    router.refresh();
                } catch (error) {
                    console.error("Abandon match error:", error);
                    toast({
                        title: t("error_abandoning_match") || "Error abandoning match",
                        description: t("please_try_again") || "Please try again",
                        variant: "destructive"
                    });
                }
            }
        });
    };

    const handlePostponeMatch = () => {
        setConfirmConfig({
            open: true,
            title: t("confirm_postpone") || "Postpone Match?",
            description: t("confirm_postpone_desc") || "Are you sure you want to postpone this match?",
            actionLabel: tCommon("confirm") || "Confirm",
            cancelLabel: tCommon("cancel") || "Cancel",
            onConfirm: async () => {
                try {
                    await queueMatchUpdate({
                        status: 'scheduled',
                        match_date: null,
                        match_time: null,
                    });

                    toast({ title: t("postponed") });
                    router.refresh();
                } catch (error) {
                    console.error("Postpone match error:", error);
                    toast({
                        title: t("error_postponing_match") || "Error postponing match",
                        description: t("please_try_again") || "Please try again",
                        variant: "destructive"
                    });
                }
            }
        });
    };

    const handleUndo = async () => {
        if (readOnly) return;
        const lastEvent = events.find((e: MatchEvent) => !e.id.startsWith("temp-"));
        if (!lastEvent) return toast({ title: t("no_events") });

        const evtConfig = EVENT_TYPES.find(e => e.type === lastEvent.event_type);
        const label = evtConfig ? t(evtConfig.label) : lastEvent.event_type;

        setConfirmConfig({
            open: true,
            title: t("delete_confirm_title", { label }) || `${tCommon("delete")} '${label}'?`,
            description: t("delete_event_desc") || "This action cannot be undone. This event will be permanently deleted.",
            actionLabel: tCommon("delete") || "Delete",
            cancelLabel: tCommon("cancel") || "Cancel",
            onConfirm: async () => {
                const res = await deleteEvent(lastEvent.id);
                if (res && !res.success) {
                    toast({
                        title: "Error deleting event",
                        description: res.error || "Unknown error occurred",
                        variant: "destructive"
                    });
                }
            }
        });
    };

    const handleQuickAction = async (teamId: string, type: EventType) => {
        if (readOnly) return;
        if (type === 'corner') {
            const minute = Math.floor(time / 60) + 1;
            const res = await addEvent(teamId, 'corner', minute, null, {}, "Corner");
            if (res && !res.success) {
                toast({
                    title: "Error saving corner event",
                    description: res.error || "Unknown error occurred",
                    variant: "destructive"
                });
            }
            return;
        }
        setSelectedTeamId(teamId);
        setSelectedEventType(type);
        setEventDialogOpen(true);
    };

    const handleSaveEvent = async (data: { minute: number; playerId: string; extraInfo: Record<string, unknown>; autoRed?: boolean }) => {
        if (!selectedTeamId || !selectedEventType) return;
        const player = allPlayers.find(p => p.id === data.playerId);
        const playerName = player ? player.name : "Unknown";
        const res = await addEvent(selectedTeamId, data.autoRed ? 'red_card' : selectedEventType, data.minute, data.playerId, data.extraInfo, playerName);
        if (res && !res.success) {
            toast({
                title: "Error saving event",
                description: res.error || "Unknown error occurred",
                variant: "destructive"
            });
            return;
        }

        // Swap players in active lineup when substitution occurs
        if (selectedEventType === 'substitution' && data.extraInfo.in_player_id) {
            const inPlayerId = data.extraInfo.in_player_id as string;
            const outPlayerId = data.playerId;
            if (selectedTeamId === match.home_team_id) {
                const newHomeLineup = homeLineup.map(id => id === outPlayerId ? inPlayerId : id);
                setHomeLineup(newHomeLineup);
                localStorage.setItem(`match-lineup-${match.id}`, JSON.stringify({ home: newHomeLineup, away: awayLineup }));
            } else if (selectedTeamId === match.away_team_id) {
                const newAwayLineup = awayLineup.map(id => id === outPlayerId ? inPlayerId : id);
                setAwayLineup(newAwayLineup);
                localStorage.setItem(`match-lineup-${match.id}`, JSON.stringify({ home: homeLineup, away: newAwayLineup }));
            }
        }
    };

    const handleSetTime = async (minutes: number, seconds: number) => {
        const totalSeconds = (minutes * 60) + seconds;
        const currentMinute = Math.ceil((totalSeconds || 1) / 60);

        // Optimistic Update
        setTime(totalSeconds);

        await queueMatchUpdate({ elapsed_before_pause: totalSeconds, current_minute: currentMinute });
        setSetTimeDialogOpen(false);
    };

    const lastAddTimeEvent = events.find(e => e.event_type === 'add_time');
    const lastTimerMarker = events.find(e => 
        e.event_type === 'kick_off' || 
        e.event_type === 'match_resumed' || 
        e.event_type === 'match_paused' ||
        e.event_type === 'half_time' || 
        e.event_type === 'full_time'
    );
    const isAddedTimeActive = lastAddTimeEvent && lastTimerMarker 
        ? new Date(lastAddTimeEvent.created_at).getTime() > new Date(lastTimerMarker.created_at).getTime()
        : !!lastAddTimeEvent;
    const addedTime = isAddedTimeActive
        ? (lastAddTimeEvent?.extra_info as Record<string, unknown> | null)?.added_minutes as number | undefined || null
        : null;

    // --- Team Action Grid Component ---
    const TeamActionGrid = ({ teamId, name }: { teamId: string, name: string, type: 'home' | 'away' }) => {
        const actions = [
            { type: 'goal', label: t("goal"), icon: Volleyball },
            { type: 'yellow_card', label: t("yellow_card"), icon: Square, iconColor: 'text-yellow-500 fill-yellow-500' },
            { type: 'red_card', label: t("red_card"), icon: Square, iconColor: 'text-red-500 fill-red-500' },
            { type: 'substitution', label: t("substitution"), icon: Repeat },
            { type: 'foul', label: t("foul") || "Foul", icon: Activity },
            { type: 'penalty', label: t("penalty") || "Penalty", icon: Target },
            { type: 'save', label: t("save") || "Save", icon: Shield },
            { type: 'injury', label: t("injury") || "Injury", icon: Stethoscope },
            { type: 'corner', label: t("corner") || "Corner", icon: Flag },
        ];

        return (
            <div className="bg-card border rounded-xl p-2 md:p-4 relative overflow-hidden group">
                <div className="relative z-10 space-y-2 md:space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black tracking-tighter">{name}</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-1 md:gap-2">
                        {actions.map((action) => (
                            <Button
                                variant="outline"
                                key={action.type}
                                onClick={() => handleQuickAction(teamId, action.type as EventType)}
                                className="group flex items-center justify-center"
                            >
                                <action.icon className={cn("h-5 w-5 transition-transform", action.iconColor)} />
                                <span className="hidden md:inline text-[10px] font-black tracking-wider">{action.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };



    const matchControlsBox = (
        <div className="bg-card border p-2 md:p-4 relative overflow-hidden group rounded-xl" id="console-timer-control">
            <div className="relative z-10 space-y-2 md:space-y-4">
                {readOnly ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest text-foreground/40">{t("tournament")}</span>
                            <span className="text-[10px] font-black text-foreground truncate max-w-[120px]">{tournamentName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest text-foreground/40">{t("stage") || "Stage"}</span>
                            <span className="text-[10px] font-black text-primary">{match.stage || "Regular"}</span>
                        </div>
                        <div className="pt-4 border-t">
                            <div className="flex flex-col items-center gap-2 py-4 bg-primary/5 border border-primary/10">
                                <Timer className="w-6 h-6 text-primary animate-pulse" />
                                <span className="text-[8px] font-black tracking-[0.3em] text-primary/60">{t("live_updates_active").toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <MatchTimeControl
                        status={match.status}
                        isRunning={isRunning}
                        readOnly={false}
                        onStart={handleStartMatch}
                        onPause={handlePauseMatch}
                        onHalfTime={handleHalfTime}
                        onResume={handleResumeMatch}
                        onEnd={handleEndMatch}
                        onSetTime={() => setSetTimeDialogOpen(true)}
                        onAddTime={() => setAddTimeDialogOpen(true)}
                    />
                )}
            </div>
        </div>
    );

    const quickActionsBox = !readOnly ? (
        <div className="bg-card border p-2 md:p-4 relative overflow-hidden group rounded-xl" id="console-action-panel">
            <div className="relative z-10 space-y-2 md:space-y-4">
                <div className="grid grid-cols-4 md:grid-cols-1 gap-1 md:gap-2">
                    <Button
                        variant="outline"
                        onClick={handleUndo}
                        className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-foreground/5 hover:bg-foreground/10 hover:border-primary/50 transition-all group"
                    >
                        <Undo className="h-4 w-4 text-muted-foreground" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("undo")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setOverlayDialogOpen(true)}
                        className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-foreground/5 hover:bg-foreground/10 hover:border-primary/50 transition-all group"
                    >
                        <Tv className="h-4 w-4 text-primary" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("broadcast_overlay")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setRosterDialogOpen(true)}
                        className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-foreground/5 hover:bg-foreground/10 hover:border-primary/50 transition-all group"
                    >
                        <Users className="h-4 w-4 text-primary" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("select_starting_lineup") || "Lineups"}</span>
                    </Button>
                    {match.status === 'finished' && (
                        <PenaltyShootoutDialog
                            matchId={match.id}
                            homeTeamId={match.home_team_id}
                            awayTeamId={match.away_team_id}
                            homeTeamName={match.home_team?.name || 'Home'}
                            awayTeamName={match.away_team?.name || 'Away'}
                            onUpdate={fetchShots}
                            trigger={
                                <Button
                                    variant="outline"
                                    disabled={homeScore !== awayScore}
                                    className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-foreground/5 hover:bg-foreground/10 hover:border-primary/50 transition-all group disabled:opacity-50"
                                >
                                    <Target className="h-4 w-4 text-primary" />
                                    <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("penalty_shootout")}</span>
                                </Button>
                            }
                        />
                    )}
                    <Button
                        variant="outline"
                        onClick={() => setWoDialogOpen(true)}
                        className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-red-500/5 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/30 transition-all group"
                    >
                        <Ban className="h-4 w-4 text-destructive" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("walkover")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleAbandonMatch}
                        className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-red-500/5 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/30 transition-all group"
                    >
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("abandoned")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handlePostponeMatch}
                        className="w-full flex justify-center md:justify-start items-center gap-1 md:gap-2 border-foreground/5 bg-foreground/5 hover:bg-foreground/10 hover:border-primary/50 transition-all group"
                    >
                        <CalendarRange className="h-4 w-4 text-primary" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("postponed")}</span>
                    </Button>
                </div>
            </div>
        </div>
    ) : null;

    const startConsoleTutorial = () => {
        const steps = [
            {
                element: "#console-scoreboard",
                popover: {
                    title: locale === "th" ? "กระดานคะแนน (Scoreboard)" : "Scoreboard",
                    description: locale === "th" ? "แสดงชื่อทีม โลโก้ และคะแนนปัจจุบัน รวมถึงสถานะของแมตช์ (เช่น ครึ่งแรก, ครึ่งหลัง, จบการแข่งขัน)" : "Displays team names, logos, current score, and match status.",
                    side: "bottom" as const,
                    align: "start" as const
                }
            },
            {
                element: "#console-timer-control",
                popover: {
                    title: locale === "th" ? "ควบคุมเวลา (Match Timer)" : "Match Timer",
                    description: locale === "th" ? "ใช้สำหรับควบคุมเวลา เริ่ม/หยุดเวลา หรือปรับตั้งค่าเวลาของแมตช์" : "Start, pause, or configure the match clock.",
                    side: "bottom" as const,
                    align: "start" as const
                }
            },
            {
                element: "#console-action-panel",
                popover: {
                    title: locale === "th" ? "แผงควบคุมเหตุการณ์ (Events Panel)" : "Events Panel",
                    description: locale === "th" ? "กดบันทึกเหตุการณ์สำคัญในสนาม เช่น ทำประตู (Goal), ใบเหลือง/ใบแดง, เปลี่ยนตัวผู้เล่น หรือแจ้งจบการแข่งขัน" : "Log events like Goals, Cards, Substitutions, or finish the match.",
                    side: "top" as const,
                    align: "start" as const
                }
            },
            {
                element: "#console-event-log",
                popover: {
                    title: locale === "th" ? "ประวัติการแข่งขัน (Event Log)" : "Event Log",
                    description: locale === "th" ? "แสดงลำดับประวัติเหตุการณ์ทั้งหมดที่เกิดขึ้นในสนาม โดยเรียงตามนาที สามารถกดย้อนกลับ (Undo) เพื่อลบรายการที่บันทึกผิดได้" : "Chronological log of match events with undo/delete actions.",
                    side: "left" as const,
                    align: "start" as const
                }
            }
        ];

        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps
        });
        driverObj.drive();
    };

    return (
        <div className={cn(
            "min-h-screen flex flex-col font-display selection:bg-primary/30 space-y-2 md:space-y-4",
            readOnly ? "pt-18 md:pt-22 px-2 md:px-0" : "pt-0"
        )}>
            {/* Top Navigation Bar */}
            {readOnly && (
                <nav className="border-b fixed top-0 dark:border-foreground/10 left-0 right-0 z-50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 print:hidden">
                    <div className="px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                            <svg viewBox="0 0 160 160" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                                <path d="M85.4616 21.9501C86.0436 21.9471 86.6256 21.9441 87.2253 21.941C94.6778 21.9214 101.867 22.4122 109.212 23.8001C108.078 25.1269 106.944 26.4529 105.805 27.7751C104.953 28.7693 104.105 29.7682 103.268 30.7751C95.053 40.4796 85.8612 49.0996 75.6116 56.6001C75.0985 56.9801 74.5855 57.3601 74.0569 57.7517C62.719 66.1146 50.7349 73.3682 38.3116 80.0001C37.7382 80.3066 37.1648 80.6131 36.5741 80.9288C32.6149 83.0001 32.6149 83.0001 30.8116 83.0001C30.5549 81.8516 30.3068 80.7011 30.0616 79.5501C29.9223 78.9097 29.7831 78.2693 29.6397 77.6095C28.1595 68.5881 28.3166 59.5618 28.3616 50.4501C28.3656 49.0256 28.3692 47.6012 28.3725 46.1767C28.3812 42.7178 28.395 39.259 28.4116 35.8001C43.3259 28.6069 43.3259 28.6069 49.5616 26.7501C50.1967 26.5597 50.8319 26.3693 51.4864 26.1732C53.3888 25.6225 55.296 25.1029 57.2116 24.6001C58.021 24.3849 58.021 24.3849 58.8467 24.1654C67.5959 21.9748 76.496 21.9759 85.4616 21.9501Z" fill="#0D2C54" />
                                <path d="M143.612 48.5996C144.14 48.5996 144.668 48.5996 145.212 48.5996C145.95 75.4476 143.218 103.372 125.212 124.6C124.536 125.405 123.861 126.21 123.165 127.04C114.98 136.526 99.6453 150.742 86.8117 152.6C84.5742 151.628 84.5742 151.628 82.2117 150.25C81.4238 149.797 80.636 149.344 79.8242 148.878C79.2261 148.522 78.628 148.166 78.0117 147.8C78.0117 145.4 78.0117 145.4 79.3117 144.04C79.9387 143.515 80.5657 142.99 81.2117 142.45C90.2309 134.585 98.7241 126.103 106.012 116.6C106.823 115.571 107.634 114.543 108.446 113.515C123.99 93.7006 135.136 72.2987 143.612 48.5996Z" fill="#0D2C54" />
                                <path d="M128.411 7C128.675 7.528 128.939 8.056 129.211 8.6C128.486 10.2676 128.486 10.2676 127.323 12.3313C126.896 13.091 126.47 13.8508 126.03 14.6336C125.562 15.4475 125.093 16.2614 124.611 17.1C124.136 17.9304 123.661 18.7608 123.172 19.6164C114.766 34.1514 104.746 46.8321 93.2106 59C92.3567 59.9049 92.3567 59.9049 91.4856 60.8281C87.7139 64.7157 83.6366 68.1475 79.3899 71.5047C77.8355 72.739 76.2941 73.9889 74.7512 75.2375C66.616 81.759 58.2439 87.4056 49.2106 92.6C48.3451 93.1068 48.3451 93.1068 47.4621 93.6238C21.8479 108.6 21.8479 108.6 15.6106 108.6C15.3372 107.502 15.0722 106.401 14.8106 105.3C14.5878 104.381 14.5878 104.381 14.3606 103.444C13.9648 101.133 13.988 98.941 14.0106 96.6C14.5443 96.3837 15.078 96.1674 15.6279 95.9445C43.5248 84.5694 70.347 70.2494 92.4106 49.4C93.5065 48.4454 94.6064 47.4952 95.7106 46.55C101.954 41.0825 107.257 35.0974 112.411 28.6C112.769 28.1515 113.128 27.7031 113.497 27.241C118.747 20.6719 123.743 14.0008 128.411 7Z" fill="#00C49A" />
                                <path d="M132.412 16.5996C132.808 17.3916 132.808 17.3916 133.212 18.1996C132.401 20.3205 132.401 20.3205 131.121 23.009C130.893 23.4895 130.665 23.97 130.43 24.465C129.682 26.0307 128.923 27.5906 128.162 29.1496C127.905 29.6788 127.648 30.2079 127.384 30.7531C123.495 38.7442 119.335 46.2689 114.012 53.3996C113.424 54.2174 112.836 55.0352 112.23 55.8777C110.469 58.29 108.658 60.6516 106.812 62.9996C106.212 63.7638 105.613 64.5279 104.996 65.3152C94.7698 77.8603 83.0952 89.4632 70.0115 98.9996C68.8962 99.869 68.8962 99.869 67.7584 100.756C57 109.105 45.5483 116.434 33.2115 122.2C32.4195 118.24 31.6275 114.28 30.8115 110.2C31.7139 109.743 32.6162 109.286 33.5459 108.815C61.9532 94.2572 89.802 74.4553 109.729 49.166C110.957 47.616 112.202 46.0805 113.446 44.5434C119.624 36.8337 125.049 28.9151 130 20.3654C130.761 19.084 131.585 17.8399 132.412 16.5996Z" fill="#00C49A" />
                                <path d="M137.211 24.5986C138.191 27.5371 137.739 28.1896 136.565 30.983C136.234 31.7759 135.904 32.5688 135.563 33.3857C135.2 34.2315 134.836 35.0773 134.461 35.9486C133.908 37.2513 133.908 37.2513 133.343 38.5803C119.694 70.3639 98.4172 99.4369 70.8115 120.599C69.8872 121.334 68.9644 122.072 68.0427 122.811C53.7988 134.199 53.7988 134.199 50.8115 134.199C50.2508 132.803 49.7033 131.402 49.1615 129.999C48.8552 129.219 48.5489 128.439 48.2334 127.636C47.3033 124.29 47.3033 124.29 48.4115 122.199C50.0305 120.986 51.5772 119.968 53.3115 118.949C72.4474 107.16 90.9969 91.6468 105.002 74.0486C106.187 72.5746 107.402 71.1232 108.646 69.6986C120.381 56.2213 129.292 40.5486 137.211 24.5986Z" fill="#00C49A" />
                                <path d="M140.411 36.5996C142.712 43.4067 137.507 52.0474 134.811 58.1996C134.394 59.1908 133.977 60.1825 133.561 61.1746C122.113 88.2649 104.9 111.364 84.2613 132.15C83.5297 132.889 82.798 133.628 82.0441 134.39C69.3737 147 69.3737 147 66.0113 147C65.3187 145.454 64.6375 143.903 63.9613 142.35C63.5808 141.486 63.2003 140.623 62.8082 139.734C62.0113 137.4 62.0113 137.4 62.8113 135C64.3926 133.731 64.3926 133.731 66.5113 132.3C81.2412 121.83 95.1535 108.643 106.011 94.1996C106.769 93.2149 107.528 92.2306 108.286 91.2465C121.242 74.329 132.257 56.3321 140.411 36.5996Z" fill="#00C49A" />
                            </svg>
                            <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
                        </Link>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-sm text-muted-foreground">{tPublic("public_view")}</span>
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">{tPublic("beta")}</Badge>
                        </div>
                    </div>
                </nav>
            )}

            <header className="flex items-center justify-between gap-2 md:gap-4">
                <div className="flex items-start gap-1 md:gap-2 w-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                        asChild
                    >
                        <Link href={backUrl}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="text-2xl md:text-3xl font-black tracking-tighter gap-2 md:gap-4">
                        <span>{match.home_team?.name || 'Home'}</span>
                        <span className="text-primary text-xs md:text-sm font-black tracking-widest opacity-50 px-2 leading-none">VS</span>
                        <span>{match.away_team?.name || 'Away'}</span>
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        {/* Help Tutorial Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={startConsoleTutorial}
                            className="h-10 w-10 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all animate-pulse"
                            title={locale === "th" ? "สอนการใช้งาน" : "Help Tutorial"}
                        >
                            <HelpCircle className="h-4 w-4 text-primary" />
                        </Button>
                        {(queue.length + matchQueue.length) > 0 ? (
                            <div className="flex items-center gap-1 text-warning animate-pulse">
                                <CloudOff className="w-4 h-4" />
                                <button
                                    onClick={() => {
                                        syncQueue();
                                        syncMatchQueue();
                                    }}
                                    disabled={isSyncing || isMatchSyncing}
                                    className="ml-1 hover:text-white transition-colors"
                                >
                                    <RefreshCw className={cn("w-4 h-4", (isSyncing || isMatchSyncing) && "animate-spin")} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center text-primary h-8 w-8" title={t("synced")}>
                                <Cloud className="w-4 h-4" />
                            </div>
                        ) }

                        <div className="flex items-center gap-1 md:gap-2 px-2 relative group overflow-hidden">
                            <span className="relative flex h-2 w-2">
                                <span className={cn(
                                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                    isHalfTime ? "bg-amber-400" : (match.status === 'live' ? "bg-primary" : "bg-amber-400")
                                )}></span>
                                <span className={cn(
                                    "relative inline-flex rounded-full h-2 w-2",
                                    isHalfTime ? "bg-amber-500" : (match.status === 'live' ? "bg-primary" : "bg-amber-500")
                                )}></span>
                            </span>
                            <span className="text-[10px] font-black tracking-widest text-primary">
                                {isHalfTime ? (t("half_time") || "HALF TIME").toUpperCase() : (match.status === 'live' ? tMatch("status_live") : tMatch("status_" + match.status))}
                            </span>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1 w-full grid grid-cols-12 gap-2 md:gap-4">
                {/* Sidebar: Admin Controls or Match Info */}
                <aside className="col-span-12 lg:col-span-3 gap-2 md:gap-4 order-2 lg:order-1 flex flex-col">
                    {/* Match Controls (Desktop only) */}
                    <div className="hidden lg:block">
                        {matchControlsBox}
                    </div>

                    <div className="hidden lg:block">
                        {quickActionsBox}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="col-span-12 lg:col-span-9 order-1 lg:order-2 flex flex-col gap-2 md:gap-4">
                    {/* Match Controls (Mobile only) */}
                    <div className="block lg:hidden">
                        {matchControlsBox}
                    </div>

                    {/* Scoreboard Section */}
                    <section className="flex flex-col gap-2 md:gap-4" id="console-scoreboard">
                        <Scoreboard
                            match={match}
                            homeScore={homeScore}
                            awayScore={awayScore}
                            events={events}
                            onTeamClick={(teamId) => {
                                setSelectedTeamId(teamId);
                                setEventDialogOpen(true);
                            }}
                            timerTime={time}
                            timerReadOnly={readOnly || match.status === 'finished'}
                            timerCustomText={match.status === 'finished' ? "FT" : isHalfTime ? "HT" : null}
                            addedTime={isHalfTime || match.status === 'finished' ? null : addedTime}
                        />

                        {/* Quick Actions (Mobile only) */}
                        <div className="block lg:hidden">
                            {quickActionsBox}
                        </div>

                        {!readOnly && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                                <TeamActionGrid teamId={match.home_team_id!} name={match.home_team?.name || 'Home'} type="home" />
                                <TeamActionGrid teamId={match.away_team_id!} name={match.away_team?.name || 'Away'} type="away" />
                            </div>
                        )}
                    </section>

                    {/* Log Section */}
                    <section className="flex flex-col gap-2 md:gap-4" id="console-event-log">
                        <EventLog
                            events={events}
                            match={match}
                            readOnly={readOnly}
                            onDelete={deleteEvent}
                            players={allPlayers}
                        />
                    </section>
                </div>
            </main>

            {/* Dialogs */}
            <MatchEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} teamId={selectedTeamId} eventType={selectedEventType} initialMinute={Math.floor(time / 60) + 1} players={selectedTeamId === match.home_team_id ? homePlayers : awayPlayers} existingEvents={events} activeLineupIds={selectedTeamId === match.home_team_id ? homeLineup : awayLineup} onSave={handleSaveEvent} />
            <RosterSelectionDialog open={rosterDialogOpen} onOpenChange={setRosterDialogOpen} homeTeamName={match.home_team?.name || 'Home'} awayTeamName={match.away_team?.name || 'Away'} homePlayers={homePlayers} awayPlayers={awayPlayers} homeActiveIds={homeLineup} awayActiveIds={awayLineup} onSave={handleSaveLineup} />
            <WalkoverDialog open={woDialogOpen} onOpenChange={setWoDialogOpen} match={match} onConfirm={handleWalkover} />
            <BroadcastDialog open={overlayDialogOpen} onOpenChange={setOverlayDialogOpen} matchId={match.id} tournamentId={tournamentId} />
            <SetTimeDialog open={setTimeDialogOpen} onOpenChange={setSetTimeDialogOpen} currentTime={time} onSave={handleSetTime} />
            <AddTimeDialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen} onSave={(mins) => {
                const minute = Math.floor(time / 60) + 1;
                const teamId = match.home_team_id || match.away_team_id;
                const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;
                addEvent(resolvedTeamId!, 'add_time', minute, null, { added_minutes: mins }, `+${mins} min`);
                setAddTimeDialogOpen(false);
            }} />

            <AlertDialog open={confirmConfig.open} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="bg-card border rounded-xl shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground border-b p-2 md:p-4">
                            {confirmConfig.title}
                        </AlertDialogTitle>
                        {confirmConfig.description && (
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 p-2 md:p-4">
                                {confirmConfig.description}
                            </AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-1 md:gap-2 border-t p-2 md:p-4">
                        <AlertDialogCancel>
                            {confirmConfig.cancelLabel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await confirmConfig.onConfirm();
                                setConfirmConfig(prev => ({ ...prev, open: false }));
                            }}
                        >
                            {confirmConfig.actionLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
