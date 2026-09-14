"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getPlayers } from "@/actions/tournaments/player";
import { updateMatch, advanceStage } from "@/actions/tournaments/general";
import { getPenaltyShootout } from "@/actions/tournaments/penalty";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/shared/logo";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
    BarChart2,
    Users,
    Volleyball,
    XCircle,
    CalendarRange,
    Cloud,
    CloudOff,
    RefreshCw,
    HelpCircle,
    PieChart,
    MoveRight,
    Crosshair,
    FlagTriangleRight,
    CornerUpRight,
    Scissors,
    ArrowUpRight,
    Check,
    Settings,
    RotateCcw,
    X
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
import { BroadcastDialog } from "@/features/broadcast";
import { RosterSelectionDialog } from "./console/roster-selection-dialog";
import { MatchStatisticsBox } from "./console/statistics-box";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { useMatchEvents } from "@/hooks/use-match-events";
import { EVENT_TYPES } from "./console/constants";
import { Header } from "@/components/ui/header";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
    const { toast } = useToast();
    const supabase = createClient();

    // --- State ---
    const [match, setMatch] = useState<Match>(initialMatch);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
    const [playersLoading, setPlayersLoading] = useState(true);
    const ALL_CUSTOMIZABLE_ACTIONS = [
        'pass', 'cross', 'possession', 'foul', 'substitution',
        'yellow_card', 'save', 'injury', 'corner', 'missed_shot',
        'bad_pass', 'offside'
    ];
    const ALL_STATS_KEYS = [
        'possession', 'goal', 'total_shots', 'missed_shot', 'pass',
        'bad_pass', 'cross', 'corner', 'save', 'foul', 'penalty',
        'yellow_card', 'red_card', 'offside'
    ];
    const [customActionTypes, setCustomActionTypes] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const savedCustom = localStorage.getItem("leagueflow-custom-actions");
                if (savedCustom) {
                    const parsed = JSON.parse(savedCustom);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (_) {}
        }
        return ALL_CUSTOMIZABLE_ACTIONS;
    });
    const [showScoreboardPossession, setShowScoreboardPossession] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("leagueflow-scoreboard-possession");
                if (saved !== null) return saved === "true";
            } catch (_) {}
        }
        return true;
    });
    const [visibleStats, setVisibleStats] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const savedStats = localStorage.getItem("leagueflow-visible-stats");
                if (savedStats) {
                    const parsed = JSON.parse(savedStats);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (_) {}
        }
        return ALL_STATS_KEYS;
    });
    const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);

    // Load custom action preferences from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const savedCustom = localStorage.getItem("leagueflow-custom-actions");
                if (savedCustom) {
                    const parsed = JSON.parse(savedCustom);
                    if (Array.isArray(parsed)) {
                        setCustomActionTypes(parsed);
                    }
                }
                const savedScoreboardPoss = localStorage.getItem("leagueflow-scoreboard-possession");
                if (savedScoreboardPoss !== null) {
                    setShowScoreboardPossession(savedScoreboardPoss === "true");
                }
                const savedStats = localStorage.getItem("leagueflow-visible-stats");
                if (savedStats) {
                    const parsed = JSON.parse(savedStats);
                    if (Array.isArray(parsed)) {
                        setVisibleStats(parsed);
                    }
                }
            } catch (_) {}
        }
    }, []);

    const toggleCustomAction = (type: string) => {
        setCustomActionTypes((prev) => {
            const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
            if (typeof window !== "undefined") {
                localStorage.setItem("leagueflow-custom-actions", JSON.stringify(next));
            }
            return next;
        });
    };

    const resetCustomActions = (types: string[]) => {
        setCustomActionTypes(types);
        if (typeof window !== "undefined") {
            localStorage.setItem("leagueflow-custom-actions", JSON.stringify(types));
        }
    };

    const toggleScoreboardPossession = (enabled: boolean) => {
        setShowScoreboardPossession(enabled);
        if (typeof window !== "undefined") {
            localStorage.setItem("leagueflow-scoreboard-possession", String(enabled));
        }
    };

    const toggleVisibleStat = (statKey: string) => {
        setVisibleStats((prev) => {
            const next = prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey];
            if (typeof window !== "undefined") {
                localStorage.setItem("leagueflow-visible-stats", JSON.stringify(next));
            }
            return next;
        });
    };

    const resetVisibleStats = (stats: string[]) => {
        setVisibleStats(stats);
        if (typeof window !== "undefined") {
            localStorage.setItem("leagueflow-visible-stats", JSON.stringify(stats));
        }
    };

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
            const savedEventsKey = `leagueflow-pending-events-${match.id}`;
            const savedMatchKey = `leagueflow-pending-match-${match.id}`;
            console.log(`[LocalStorage Monitor] Events Queue Key (${savedEventsKey}):`, localStorage.getItem(savedEventsKey));
            console.log(`[LocalStorage Monitor] Match Queue Key (${savedMatchKey}):`, localStorage.getItem(savedMatchKey));
            const saved = localStorage.getItem(savedMatchKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setTimeout(() => {
                        setMatchQueue(parsed);
                    }, 0);
                } catch (_) { }
            }
        }
    }, [match.id]);

    const saveMatchQueue = useCallback((newQueueOrUpdater: typeof matchQueue | ((prev: typeof matchQueue) => typeof matchQueue)) => {
        setMatchQueue(prev => {
            const next = typeof newQueueOrUpdater === "function" ? newQueueOrUpdater(prev) : newQueueOrUpdater;
            if (typeof window !== "undefined") {
                localStorage.setItem(`leagueflow-pending-match-${match.id}`, JSON.stringify(next));
            }
            return next;
        });
    }, [match.id]);

    const syncMatchQueue = useCallback(async () => {
        if (isMatchSyncing || readOnly) return;

        let itemsToProcess: typeof matchQueue = [];
        setMatchQueue(prev => {
            itemsToProcess = prev.filter(item => item.status === 'pending' || item.status === 'failed');
            return prev;
        });

        if (itemsToProcess.length === 0) return;

        setIsMatchSyncing(true);

        for (const item of itemsToProcess) {
            saveMatchQueue(prev => prev.map(m => m.id === item.id ? { ...m, status: 'syncing' as const } : m));

            try {
                const res = await updateMatch(match.id, item.data, tournamentId);
                if (res.success) {
                    saveMatchQueue(prev => {
                        const next = prev.filter(m => m.id !== item.id);
                        console.log(`[MatchQueue Sync Success] Item ${item.id} synced & removed. Remaining:`, next.length);
                        return next;
                    });
                } else {
                    saveMatchQueue(prev => {
                        const next = prev.map(m => m.id === item.id ? { ...m, status: 'failed' as const } : m);
                        console.error(`[MatchQueue Sync Failed] Item ${item.id} failed:`, res.error);
                        return next;
                    });
                }
            } catch (_err) {
                saveMatchQueue(prev => prev.map(m => m.id === item.id ? { ...m, status: 'failed' as const } : m));
            }
        }
        setIsMatchSyncing(false);
    }, [match.id, tournamentId, isMatchSyncing, readOnly, saveMatchQueue]);

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
        saveMatchQueue(prev => [...prev, newItem]);
        setMatch(prev => ({ ...prev, ...data }));
        setTimeout(() => {
            syncMatchQueue();
        }, 50);
    }, [saveMatchQueue, syncMatchQueue]);

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
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
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
        onConfirm: () => { },
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
            setPlayersLoading(true);
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
            const promises = [];
            if (match.home_team_id) promises.push(fetchTeam(match.home_team_id, setHomePlayers));
            if (match.away_team_id) promises.push(fetchTeam(match.away_team_id, setAwayPlayers));

            await Promise.all(promises);
            setPlayersLoading(false);
        };
        loadPlayers();
    }, [match.home_team_id, match.away_team_id, match.tournament_category_id, supabase]);

    const fetchShots = useCallback(async () => {
        const res = await getPenaltyShootout(match.id);
        if (res.success && res.data) {
            setPenaltyShots(res.data);
        }
    }, [match.id]);

    useEffect(() => {
        fetchShots();
    }, [fetchShots]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`match-${match.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
                const newData = payload.new as Match;
                setMatch(prev => {
                    // Avoid unnecessary state re-creation if data hasn't changed
                    if (prev.home_score === newData.home_score &&
                        prev.away_score === newData.away_score &&
                        prev.status === newData.status &&
                        prev.timer_status === newData.timer_status &&
                        prev.current_minute === newData.current_minute) {
                        return prev;
                    }
                    return { ...prev, ...newData };
                });
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
                queueMatchUpdate({ home_score: homeScore, away_score: awayScore });
            }, 500);
            return () => clearTimeout(syncScore);
        }
    }, [homeScore, awayScore, dbHomeScore, dbAwayScore, match.id, readOnly, match.status, queueMatchUpdate]);

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
                    setIsRunning(false);
                    await addEvent(winnerId, 'walkover', 0, null, { winner_id: winnerId }, `Walkover Victory (${isHomeWinner ? '3-0' : '0-3'})`);
                    await queueMatchUpdate({
                        status: 'finished',
                        home_score: isHomeWinner ? 3 : 0,
                        away_score: isHomeWinner ? 0 : 3,
                        winner_id: winnerId,
                        current_minute: 0,
                        winner_to_node_id: winnerId,
                        timer_status: 'stopped'
                    });

                    // Auto-advance if possible
                    await advanceStage(tournamentId);

                    setWoDialogOpen(false);
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
                    setIsRunning(false);
                    await queueMatchUpdate({
                        status: 'canceled',
                        timer_status: 'stopped',
                    });

                    toast({ title: t("abandoned") });
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
                    setIsRunning(false);
                    await queueMatchUpdate({
                        status: 'scheduled',
                        timer_status: 'stopped',
                        match_date: null,
                        match_time: null,
                    });

                    toast({ title: t("postponed") });
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
        if (readOnly || match.status !== 'live') return;
        const quickActionTypes: EventType[] = ['corner', 'missed_shot', 'offside', 'possession', 'pass', 'bad_pass', 'cross', 'miss_cross', 'save'];
        if (quickActionTypes.includes(type)) {
            const minute = Math.floor(time / 60) + 1;
            const evtConfig = EVENT_TYPES.find(e => e.type === type);
            const label = evtConfig ? t(evtConfig.label) : type;
            const res = await addEvent(teamId, type, minute, null, {}, label);
            if (res && !res.success) {
                toast({
                    title: `Error saving ${type} event`,
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

    const handleSaveEvent = async (data: { minute: number; playerId: string; extraInfo: Record<string, unknown>; autoRed?: boolean; overrideEventType?: EventType }) => {
        if (!selectedTeamId || !selectedEventType) return;
        const player = allPlayers.find(p => p.id === data.playerId);
        const playerName = player ? player.name : "Unknown";
        if (data.autoRed) {
            // Second yellow card resulting in red card
            const res = await addEvent(selectedTeamId, 'red_card', data.minute, data.playerId, { ...data.extraInfo, is_second_yellow: true }, playerName);
            if (res && !res.success) {
                toast({
                    title: "Error saving red card event",
                    description: res.error || "Unknown error occurred",
                    variant: "destructive"
                });
                return;
            }
        } else {
            const actualEventType = data.overrideEventType || selectedEventType;
            const res = await addEvent(selectedTeamId, actualEventType, data.minute, data.playerId, data.extraInfo, playerName);
            if (res && !res.success) {
                toast({
                    title: "Error saving event",
                    description: res.error || "Unknown error occurred",
                    variant: "destructive"
                });
                return;
            }
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

    // --- Unified Actions Card Component ---
    const ActionGridsCard = () => {
        const isActionDisabled = readOnly || match.status !== 'live';
        const actions = [
            { type: 'pass', label: t("pass") || "จ่ายบอล", icon: MoveRight },
            { type: 'cross', label: t("cross") || "ครอสบอล", icon: CornerUpRight },
            { type: 'possession', label: t("possession_action") || "ครองบอล/ตัดบอล", icon: Scissors },
            { type: 'foul', label: t("foul") || "Foul", icon: Activity },
            { type: 'substitution', label: t("substitution"), icon: Repeat },
            { type: 'yellow_card', label: t("cards") || "คาดโทษ (ใบเตือน)", icon: Square, iconColor: 'text-amber-500 fill-amber-500' },
            { type: 'save', label: t("save") || "Save", icon: Shield },
            { type: 'injury', label: t("injury") || "Injury", icon: Stethoscope },
            { type: 'corner', label: t("corner") || "Corner", icon: Flag },
            { type: 'missed_shot', label: t("missed_shot") || "ยิงพลาด", icon: Crosshair },
            { type: 'bad_pass', label: t("bad_pass") || "ออกข้าง", icon: ArrowUpRight },
            { type: 'offside', label: t("offside") || "ล้ำหน้า", icon: FlagTriangleRight },
            { type: 'goal', label: t("goal"), icon: Volleyball },
        ];

        // Filter actions based on customActionTypes, but 'goal' is ALWAYS displayed
        const filteredActions = actions.filter((action) => {
            if (action.type === 'goal') return true;
            return customActionTypes.includes(action.type);
        });

        const renderTeamButtons = (teamId: string) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 lg:gap-2">
                {filteredActions.map((action) => (
                    <Button
                        variant="outline"
                        key={action.type}
                        onClick={() => handleQuickAction(teamId, action.type as EventType)}
                        disabled={isActionDisabled}
                        className={cn(
                            "h-9 px-2.5 rounded-sm font-medium border-border/80 hover:border-primary/50 hover:bg-muted/40 transition-colors shadow-none",
                            action.type === 'goal' && "col-span-2 sm:col-span-3 h-10 font-bold bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary text-primary"
                        )}
                    >
                        <action.icon className={cn("h-4 w-4 transition-transform shrink-0", action.iconColor)} />
                        <span className="hidden lg:inline text-xs font-semibold truncate cursor-pointer tracking-normal">{action.label}</span>
                    </Button>
                ))}
            </div>
        );

        return (
            <div className="bg-card border rounded-sm relative overflow-hidden group">
                {/* Team Action Grids Side by Side with Divider between Home and Away */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-border">
                    {/* Home Team Column */}
                    <div className="p-3 lg:p-4 space-y-2 lg:space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <h3 className="text-lg lg:text-xl font-black tracking-tight truncate">
                                {match.home_team?.name || 'Home'}
                            </h3>
                        </div>
                        {renderTeamButtons(match.home_team_id!)}
                    </div>

                    {/* Away Team Column */}
                    <div className="p-3 lg:p-4 space-y-2 lg:space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary/60" />
                            <h3 className="text-lg lg:text-xl font-black tracking-tight truncate">
                                {match.away_team?.name || 'Away'}
                            </h3>
                        </div>
                        {renderTeamButtons(match.away_team_id!)}
                    </div>
                </div>
            </div>
        );
    };

    const matchControlsBox = (
        <div className="bg-card border p-2 lg:p-4 relative overflow-hidden group rounded-sm" id="console-timer-control">
            <div className="relative z-10 space-y-2 lg:space-y-4">
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
        <div className="bg-card border p-2 lg:p-4 relative overflow-hidden group rounded-sm" id="console-action-panel">
            <div className="relative z-10 space-y-2 lg:space-y-4">
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-1 lg:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setOverlayDialogOpen(true)}
                        className="hidden lg:flex w-full justify-start items-center"
                    >
                        <Tv className="h-4 w-4 text-primary" />
                        <span className="hidden lg:inline">{t("broadcast_overlay")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setRosterDialogOpen(true)}
                        className="w-full flex justify-center lg:justify-start items-center"
                    >
                        <Users className="h-4 w-4 text-primary" />
                        <span className="hidden lg:inline">{t("select_starting_lineup") || "Lineups"}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setStatsDialogOpen(true)}
                        className="w-full flex justify-center lg:justify-start items-center"
                    >
                        <BarChart2 className="h-4 w-4 text-primary" />
                        <span className="hidden lg:inline">{t("match_statistics") || "สถิติการแข่งขัน"}</span>
                    </Button>
                    {match.status === 'finished' && homeScore === awayScore ? (
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
                                    className="w-full flex justify-center lg:justify-start items-center"
                                >
                                    <Target className="h-4 w-4 text-primary" />
                                    <span className="hidden lg:inline">{t("penalty_shootout")}</span>
                                </Button>
                            }
                        />
                    ) : (
                        <Button
                            variant="outline"
                            disabled
                            className="w-full flex justify-center lg:justify-start items-center opacity-50 cursor-not-allowed"
                        >
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="hidden lg:inline">{t("penalty_shootout")}</span>
                        </Button>
                    )}
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

    if (playersLoading) {
        return (
            <div className={cn(
                "min-h-screen flex flex-col font-display selection:bg-primary selection:text-primary-foreground space-y-2 lg:space-y-4 animate-pulse",
                readOnly ? "pt-18 lg:pt-22 px-2 lg:px-0" : "pt-0"
            )}>
                {/* Header Skeleton */}
                <header className="flex items-center justify-between gap-1 lg:gap-2 h-10 dark:border-foreground/10">
                    <div className="flex items-center gap-1 lg:gap-2 w-full">
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
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-24 lg:w-32 bg-muted/60 rounded-sm" />
                                <Skeleton className="h-8 w-8 lg:w-8 bg-muted/60 rounded-sm" />
                                <Skeleton className="h-8 w-24 lg:w-32 bg-muted/60 rounded-sm" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-10 w-10 lg:w-10 bg-muted/60 rounded-sm" />
                                <Skeleton className="h-10 w-10 lg:w-10 bg-muted/60 rounded-sm" />
                                <Skeleton className="h-10 w-10 lg:w-10 bg-muted/60 rounded-sm" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full grid grid-cols-12 gap-2 lg:gap-4">
                    {/* Sidebar Skeleton */}
                    <aside className="col-span-12 lg:col-span-3 gap-2 lg:gap-4 order-2 lg:order-1 flex flex-col">
                        {/* Match Controls Skeleton */}
                        <div className="bg-card border p-2 lg:p-4 rounded-sm space-y-2">
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                        </div>
                        {/* Quick Actions Skeleton */}
                        <div className="bg-card border p-2 lg:p-4 rounded-sm space-y-2">
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-10 w-full bg-muted/60 rounded-sm" />
                        </div>
                    </aside>

                    {/* Main Content Skeleton */}
                    <div className="col-span-12 lg:col-span-9 order-1 lg:order-2 flex flex-col gap-2 lg:gap-4">
                        {/* Scoreboard Skeleton */}
                        <div className="bg-card border rounded-sm w-full">
                            <div className="p-2 lg:p-4 flex flex-col items-center justify-center w-full h-[120px] lg:h-[220px]">
                                <div className="flex items-center justify-between w-full max-w-5xl gap-4 lg:gap-12">
                                    <div className="flex-1 flex flex-row-reverse items-center justify-start gap-2 lg:flex-col lg:items-center lg:gap-4 min-w-0">
                                        <Skeleton className="w-12 h-12 lg:w-24 lg:h-24 rounded-full bg-muted/60 shrink-0" />
                                        <Skeleton className="h-4 w-16 lg:h-7 lg:w-32 bg-muted/60 rounded-sm shrink-0" />
                                    </div>

                                    <div className="flex flex-col items-center gap-1 lg:gap-3 shrink-0">
                                        <Skeleton className="h-4 w-12 lg:h-6 lg:w-20 bg-muted/60 rounded-sm" />
                                        <div className="flex items-center gap-4 lg:gap-8">
                                            <Skeleton className="h-10 w-8 lg:h-24 lg:w-16 bg-muted/60 rounded-sm" />
                                            <span className="text-xl lg:text-4xl font-black text-foreground/20">-</span>
                                            <Skeleton className="h-10 w-8 lg:h-24 lg:w-16 bg-muted/60 rounded-sm" />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-row items-center justify-start gap-2 lg:flex-col lg:items-center lg:gap-4 min-w-0">
                                        <Skeleton className="w-12 h-12 lg:w-24 lg:h-24 rounded-full bg-muted/60 shrink-0" />
                                        <Skeleton className="h-4 w-16 lg:h-7 lg:w-32 bg-muted/60 rounded-sm shrink-0" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Team Action Grid Skeleton */}
                        {!readOnly && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-card border rounded-sm p-2 lg:p-4 space-y-4">
                                        <Skeleton className="h-8 w-24 bg-muted/60 rounded-sm" />
                                        <div className="grid grid-cols-3 gap-1 lg:gap-2">
                                            {Array.from({ length: 9 }).map((_, idx) => (
                                                <Skeleton key={idx} className="h-10 w-full bg-muted/60 rounded-sm" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Event Log Skeleton */}
                        <div className="bg-card border rounded-sm p-4 space-y-2">
                            <Skeleton className="h-12 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-12 w-full bg-muted/60 rounded-sm" />
                            <Skeleton className="h-12 w-full bg-muted/60 rounded-sm" />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen flex flex-col font-display selection:bg-primary selection:text-primary-foreground space-y-2 lg:space-y-4",
            readOnly ? "pt-18 lg:pt-22 px-2 lg:px-0" : "pt-0"
        )}>
            {/* Top Navigation Bar */}
            {readOnly && (
                <nav className="border-b fixed top-0 dark:border-foreground/10 left-0 right-0 z-50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 print:hidden">
                    <div className="px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                            <Logo className="w-8 h-8" color="#00C49A" />
                            <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
                        </Link>
                        <div className="flex items-center gap-2 lg:gap-3">
                            <span className="text-sm text-muted-foreground">{tPublic("public_view")}</span>
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">{tPublic("beta")}</Badge>
                        </div>
                    </div>
                </nav>
            )}

            <header className="flex items-center justify-between gap-1 lg:gap-2">
                <div className="flex items-center gap-1 lg:gap-2 w-full">
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
                    <Header level={2}>
                        <span>{match.home_team?.name || 'Home'}</span>
                        <span className="text-xs lg:text-sm font-black tracking-widest px-2">VS</span>
                        <span>{match.away_team?.name || 'Away'}</span>
                    </Header>
                </div>

                {!readOnly && (
                    <div className="flex items-center">
                        {/* Match Status */}
                        <div className="flex items-center gap-1 lg:gap-2 px-2 relative group shrink-0">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className={cn(
                                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                    isHalfTime ? "bg-warning" : (match.status === 'live' ? "bg-primary" : "bg-warning")
                                )}></span>
                                <span className={cn(
                                    "relative inline-flex rounded-full h-2 w-2",
                                    isHalfTime ? "bg-warning" : (match.status === 'live' ? "bg-primary" : "bg-warning")
                                )}></span>
                            </span>
                            <span className="text-[10px] font-black tracking-widest whitespace-nowrap">
                                {isHalfTime ? (t("half_time") || "HALF TIME").toUpperCase() : (match.status === 'live' ? tMatch("status_live") : tMatch("status_" + match.status))}
                            </span>
                        </div>

                        {/* Undo Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleUndo}
                            title={t("undo") || "ย้อนกลับ (Undo)"}
                        >
                            <Undo className="h-4 w-4" />
                        </Button>

                        {/* Help Tutorial Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={startConsoleTutorial}
                            title={locale === "th" ? "สอนการใช้งาน" : "Help Tutorial"}
                        >
                            <HelpCircle className="h-4 w-4" />
                        </Button>

                        {/* Settings Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCustomizeDialogOpen(true)}
                            title={t("settings") || "ตั้งค่า"}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                        {(isSyncing || isMatchSyncing) ? (
                            <div className="flex items-center justify-center text-primary h-8 w-8" title={locale === "th" ? "กำลังบันทึกลง Database..." : "Syncing to Database..."}>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            </div>
                        ) : (() => {
                            const pendingEvents = queue.filter(q => q.status === 'pending' || q.status === 'failed');
                            const pendingMatch = matchQueue.filter(m => m.status === 'pending' || m.status === 'failed');
                            const hasPending = (pendingEvents.length + pendingMatch.length) > 0;
                            return hasPending ? (
                                <div className="flex items-center gap-1 text-amber-500" title={locale === "th" ? `ยังไม่ได้บันทึกลง Database (${pendingEvents.length + pendingMatch.length})` : `Not synced (${pendingEvents.length + pendingMatch.length})`}>
                                    <CloudOff className="w-4 h-4" />
                                    <button
                                        onClick={() => {
                                            syncQueue();
                                            syncMatchQueue();
                                        }}
                                        className="ml-1 hover:text-white transition-colors"
                                        title={locale === "th" ? "กดเพื่อบันทึกทันที" : "Click to sync now"}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center text-emerald-500 h-8 w-8" title={locale === "th" ? "บันทึกลง Database เรียบร้อยแล้ว" : "Synced to Database"}>
                                    <Cloud className="w-4 h-4" />
                                </div>
                            );
                        })()}
                    </div>
                )}
            </header>

            <main className="flex-1 w-full grid grid-cols-12 gap-2 lg:gap-4">
                {/* Sidebar: Admin Controls or Match Info */}
                <aside className="col-span-12 lg:col-span-3 gap-2 lg:gap-4 order-2 lg:order-1 flex flex-col">
                    {/* Match Controls (Desktop only) */}
                    <div className="hidden lg:block">
                        {matchControlsBox}
                    </div>

                    <div className="hidden lg:block">
                        {quickActionsBox}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="col-span-12 lg:col-span-9 order-1 lg:order-2 flex flex-col gap-2 lg:gap-4">
                    {/* Match Controls (Mobile only) */}
                    <div className="block lg:hidden">
                        {matchControlsBox}
                    </div>

                    {/* Scoreboard Section */}
                    <section className="flex flex-col gap-2 lg:gap-4" id="console-scoreboard">
                        <Scoreboard
                            match={match}
                            homeScore={homeScore}
                            awayScore={awayScore}
                            events={events}
                            onTeamClick={(teamId) => {
                                if (readOnly || match.status !== 'live') return;
                                setSelectedTeamId(teamId);
                                setEventDialogOpen(true);
                            }}
                            timerTime={time}
                            timerReadOnly={readOnly || match.status === 'finished'}
                            timerCustomText={match.status === 'finished' ? "FT" : isHalfTime ? "HT" : null}
                            addedTime={isHalfTime || match.status === 'finished' ? null : addedTime}
                            showPossession={showScoreboardPossession}
                        />

                        {/* Quick Actions (Mobile only) */}
                        <div className="block lg:hidden">
                            {quickActionsBox}
                        </div>

                        {!readOnly && (
                            <ActionGridsCard />
                        )}
                    </section>

                    {/* Log Section */}
                    <section className="flex flex-col gap-2 lg:gap-4" id="console-event-log">
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
            <MatchEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} teamId={selectedTeamId} eventType={selectedEventType} initialMinute={Math.floor(time / 60) + 1} players={selectedTeamId === match.home_team_id ? homePlayers : awayPlayers} opponentPlayers={selectedTeamId === match.home_team_id ? awayPlayers : homePlayers} existingEvents={events} activeLineupIds={selectedTeamId === match.home_team_id ? homeLineup : awayLineup} onSave={handleSaveEvent} />
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
            <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-md bg-card rounded-sm overflow-hidden p-0">
                    <MatchStatisticsBox
                        match={match}
                        events={events}
                        homeScore={homeScore}
                        awayScore={awayScore}
                        visibleStats={visibleStats}
                        onClose={() => setStatsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmConfig.open} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="bg-card border rounded-sm shadow-2xl sm:max-w-md z-[60]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="border-b p-2 lg:p-4">
                            {confirmConfig.title}
                        </AlertDialogTitle>
                        {confirmConfig.description && (
                            <AlertDialogDescription className="p-2 lg:p-4">
                                {confirmConfig.description}
                            </AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-1 lg:gap-2 border-t p-2 lg:p-4">
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

            {/* Settings Dialog */}
            <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-xl max-h-[85vh] flex flex-col bg-card rounded-sm p-0 overflow-hidden border shadow-2xl">
                    <DialogHeader className="p-4 border-b shrink-0 bg-card relative pr-12">
                        <div>
                            <DialogTitle className="text-base font-bold">
                                {t("settings") || "ตั้งค่า"}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {locale === "th" ? "จัดการการแสดงผลปุ่ม สถิติ และกระดานคะแนน" : "Manage buttons, statistics, and scoreboard display"}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setCustomizeDialogOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>

                    {/* Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* SECTION 1: Display Settings (Moved to first) */}
                        <section id="settings-section-display" className="space-y-2.5">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    {t("tab_display") || "การแสดงผล"}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {locale === "th" ? "ปรับแต่งส่วนแสดงผลของกระดานคะแนนและหน้าจอการแข่งขัน" : "Configure scoreboard display and view options"}
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between p-3 rounded-sm border bg-card hover:bg-muted/10 transition-colors">
                                    <div className="space-y-0.5 pr-4">
                                        <div className="flex items-center gap-2">
                                            <PieChart className="h-4 w-4 text-primary" />
                                            <Label htmlFor="possession-switch" className="text-sm font-semibold cursor-pointer">
                                                {t("scoreboard_possession") || "แสดงการครองบอลบนสกอร์บอร์ด"}
                                            </Label>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t("scoreboard_possession_desc") || "เปิด/ปิดการแสดงผลแถบการครองบอล (Possession) บนกระดานคะแนน"}
                                        </p>
                                    </div>
                                    <Switch
                                        id="possession-switch"
                                        checked={showScoreboardPossession}
                                        onCheckedChange={toggleScoreboardPossession}
                                        className="cursor-pointer shrink-0"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* SECTION 2: Action Buttons */}
                        <section id="settings-section-actions" className="space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground">
                                        {t("tab_buttons") || "ปุ่มเหตุการณ์"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t("select_action_to_toggle") || "คลิกเพื่อเปิด/ปิดปุ่มที่ต้องการใช้งาน"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 self-end sm:self-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => resetCustomActions(ALL_CUSTOMIZABLE_ACTIONS)}
                                    >
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        {t("show_all") || "แสดงทั้งหมด"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => resetCustomActions([])}
                                    >
                                        {t("hide_all") || "ซ่อนทั้งหมด"}
                                    </Button>
                                </div>
                            </div>

                            {/* Action Items List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Goal indicator (Permanent) */}
                                <div className="flex items-center justify-between p-2.5 rounded-sm border bg-primary/5 border-primary/20 col-span-1 sm:col-span-2">
                                    <div className="flex items-center gap-2.5">
                                        <Volleyball className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <span className="text-sm font-bold text-foreground">
                                            {t("goal") || "ประตู"}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        {t("always_visible") || "แสดงตลอด"}
                                    </span>
                                </div>

                                {/* Customizable Action Buttons */}
                                {[
                                    { type: 'yellow_card', label: t("cards") || "คาดโทษ (ใบเตือน)", icon: Square, iconColor: 'text-amber-500 fill-amber-500' },
                                    { type: 'substitution', label: t("substitution") || "เปลี่ยนตัว", icon: Repeat, iconColor: 'text-blue-500' },
                                    { type: 'foul', label: t("foul") || "ฟาวล์", icon: Activity, iconColor: 'text-orange-500' },
                                    { type: 'corner', label: t("corner") || "เตะมุม", icon: Flag, iconColor: 'text-foreground' },
                                    { type: 'save', label: t("save") || "เซฟ", icon: Shield, iconColor: 'text-teal-500' },
                                    { type: 'injury', label: t("injury") || "บาดเจ็บ", icon: Stethoscope, iconColor: 'text-rose-500' },
                                    { type: 'missed_shot', label: t("missed_shot") || "ยิงพลาด", icon: Crosshair, iconColor: 'text-rose-400' },
                                    { type: 'pass', label: t("pass") || "จ่ายบอล", icon: MoveRight, iconColor: 'text-emerald-500' },
                                    { type: 'bad_pass', label: t("bad_pass") || "ออกข้าง", icon: ArrowUpRight, iconColor: 'text-amber-500' },
                                    { type: 'cross', label: t("cross") || "ครอสบอล", icon: CornerUpRight, iconColor: 'text-cyan-500' },
                                    { type: 'possession', label: t("possession_action") || "การครองบอล (ตัดบอล)", icon: Scissors, iconColor: 'text-indigo-500' },
                                    { type: 'offside', label: t("offside") || "ล้ำหน้า", icon: FlagTriangleRight, iconColor: 'text-orange-500' },
                                ].map((item) => {
                                    const isSelected = customActionTypes.includes(item.type);
                                    return (
                                        <button
                                            key={item.type}
                                            type="button"
                                            onClick={() => toggleCustomAction(item.type)}
                                            className={cn(
                                                "flex items-center justify-between p-2.5 rounded-sm border text-left transition-all cursor-pointer",
                                                isSelected
                                                    ? "bg-card border-primary/40 hover:border-primary/70 shadow-xs"
                                                    : "opacity-45 hover:opacity-75 border-border bg-muted/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <item.icon className={cn("h-4 w-4 shrink-0", item.iconColor)} />
                                                <span className="text-xs font-semibold truncate">{item.label}</span>
                                            </div>
                                            <div className="flex items-center justify-center w-5 h-5 shrink-0 ml-2">
                                                {isSelected && (
                                                    <Check className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="text-xs text-muted-foreground pt-1">
                                <span>{customActionTypes.length} / {ALL_CUSTOMIZABLE_ACTIONS.length} {locale === "th" ? "ปุ่มที่เลือกแสดง" : "actions visible"}</span>
                            </div>
                        </section>

                        {/* SECTION 3: Match Statistics */}
                        <section id="settings-section-stats" className="space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground">
                                        {t("tab_stats") || "สถิติการแข่งขัน"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t("customize_stats_desc") || "เลือกรายการสถิติที่ต้องการให้แสดงในหน้าต่างสถิติการแข่งขัน"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 self-end sm:self-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => resetVisibleStats(ALL_STATS_KEYS)}
                                    >
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        {t("show_all") || "แสดงทั้งหมด"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => resetVisibleStats([])}
                                    >
                                        {t("hide_all") || "ซ่อนทั้งหมด"}
                                    </Button>
                                </div>
                            </div>

                            {/* Stats Items List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { key: 'possession', label: t("possession") || "การครองบอล", icon: PieChart, iconColor: 'text-indigo-500' },
                                    { key: 'goal', label: t("goal") || "ประตู", icon: Volleyball, iconColor: 'text-emerald-500' },
                                    { key: 'total_shots', label: t("total_shots") || "โอกาสยิงประตู", icon: Target, iconColor: 'text-blue-500' },
                                    { key: 'missed_shot', label: t("missed_shot") || "ยิงพลาด", icon: Crosshair, iconColor: 'text-rose-400' },
                                    { key: 'pass', label: t("pass") || "จ่ายบอล", icon: MoveRight, iconColor: 'text-emerald-500' },
                                    { key: 'bad_pass', label: t("bad_pass") || "ออกข้าง", icon: ArrowUpRight, iconColor: 'text-amber-500' },
                                    { key: 'cross', label: t("cross") || "ครอสบอล", icon: CornerUpRight, iconColor: 'text-cyan-500' },
                                    { key: 'corner', label: t("corner") || "เตะมุม", icon: Flag, iconColor: 'text-foreground' },
                                    { key: 'save', label: t("save") || "เซฟ", icon: Shield, iconColor: 'text-teal-500' },
                                    { key: 'foul', label: t("foul") || "ฟาวล์", icon: Activity, iconColor: 'text-orange-500' },
                                    { key: 'penalty', label: t("penalty") || "จุดโทษ", icon: Target, iconColor: 'text-red-500' },
                                    { key: 'yellow_card', label: t("yellow_card") || "ใบเหลือง", icon: Square, iconColor: 'text-amber-500 fill-amber-500' },
                                    { key: 'red_card', label: t("red_card") || "ใบแดง", icon: Square, iconColor: 'text-rose-500 fill-rose-500' },
                                    { key: 'offside', label: t("offside") || "ล้ำหน้า", icon: FlagTriangleRight, iconColor: 'text-orange-500' },
                                ].map((item) => {
                                    const isSelected = visibleStats.includes(item.key);
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => toggleVisibleStat(item.key)}
                                            className={cn(
                                                "flex items-center justify-between p-2.5 rounded-sm border text-left transition-all cursor-pointer",
                                                isSelected
                                                    ? "bg-card border-primary/40 hover:border-primary/70 shadow-xs"
                                                    : "opacity-45 hover:opacity-75 border-border bg-muted/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <item.icon className={cn("h-4 w-4 shrink-0", item.iconColor)} />
                                                <span className="text-xs font-semibold truncate">{item.label}</span>
                                            </div>
                                            <div className="flex items-center justify-center w-5 h-5 shrink-0 ml-2">
                                                {isSelected && (
                                                    <Check className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="text-xs text-muted-foreground pt-1">
                                <span>{visibleStats.length} / {ALL_STATS_KEYS.length} {locale === "th" ? "สถิติที่เลือกแสดง" : "statistics visible"}</span>
                            </div>
                        </section>

                        {/* SECTION 4: Danger Zone */}
                        <section id="settings-section-danger" className="space-y-2.5">
                            <div>
                                <h3 className="text-sm font-bold text-destructive">
                                    {t("danger_zone") || "โซนอันตราย (การจัดการสถานะแมตช์)"}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t("danger_zone_desc") || "การดำเนินการเหล่านี้จะส่งผลกระทบต่อผลการแข่งขันหรือตารางเวลาโดยตรง โปรดใช้ความระมัดระวัง"}
                                </p>
                            </div>

                            <div className="space-y-2 pt-1">
                                {/* เลื่อนการแข่งขัน (Postpone Match) */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-sm border border-border bg-card hover:bg-muted/10 transition-all">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <CalendarRange className="h-4 w-4 text-amber-500" />
                                            <span className="text-xs font-bold text-foreground">
                                                {t("postponed") || "เลื่อนการแข่งขัน"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {locale === "th" ? "เปลี่ยนสถานะแมตช์กลับเป็นรอแข่งขัน และล้างวัน/เวลาของแมตช์" : "Reschedule match and reset match date/time"}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            handlePostponeMatch();
                                        }}
                                        disabled={match.status === 'finished' || match.status === 'canceled'}
                                        className="h-8 text-xs font-semibold shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                    >
                                        <CalendarRange className="h-3.5 w-3.5 mr-1.5" />
                                        {t("postponed") || "เลื่อนการแข่งขัน"}
                                    </Button>
                                </div>

                                {/* จบการแข่งขันก่อนเวลา (Walkover / Early Finish) */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-sm border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Ban className="h-4 w-4 text-destructive" />
                                            <span className="text-xs font-bold text-destructive">
                                                {t("walkover") || "จบการแข่งขันก่อนเวลา"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {locale === "th" ? "บันทึกผลชนะบาย (3-0 หรือ 0-3) และยุติการแข่งขันทันที" : "Award walkover victory (3-0 or 0-3) and end match"}
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setWoDialogOpen(true);
                                        }}
                                        disabled={match.status === 'finished' || match.status === 'canceled'}
                                        className="h-8 text-xs font-semibold shrink-0 cursor-pointer"
                                    >
                                        <Ban className="h-3.5 w-3.5 mr-1.5" />
                                        {t("walkover") || "จบการแข่งขันก่อนเวลา"}
                                    </Button>
                                </div>

                                {/* ยกเลิกการแข่งขัน (Abandon Match) */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-sm border border-destructive/30 bg-destructive/10 hover:bg-destructive/15 transition-all">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-destructive" />
                                            <span className="text-xs font-bold text-destructive">
                                                {t("abandoned") || "ยกเลิกการแข่งขัน"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {locale === "th" ? "ยกเลิกแมตช์นี้ (Canceled) โดยไม่มีผลคะแนนแพ้ชนะ" : "Cancel and abandon this match without recorded winner"}
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            handleAbandonMatch();
                                        }}
                                        disabled={match.status === 'finished' || match.status === 'canceled'}
                                        className="h-8 text-xs font-semibold shrink-0 cursor-pointer"
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                        {t("abandoned") || "ยกเลิกการแข่งขัน"}
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Dialog Footer */}
                    <DialogFooter className="p-3 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            {locale === "th" ? "การตั้งค่าจะถูกบันทึกอัตโนมัติ" : "Settings saved automatically"}
                        </span>
                        <Button
                            size="sm"
                            className="h-8 text-xs font-semibold px-5 cursor-pointer ml-auto"
                            onClick={() => setCustomizeDialogOpen(false)}
                        >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {tCommon("done") || "เสร็จสิ้น"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
