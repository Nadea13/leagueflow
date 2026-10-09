"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getPlayers } from "@/actions/tournaments/player";
import { updateMatch, advanceStage, updateCategoryRulesConfig } from "@/actions/tournaments/general";
import { getPenaltyShootout } from "@/actions/tournaments/penalty";
import { useMatchWebSocket } from "@/hooks/use-match-websocket";
import { ApiClient } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";
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
    Undo,
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
    Cloud,
    CloudOff,
    RefreshCw,
    HelpCircle,
    MoveRight,
    Crosshair,
    FlagTriangleRight,
    CornerUpRight,
    Scissors,
    ArrowUpRight,
    Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

// Types
import { Match, Player, EventType, MatchEvent, PenaltyShot } from "@/types";

// Components & Hooks
import { MatchTimeControl } from "./console/time-control";
import { Scoreboard } from "./console/scoreboard";
import { EventLog } from "./console/log";
import { MatchEventDialog } from "@/features/dialogs";
import { WalkoverDialog } from "@/features/dialogs";
import { PenaltyShootoutDialog } from "@/features/dialogs";
import { AddTimeDialog, SetTimeDialog } from "@/features/dialogs";
import { BroadcastDialog } from "@/features/broadcast";
import { RosterSelectionDialog } from "@/features/dialogs";
import { FootballSettingsDialog, FootballStatisticsDialog } from "@/features/dialogs";
import { MatchStatisticsBox } from "./console/statistics-box";
import { TeamRosterDialog } from "@/components/teams/team-roster-dialog";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { useMatchEvents } from "@/hooks/use-match-events";
import { EVENT_TYPES } from "./console/constants";
import { Header } from "@/components/ui/header";

interface ConsolePageProps {
    match: Match;
    tournamentId: string;
    readOnly?: boolean;
    initialEvents?: MatchEvent[];
    backUrl: string;
    tournamentName?: string;
    rulesConfig?: Record<string, unknown> | null;
}

export function ConsolePage({ match: initialMatch, tournamentId, readOnly = false, initialEvents, backUrl, tournamentName, rulesConfig }: ConsolePageProps) {
    const t = useTranslations("Console");
    const locale = useLocale();
    const tMatch = useTranslations("Match");
    const tCommon = useTranslations("Common");
    const _tPublic = useTranslations("PublicView");
    const { toast } = useToast();

    // --- State ---
    const [match, setMatch] = useState<Match>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem(`leagueflow-match-snapshot-${initialMatch.id}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.id === initialMatch.id) {
                        return { ...initialMatch, ...parsed };
                    }
                }
            } catch (_) { }
        }
        return initialMatch;
    });
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
    const [playersLoading, setPlayersLoading] = useState(true);
    const ALL_CUSTOMIZABLE_ACTIONS = [
        'pass', 'cross', 'possession', 'foul', 'substitution',
        'yellow_card', 'save', 'injury', 'corner', 'missed_shot',
        'bad_pass', 'offside'
    ];
    const DEFAULT_STATS_KEYS = ['goal', 'yellow_card', 'red_card'];
    const ALL_LOG_EVENT_TYPES = [
        'goal',
        'penalty_shot',
        'yellow_card',
        'red_card',
        'substitution',
        'foul',
        'save',
        'corner',
        'offside',
        'missed_shot',
        'pass',
        'bad_pass',
        'cross',
        'possession',
        'injury',
        'var',
        'period_lifecycle',
        'add_time',
        'match_paused',
        'walkover',
    ];
    const [customActionTypes, setCustomActionTypes] = useState<string[]>(() => {
        if (Array.isArray(rulesConfig?.custom_actions)) {
            return rulesConfig.custom_actions as string[];
        }
        if (typeof window !== "undefined") {
            try {
                const savedCustom = localStorage.getItem("leagueflow-custom-actions");
                if (savedCustom) {
                    const parsed = JSON.parse(savedCustom);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (_) { }
        }
        return ALL_CUSTOMIZABLE_ACTIONS;
    });
    const [showScoreboardPossession, setShowScoreboardPossession] = useState<boolean>(() => {
        if (typeof rulesConfig?.scoreboard_possession === 'boolean') {
            return rulesConfig.scoreboard_possession;
        }
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("leagueflow-scoreboard-possession");
                if (saved !== null) return saved === "true";
            } catch (_) { }
        }
        return true;
    });
    const [visibleStats, setVisibleStats] = useState<string[]>(() => {
        if (Array.isArray(rulesConfig?.visible_stats)) {
            return rulesConfig.visible_stats as string[];
        }
        if (typeof window !== "undefined") {
            try {
                const savedStats = localStorage.getItem("leagueflow-visible-stats");
                if (savedStats) {
                    const parsed = JSON.parse(savedStats);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (_) { }
        }
        return DEFAULT_STATS_KEYS;
    });
    const [visibleLogs, setVisibleLogs] = useState<string[]>(() => {
        if (Array.isArray(rulesConfig?.visible_logs)) {
            return rulesConfig.visible_logs as string[];
        }
        if (typeof window !== "undefined") {
            try {
                const savedLogs = localStorage.getItem("leagueflow-visible-logs");
                if (savedLogs) {
                    const parsed = JSON.parse(savedLogs);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (_) { }
        }
        return ALL_LOG_EVENT_TYPES;
    });
    const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);

    // Load custom action preferences from rulesConfig or localStorage
    useEffect(() => {
        if (Array.isArray(rulesConfig?.visible_stats)) {
            setVisibleStats(rulesConfig.visible_stats as string[]);
        } else if (typeof window !== "undefined") {
            try {
                const savedStats = localStorage.getItem("leagueflow-visible-stats");
                if (savedStats) {
                    const parsed = JSON.parse(savedStats);
                    if (Array.isArray(parsed)) {
                        setVisibleStats(parsed);
                    }
                } else {
                    setVisibleStats(DEFAULT_STATS_KEYS);
                }
            } catch (_) { }
        }

        if (Array.isArray(rulesConfig?.visible_logs)) {
            setVisibleLogs(rulesConfig.visible_logs as string[]);
        } else if (typeof window !== "undefined") {
            try {
                const savedLogs = localStorage.getItem("leagueflow-visible-logs");
                if (savedLogs) {
                    const parsed = JSON.parse(savedLogs);
                    if (Array.isArray(parsed)) {
                        setVisibleLogs(parsed);
                    }
                } else {
                    setVisibleLogs(ALL_LOG_EVENT_TYPES);
                }
            } catch (_) { }
        }

        if (Array.isArray(rulesConfig?.custom_actions)) {
            setCustomActionTypes(rulesConfig.custom_actions as string[]);
        } else if (typeof window !== "undefined") {
            try {
                const savedCustom = localStorage.getItem("leagueflow-custom-actions");
                if (savedCustom) {
                    const parsed = JSON.parse(savedCustom);
                    if (Array.isArray(parsed)) {
                        setCustomActionTypes(parsed);
                    }
                }
            } catch (_) { }
        }

        if (typeof rulesConfig?.scoreboard_possession === 'boolean') {
            setShowScoreboardPossession(rulesConfig.scoreboard_possession);
        } else if (typeof window !== "undefined") {
            try {
                const savedScoreboardPoss = localStorage.getItem("leagueflow-scoreboard-possession");
                if (savedScoreboardPoss !== null) {
                    setShowScoreboardPossession(savedScoreboardPoss === "true");
                }
            } catch (_) { }
        }
    }, [rulesConfig]);

    const toggleCustomAction = (type: string) => {
        setCustomActionTypes((prev) => {
            const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
            if (typeof window !== "undefined") {
                localStorage.setItem("leagueflow-custom-actions", JSON.stringify(next));
            }
            if (!readOnly && match.tournament_category_id) {
                updateCategoryRulesConfig(tournamentId, String(match.tournament_category_id), { custom_actions: next }).catch(console.error);
            }
            return next;
        });
    };

    const toggleScoreboardPossession = (enabled: boolean) => {
        setShowScoreboardPossession(enabled);
        if (typeof window !== "undefined") {
            localStorage.setItem("leagueflow-scoreboard-possession", String(enabled));
        }
        if (!readOnly && match.tournament_category_id) {
            updateCategoryRulesConfig(tournamentId, String(match.tournament_category_id), { scoreboard_possession: enabled }).catch(console.error);
        }
    };

    const toggleVisibleStat = (statKey: string) => {
        setVisibleStats((prev) => {
            const next = prev.includes(statKey) ? prev.filter((k) => k !== statKey) : [...prev, statKey];
            if (typeof window !== "undefined") {
                localStorage.setItem("leagueflow-visible-stats", JSON.stringify(next));
            }
            if (!readOnly && match.tournament_category_id) {
                updateCategoryRulesConfig(tournamentId, String(match.tournament_category_id), { visible_stats: next }).catch(console.error);
            }
            return next;
        });
    };

    const toggleVisibleLog = (logType: string) => {
        setVisibleLogs((prev) => {
            const next = prev.includes(logType) ? prev.filter((t) => t !== logType) : [...prev, logType];
            if (typeof window !== "undefined") {
                localStorage.setItem("leagueflow-visible-logs", JSON.stringify(next));
            }
            if (!readOnly && match.tournament_category_id) {
                updateCategoryRulesConfig(tournamentId, String(match.tournament_category_id), { visible_logs: next }).catch(console.error);
            }
            return next;
        });
    };

    // Hooks
    const { events, queue, isSyncing, syncQueue, addEvent, deleteEvent, handleIncomingEvent, handleIncomingDelete } = useMatchEvents(match.id, tournamentId, initialEvents, readOnly);
    const { time, setTime, isRunning, setIsRunning } = useMatchTimer(match, tournamentId, events);

    type MatchQueueItem = {
        id: string;
        data: Parameters<typeof updateMatch>[1];
        status: "pending" | "syncing" | "failed";
    };

    // Match updates queue state
    const [matchQueue, setMatchQueue] = useState<MatchQueueItem[]>([]);
    const [isMatchSyncing, setIsMatchSyncing] = useState(false);
    const isMatchSyncingRef = useRef(false);
    const matchQueueRef = useRef<MatchQueueItem[]>([]);
    matchQueueRef.current = matchQueue;

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedMatchKey = `leagueflow-pending-match-${match.id}`;
            const saved = localStorage.getItem(savedMatchKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setMatchQueue(parsed);
                    }
                } catch (_) { }
            }
        }
    }, [match.id]);

    const persistMatchQueue = useCallback((newQueue: MatchQueueItem[]) => {
        setMatchQueue(newQueue);
        if (typeof window !== "undefined") {
            localStorage.setItem(`leagueflow-pending-match-${match.id}`, JSON.stringify(newQueue));
        }
    }, [match.id]);

    const syncMatchQueue = useCallback(async () => {
        if (isMatchSyncingRef.current || readOnly) return;

        const currentQueue = matchQueueRef.current;
        const pendingItems = currentQueue.filter((item: MatchQueueItem) => item.status === 'pending');

        if (pendingItems.length === 0) return;

        isMatchSyncingRef.current = true;
        setIsMatchSyncing(true);

        let workingQueue = [...currentQueue];

        for (const item of pendingItems) {
            workingQueue = workingQueue.map(m => m.id === item.id ? { ...m, status: 'syncing' as const } : m);
            matchQueueRef.current = workingQueue;
            persistMatchQueue(workingQueue);

            try {
                let success = false;
                try {
                    const res = await updateMatch(match.id, item.data, tournamentId);
                    if (res.success) {
                        success = true;
                    }
                } catch (_serverActionErr) {
                    console.warn("Server action updateMatch failed, attempting direct API fallback...", _serverActionErr);
                }

                if (!success) {
                    // Direct API fallback using local JWT
                    try {
                        await ApiClient.fetch(`/matches/${match.id}`, {
                            method: 'PUT',
                            body: JSON.stringify(item.data),
                        });
                        success = true;
                    } catch (apiErr) {
                        console.error("Direct API Fallback error:", apiErr);
                    }
                }

                if (success) {
                    workingQueue = workingQueue.filter(m => m.id !== item.id);
                    matchQueueRef.current = workingQueue;
                    persistMatchQueue(workingQueue);
                } else {
                    workingQueue = workingQueue.map(m => m.id === item.id ? { ...m, status: 'failed' as const } : m);
                    matchQueueRef.current = workingQueue;
                    persistMatchQueue(workingQueue);
                }
            } catch (_err) {
                workingQueue = workingQueue.map(m => m.id === item.id ? { ...m, status: 'failed' as const } : m);
                matchQueueRef.current = workingQueue;
                persistMatchQueue(workingQueue);
            }
        }
        isMatchSyncingRef.current = false;
        setIsMatchSyncing(false);
    }, [match.id, tournamentId, readOnly, persistMatchQueue]);

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

    const queueMatchUpdate = useCallback(async (data: Parameters<typeof updateMatch>[1]) => {
        const newItem = { id: `match-${Date.now()}`, data, status: 'pending' as const };
        const nextQueue = [...matchQueueRef.current, newItem];
        matchQueueRef.current = nextQueue;
        persistMatchQueue(nextQueue);
        setMatch(prev => ({ ...prev, ...data }));
        setTimeout(() => {
            syncMatchQueue();
        }, 50);
    }, [persistMatchQueue, syncMatchQueue]);

    const lastPeriodEvent = events.find(e =>
        e.event_type === 'first_half' ||
        e.event_type === 'half_time' ||
        e.event_type === 'second_half' ||
        e.event_type === 'full_time' ||
        e.event_type === 'extra_time' ||
        e.event_type === 'extra_time_half_time' ||
        e.event_type === 'extra_time_second_half' ||
        e.event_type === 'penalties'
    );
    const lastPeriodEventType = lastPeriodEvent?.event_type;
    const isHalfTime = !isRunning && lastPeriodEventType === 'half_time';

    // Lineup / Roster Selection States
    const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
    const [homeLineup, setHomeLineup] = useState<string[]>([]);
    const [awayLineup, setAwayLineup] = useState<string[]>([]);

    // Dialog States
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [teamInfoTarget, setTeamInfoTarget] = useState<'home' | 'away' | null>(null);
    const [woDialogOpen, setWoDialogOpen] = useState(false);
    const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false);
    const [setTimeDialogOpen, setSetTimeDialogOpen] = useState(false);
    const [overlayDialogOpen, setOverlayDialogOpen] = useState(false);
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
    const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
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
        let isMounted = true;
        const loadPlayers = async () => {
            setPlayersLoading(true);
            try {
                const homeId = match.home_team_id || match.home_team?.id;
                const awayId = match.away_team_id || match.away_team?.id;
                const [homeRes, awayRes] = await Promise.all([
                    homeId ? getPlayers(homeId) : Promise.resolve({ success: true, data: [] }),
                    awayId ? getPlayers(awayId) : Promise.resolve({ success: true, data: [] })
                ]);
                if (isMounted) {
                    if (homeRes.success && homeRes.data) setHomePlayers(homeRes.data);
                    if (awayRes.success && awayRes.data) setAwayPlayers(awayRes.data);
                }
            } catch (err) {
                console.error("Error loading team players:", err);
            } finally {
                if (isMounted) setPlayersLoading(false);
            }
        };
        loadPlayers();
        return () => { isMounted = false; };
    }, [match.home_team_id, match.away_team_id, match.home_team?.id, match.away_team?.id]);

    const fetchShots = useCallback(async () => {
        const res = await getPenaltyShootout(match.id);
        if (res.success && res.data) {
            setPenaltyShots(res.data);
        }
    }, [match.id]);

    useEffect(() => {
        fetchShots();
    }, [fetchShots]);

    // Persist match state snapshot to localStorage for 0ms render & offline resilience
    useEffect(() => {
        if (typeof window !== "undefined" && match.id) {
            localStorage.setItem(`leagueflow-match-snapshot-${match.id}`, JSON.stringify(match));
        }
    }, [match]);

    // 100% Realtime WebSocket Connection
    useMatchWebSocket(match.id, {
        onScoreUpdate: (payload) => {
            setMatch((prev) => ({
                ...prev,
                home_score: payload.home_score,
                away_score: payload.away_score,
                status: (payload.status as Match["status"]) || prev.status
            }));
        },
        onMatchEvent: (payload) => {
            if (payload?.event) {
                handleIncomingEvent(payload.event);
            }
        },
        onMatchEventDelete: (payload) => {
            if (payload?.event_id) {
                handleIncomingDelete(payload.event_id);
            }
        },
        onMatchUpdate: (payload) => {
            if (payload?.match) {
                setMatch((prev) => ({
                    ...prev,
                    ...payload.match
                }));
            }
        },
        onStatusChange: (payload) => {
            if (payload?.status) {
                setMatch((prev) => ({
                    ...prev,
                    status: payload.status as Match["status"]
                }));
            }
        }
    });

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

        // Optimistic UI Update
        setIsRunning(true);

        try {
            await addEvent(null, 'first_half', currentMinute, null, { start_timestamp: Date.now() }, "First Half");
            await queueMatchUpdate({ status: 'live', timer_status: 'playing', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("first_half") || t("match_started") || "First Half Started" });
        } catch (error) {
            console.error("Start match error:", error);
        }
    };

    const handlePauseMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(false);

        try {
            await addEvent(null, 'match_paused', currentMinute, null, {}, "Match Paused");
            await queueMatchUpdate({ status: 'live', timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("match_paused") || "Match Paused" });
        } catch (error) {
            console.error("Pause match error:", error);
        }
    };

    const handleHalfTime = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(false);

        try {
            await addEvent(null, 'half_time', currentMinute, null, {}, "Half Time");
            await queueMatchUpdate({ status: 'live', timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("half_time") || "Half Time" });
        } catch (error) {
            console.error("Half time error:", error);
        }
    };

    const handleRegularFullTime = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(false);

        try {
            await addEvent(null, 'full_time', currentMinute, null, {}, "End Regular Time");
            await queueMatchUpdate({ status: 'live', timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("regular_full_time") || "End of Regular Time" });
        } catch (error) {
            console.error("Regular full time error:", error);
        }
    };

    const handleStartExtraTime = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(true);

        try {
            await addEvent(null, 'extra_time', currentMinute, null, { start_timestamp: Date.now() }, "Extra Time");
            await queueMatchUpdate({ status: 'live', timer_status: 'playing', current_minute: currentMinute });
            toast({ title: t("start_extra_time") || "Extra Time Started" });
        } catch (error) {
            console.error("Start extra time error:", error);
        }
    };

    const handleExtraTimeHalfTime = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(false);

        try {
            await addEvent(null, 'extra_time_half_time', currentMinute, null, {}, "Extra Time Half Time");
            await queueMatchUpdate({ status: 'live', timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
            toast({ title: t("pause_extra_time") || "Extra Time Break" });
        } catch (error) {
            console.error("Extra time half time error:", error);
        }
    };

    const handleStartPenalties = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(false);

        // Open Penalty Shootout Dialog immediately
        setPenaltyDialogOpen(true);

        try {
            if (lastPeriodEventType !== 'penalties') {
                await addEvent(null, 'penalties', currentMinute, null, {}, "Penalty Shootout");
                await queueMatchUpdate({ status: 'live', timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute });
                toast({ title: t("start_penalties") || "Penalty Shootout Started" });
            }
        } catch (error) {
            console.error("Start penalties error:", error);
        }
    };

    const handleResumeMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;

        // Optimistic UI Update
        setIsRunning(true);

        try {
            let eventTypeToLog: EventType = 'match_resumed';
            let eventLabel = "Match Resumed";

            if (lastPeriodEventType === 'half_time') {
                eventTypeToLog = 'second_half';
                eventLabel = "Second Half";
            } else if (lastPeriodEventType === 'extra_time_half_time') {
                eventTypeToLog = 'extra_time_second_half';
                eventLabel = "Extra Time 2nd Half";
            }

            await addEvent(null, eventTypeToLog, currentMinute, null, { start_timestamp: Date.now() }, eventLabel);
            await queueMatchUpdate({ status: 'live', timer_status: 'playing', current_minute: currentMinute });

            const toastTitle = eventTypeToLog === 'second_half'
                ? (t("second_half") || "Second Half Started")
                : eventTypeToLog === 'extra_time_second_half'
                    ? (t("extra_time_second_half") || "Extra Time 2nd Half Started")
                    : (t("match_resumed") || "Match Resumed");
            toast({ title: toastTitle });
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

                setIsRunning(false);
                await addEvent(null, 'full_time', currentMinute, null, {}, "Full Time");
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
                        lastPeriodEventType={lastPeriodEventType}
                        onStart={handleStartMatch}
                        onPause={handlePauseMatch}
                        onHalfTime={handleHalfTime}
                        onRegularFullTime={handleRegularFullTime}
                        onStartExtraTime={handleStartExtraTime}
                        onExtraTimeHalfTime={handleExtraTimeHalfTime}
                        onStartPenalties={handleStartPenalties}
                        onResume={handleResumeMatch}
                        onEnd={handleEndMatch}
                        onSetTime={() => setSetTimeDialogOpen(true)}
                        onAddTime={() => setAddTimeDialogOpen(true)}
                    />
                )}
            </div>
        </div>
    );

    const quickActionsBox = (
        <div className="bg-card border p-2 lg:p-4 relative overflow-hidden group rounded-sm" id="console-action-panel">
            <div className="relative z-10 space-y-2 lg:space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 lg:gap-2">
                    {!readOnly && (
                        <Button
                            variant="outline"
                            onClick={() => setOverlayDialogOpen(true)}
                            className="hidden lg:flex w-full justify-start items-center"
                        >
                            <Tv className="h-4 w-4 text-primary" />
                            <span className="hidden lg:inline">{t("broadcast_overlay")}</span>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => setRosterDialogOpen(true)}
                        className="w-full flex justify-center lg:justify-start items-center"
                    >
                        <Users className="h-4 w-4 text-primary" />
                        <span className="inline text-xs font-semibold">{t("select_starting_lineup") || "Lineups"}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setStatsDialogOpen(true)}
                        className="w-full flex justify-center lg:justify-start items-center"
                    >
                        <BarChart2 className="h-4 w-4 text-primary" />
                        <span className="inline text-xs font-semibold">{t("match_statistics") || "สถิติการแข่งขัน"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );

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
            <div className="flex flex-col font-display selection:bg-primary selection:text-primary-foreground space-y-2 lg:space-y-4 animate-pulse">
                {/* Header Skeleton */}
                <header className="flex items-center justify-between gap-1 lg:gap-2 h-10 dark:border-foreground/10">
                    <div className="flex items-center gap-1 lg:gap-2 w-full">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
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
        <div className="flex flex-col font-display selection:bg-primary selection:text-primary-foreground space-y-2 lg:space-y-4">
            <header className="flex items-center justify-between gap-1 lg:gap-2">
                <div className="flex items-center gap-1 lg:gap-2 w-full">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
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
                                    (isHalfTime || (lastPeriodEventType === 'full_time' && !isRunning) || lastPeriodEventType === 'extra_time_half_time') ? "bg-warning" : (match.status === 'live' ? "bg-primary" : "bg-warning")
                                )}></span>
                                <span className={cn(
                                    "relative inline-flex rounded-full h-2 w-2",
                                    (isHalfTime || (lastPeriodEventType === 'full_time' && !isRunning) || lastPeriodEventType === 'extra_time_half_time') ? "bg-warning" : (match.status === 'live' ? "bg-primary" : "bg-warning")
                                )}></span>
                            </span>
                            <span className="text-[10px] font-black tracking-widest whitespace-nowrap">
                                {(() => {
                                    if (match.status === 'finished') return tMatch("status_finished");
                                    if (lastPeriodEventType === 'half_time') return (t("half_time") || "HALF TIME").toUpperCase();
                                    if (lastPeriodEventType === 'full_time' && !isRunning) return (t("regular_full_time") || "END REGULAR TIME").toUpperCase();
                                    if (lastPeriodEventType === 'extra_time_half_time') return (t("extra_time_half_time") || "ET HALF TIME").toUpperCase();
                                    if (lastPeriodEventType === 'penalties') return (t("penalties") || "PENALTIES").toUpperCase();
                                    if (lastPeriodEventType === 'extra_time' || lastPeriodEventType === 'extra_time_second_half') return (t("extra_time") || "EXTRA TIME").toUpperCase();
                                    return match.status === 'live' ? tMatch("status_live") : tMatch("status_" + match.status);
                                })()}
                            </span>
                        </div>

                        {/* Undo Button */}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleUndo}
                            title={t("undo") || "ย้อนกลับ (Undo)"}
                        >
                            <Undo className="h-4 w-4" />
                        </Button>

                        {/* Help Tutorial Button */}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={startConsoleTutorial}
                            title={locale === "th" ? "สอนการใช้งาน" : "Help Tutorial"}
                        >
                            <HelpCircle className="h-4 w-4" />
                        </Button>

                        {/* Settings Button */}
                        <Button
                            variant="ghost"
                            size="icon-sm"
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
                <aside className={cn(
                    "col-span-12 gap-2 lg:gap-4 order-2 lg:order-1 flex flex-col",
                    readOnly ? "lg:col-span-4" : "lg:col-span-3"
                )}>
                    {/* Match Controls (Desktop only) */}
                    <div className="hidden lg:block">
                        {matchControlsBox}
                    </div>

                    <div className="hidden lg:block">
                        {quickActionsBox}
                    </div>

                    {readOnly && (
                        <div className="hidden lg:block border rounded-sm overflow-hidden bg-card shadow-xs">
                            <MatchStatisticsBox
                                match={match}
                                events={events}
                                homeScore={homeScore}
                                awayScore={awayScore}
                                visibleStats={visibleStats}
                            />
                        </div>
                    )}
                </aside>

                {/* Main Content Area */}
                <div className={cn(
                    "col-span-12 order-1 lg:order-2 flex flex-col gap-2 lg:gap-4",
                    readOnly ? "lg:col-span-8" : "lg:col-span-9"
                )}>
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
                                if (teamId === match.home_team_id || teamId === match.home_team?.id) {
                                    setTeamInfoTarget('home');
                                } else if (teamId === match.away_team_id || teamId === match.away_team?.id) {
                                    setTeamInfoTarget('away');
                                }
                            }}
                            timerTime={time}
                            timerReadOnly={readOnly || match.status === 'finished'}
                            timerCustomText={
                                match.status === 'finished' ? "FT" :
                                    lastPeriodEventType === 'half_time' ? "HT" :
                                        (lastPeriodEventType === 'full_time' && !isRunning) ? "FT" :
                                            lastPeriodEventType === 'extra_time_half_time' ? "ET HT" :
                                                lastPeriodEventType === 'penalties' ? "PSO" : null
                            }
                            addedTime={(isHalfTime || (lastPeriodEventType === 'full_time' && !isRunning) || match.status === 'finished' || lastPeriodEventType === 'penalties') ? null : addedTime}
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
                            visibleLogs={visibleLogs}
                        />
                    </section>
                </div>
            </main>

            {/* Dialogs */}
            <MatchEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} teamId={selectedTeamId} eventType={selectedEventType} initialMinute={Math.floor(time / 60) + 1} players={selectedTeamId === match.home_team_id ? homePlayers : awayPlayers} opponentPlayers={selectedTeamId === match.home_team_id ? awayPlayers : homePlayers} existingEvents={events} activeLineupIds={selectedTeamId === match.home_team_id ? homeLineup : awayLineup} onSave={handleSaveEvent} />
            <PenaltyShootoutDialog
                open={penaltyDialogOpen}
                onOpenChange={setPenaltyDialogOpen}
                matchId={match.id}
                homeTeamId={match.home_team_id || match.home_team?.id || null}
                awayTeamId={match.away_team_id || match.away_team?.id || null}
                homeTeamName={match.home_team?.name || 'Home'}
                awayTeamName={match.away_team?.name || 'Away'}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                readOnly={readOnly}
            />
            <RosterSelectionDialog open={rosterDialogOpen} onOpenChange={setRosterDialogOpen} homeTeamName={match.home_team?.name || 'Home'} awayTeamName={match.away_team?.name || 'Away'} homePlayers={homePlayers} awayPlayers={awayPlayers} homeActiveIds={homeLineup} awayActiveIds={awayLineup} onSave={handleSaveLineup} readOnly={readOnly} />
            <WalkoverDialog open={woDialogOpen} onOpenChange={setWoDialogOpen} match={match} onConfirm={handleWalkover} />
            <BroadcastDialog open={overlayDialogOpen} onOpenChange={setOverlayDialogOpen} matchId={match.id} tournamentId={tournamentId} />
            <SetTimeDialog open={setTimeDialogOpen} onOpenChange={setSetTimeDialogOpen} currentTime={time} onSave={handleSetTime} />
            <AddTimeDialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen} onSave={(mins) => {
                const minute = Math.floor(time / 60) + 1;
                addEvent(null, 'add_time', minute, null, { added_minutes: mins }, `+${mins} min`);
                setAddTimeDialogOpen(false);
            }} />
            <FootballStatisticsDialog
                open={statsDialogOpen}
                onOpenChange={setStatsDialogOpen}
                match={match}
                events={events}
                homeScore={homeScore}
                awayScore={awayScore}
                visibleStats={visibleStats}
            />

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
            <FootballSettingsDialog
                open={customizeDialogOpen}
                onOpenChange={setCustomizeDialogOpen}
                match={match}
                readOnly={readOnly}
                showScoreboardPossession={showScoreboardPossession}
                onToggleScoreboardPossession={toggleScoreboardPossession}
                customActionTypes={customActionTypes}
                onToggleCustomAction={toggleCustomAction}
                visibleLogs={visibleLogs}
                onToggleVisibleLog={toggleVisibleLog}
                visibleStats={visibleStats}
                onToggleVisibleStat={toggleVisibleStat}
                onPostponeMatch={handlePostponeMatch}
                onWalkover={() => setWoDialogOpen(true)}
                onAbandonMatch={handleAbandonMatch}
            />

            {/* Team Roster & Info Dialog (ตัวจริง, ตัวสำรอง, ทีมงาน) */}
            {teamInfoTarget && (
                <TeamRosterDialog
                    open={!!teamInfoTarget}
                    onOpenChange={(open) => {
                        if (!open) setTeamInfoTarget(null);
                    }}
                    teamName={teamInfoTarget === 'home' ? (match.home_team?.name || t("home")) : (match.away_team?.name || t("away"))}
                    teamLogo={teamInfoTarget === 'home' ? match.home_team?.logo_url : match.away_team?.logo_url}
                    description={teamInfoTarget === 'home' ? match.home_team?.description : match.away_team?.description}
                    contactName={teamInfoTarget === 'home' ? match.home_team?.contact_name : match.away_team?.contact_name}
                    contactPhone={teamInfoTarget === 'home' ? match.home_team?.contact_phone : match.away_team?.contact_phone}
                    players={teamInfoTarget === 'home' ? homePlayers : awayPlayers}
                    activeLineupIds={teamInfoTarget === 'home' ? homeLineup : awayLineup}
                    events={events}
                    teamId={teamInfoTarget === 'home' ? match.home_team_id : match.away_team_id}
                    sport="football"
                />
            )}
        </div>
    );
}

