"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPlayers } from "@/app/[locale]/organizer/tournaments/[id]/player-actions";
import { updateMatch } from "@/app/[locale]/organizer/tournaments/[id]/actions";
import { getPenaltyShootout } from "@/app/[locale]/organizer/tournaments/[id]/penalty-actions";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Timer,
    ArrowLeft,
    Target,
    RotateCcw,
    History,
    Settings,
    User,
    Undo,
    Ban,
    Activity,
    Square,
    Repeat,
    PlusCircle,
    Flag,
    ArrowRight,
    Trophy,
    Stethoscope,
    Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";

// Types
import { Match, Player, EventType, MatchEvent, PenaltyShot } from "@/types";

// Components & Hooks
import { MatchControls } from "./console/match-controls";
import { Scoreboard } from "./console/scoreboard";
import { EventTimeline } from "./console/event-timeline";
import { MatchEventDialog } from "./console/match-event-dialog";
import { WalkoverDialog } from "./console/walkover-dialog";
import { PenaltyShootoutDialog } from "./console/penalty-shootout-dialog";
import { AddTimeDialog, SetTimeDialog } from "./console/time-dialogs";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { useMatchEvents } from "@/hooks/use-match-events";
import { EVENT_TYPES } from "./console/constants";

interface MatchConsolePageProps {
    match: Match;
    tournamentId: string;
    goals: any[];
    isPro?: boolean;
    readOnly?: boolean;
    initialEvents?: MatchEvent[];
    backUrl: string;
    tournamentName?: string;
}

export function MatchConsolePage({ match: initialMatch, tournamentId, isPro = false, readOnly = false, initialEvents, backUrl, tournamentName }: MatchConsolePageProps) {
    const t = useTranslations("Console");
    const tMatch = useTranslations("Match");
    const tCommon = useTranslations("Common");
    const tPublic = useTranslations("PublicView");
    const router = useRouter();
    const { toast } = useToast();

    // --- State ---
    const [match, setMatch] = useState<Match>(initialMatch);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

    // Hooks
    const { events, addEvent, deleteEvent } = useMatchEvents(match.id, tournamentId, initialEvents, readOnly);
    const { time, setTime, isRunning, setIsRunning } = useMatchTimer(match, tournamentId, events);

    // Dialog States
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [woDialogOpen, setWoDialogOpen] = useState(false);
    const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false);
    const [setTimeDialogOpen, setSetTimeDialogOpen] = useState(false);
    const [penaltyShots, setPenaltyShots] = useState<PenaltyShot[]>([]);

    // Event Selection State
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

    // --- Effects ---
    useEffect(() => {
        setMatch(initialMatch);
    }, [initialMatch]);

    useEffect(() => {
        const loadPlayers = async () => {
            const fetchTeam = async (id: string, setter: any) => {
                const res = await getPlayers(id);
                if (res.success && res.data) setter(res.data);
            };
            if (match.home_team_id) fetchTeam(match.home_team_id, setHomePlayers);
            if (match.away_team_id) fetchTeam(match.away_team_id, setAwayPlayers);
        };
        loadPlayers();
    }, [match.home_team_id, match.away_team_id]);

    const fetchShots = async () => {
        const res = await getPenaltyShootout(match.id);
        if (res.success && res.data) {
            setPenaltyShots(res.data);
        }
    };

    useEffect(() => {
        fetchShots();
    }, [match.id]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`match-${match.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
                const newData = payload.new as any;
                setMatch(prev => ({ ...prev, ...newData }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [match.id]);

    // --- Computed Data ---
    const isHomeTeam = (id: string) => id === match.home_team_id || id === match.home_team?.id;
    const isAwayTeam = (id: string) => id === match.away_team_id || id === match.away_team?.id;

    const homeScore = events.filter((e: MatchEvent) => e.team_id && isHomeTeam(e.team_id) && e.event_type === 'goal').length;
    const awayScore = events.filter((e: MatchEvent) => e.team_id && isAwayTeam(e.team_id) && e.event_type === 'goal').length;
    const allPlayers = [...homePlayers, ...awayPlayers];

    // --- Handlers ---
    const handleStartMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        const backupMatch = { ...match };
        const backupIsRunning = isRunning;

        // Optimistic UI Update
        setIsRunning(true);
        setMatch(prev => ({ ...prev, status: 'live', timer_status: 'playing' }));

        try {
            if (resolvedTeamId) {
                const res = await addEvent(null, 'kick_off', currentMinute, null, { start_timestamp: Date.now() }, "Kick Off");
                if (!res.success) throw new Error(`${res.error || "Failed to add kick-off"} (Team: ${resolvedTeamId})`);
            } else {
                throw new Error("Missing team IDs for kick-off");
            }

            const updateRes = await updateMatch(match.id, { status: 'live', timer_status: 'playing', elapsed_before_pause: time, current_minute: currentMinute }, tournamentId);
            if (!updateRes.success) throw new Error(`${updateRes.error || "Failed to update match"} (Match: ${match.id})`);

            toast({ title: t("match_started") || "Match Started" });
        } catch (error: any) {
            console.error("Start match error:", error);
            setIsRunning(backupIsRunning);
            setMatch(backupMatch);
            toast({
                title: "Error starting match",
                description: `${error.message} (Match: ${match.id.substring(0, 8)})`,
                variant: "destructive"
            });
        }
    };

    const handlePauseMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        const backupMatch = { ...match };
        const backupIsRunning = isRunning;

        // Optimistic UI Update
        setIsRunning(false);
        setMatch(prev => ({ ...prev, timer_status: 'paused', elapsed_before_pause: time }));

        try {
            if (resolvedTeamId) {
                const res = await addEvent(null, 'match_paused', currentMinute, null, {}, "Match Paused");
                if (!res.success) throw new Error(`${res.error || "Failed to add match pause"} (Team: ${resolvedTeamId})`);
            }
            // Clear any 'add_time' events when pausing, so it's reset for the next resumption
            const addTimeEvents = events.filter(e => e.event_type === 'add_time');
            for (const e of addTimeEvents) {
                await deleteEvent(e.id);
            }

            const updateRes = await updateMatch(match.id, { timer_status: 'paused', elapsed_before_pause: time, current_minute: currentMinute }, tournamentId);
            if (!updateRes.success) throw new Error(`${updateRes.error || "Failed to update match balance"} (Match: ${match.id})`);

            toast({ title: t("match_paused") || "Match Paused" });
        } catch (error: any) {
            console.error("Pause match error:", error);
            setIsRunning(backupIsRunning);
            setMatch(backupMatch);
            toast({
                title: "Error pausing match",
                description: `${error.message} (Match: ${match.id.substring(0, 8)})`,
                variant: "destructive"
            });
        }
    };

    const handleResumeMatch = async () => {
        if (readOnly) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        const resolvedTeamId = match.home_team?.id || match.away_team?.id || teamId;

        const backupMatch = { ...match };
        const backupIsRunning = isRunning;

        // Optimistic UI Update
        setIsRunning(true);
        setMatch(prev => ({ ...prev, timer_status: 'playing' }));

        try {
            if (resolvedTeamId) {
                const res = await addEvent(null, 'match_resumed', currentMinute, null, { start_timestamp: Date.now() }, "Match Resumed");
                if (!res.success) throw new Error(`${res.error || "Failed to add match resume"} (Team: ${resolvedTeamId})`);
            }
            const updateRes = await updateMatch(match.id, { timer_status: 'playing', current_minute: Math.floor(time / 60) + 1 }, tournamentId);
            if (!updateRes.success) throw new Error(`${updateRes.error || "Failed to update match resume"} (Match: ${match.id})`);

            toast({ title: t("match_resumed") || "Match Resumed" });
        } catch (error: any) {
            console.error("Resume match error:", error);
            setIsRunning(backupIsRunning);
            setMatch(backupMatch);
            toast({
                title: "Error resuming match",
                description: `${error.message} (Match: ${match.id.substring(0, 8)})`,
                variant: "destructive"
            });
        }
    };

    const handleEndMatch = async () => {
        if (!confirm(t("confirm_end"))) return;
        const currentMinute = Math.floor(time / 60) + 1;
        const teamId = match.home_team_id || match.away_team_id;
        await addEvent(null, 'full_time', currentMinute, null, {}, "Full Time");
        setIsRunning(false);
        await updateMatch(match.id, { status: 'finished', home_score: homeScore, away_score: awayScore, current_minute: currentMinute }, tournamentId);
    };

    const handleWalkover = async (winnerId: string) => {
        if (!confirm(t("confirm_walkover"))) return;
        const isHomeWinner = winnerId === match.home_team_id;
        await updateMatch(match.id, { status: 'finished', home_score: isHomeWinner ? 3 : 0, away_score: isHomeWinner ? 0 : 3, winner_id: winnerId }, tournamentId);
        setWoDialogOpen(false);
        router.refresh();
    };

    const handleUndo = async () => {
        if (readOnly) return;
        const lastEvent = events.find((e: MatchEvent) => !e.id.startsWith("temp-"));
        if (!lastEvent) return toast({ title: t("no_events") });

        const evtConfig = EVENT_TYPES.find(e => e.type === lastEvent.event_type);
        const label = evtConfig ? t(evtConfig.label) : lastEvent.event_type;

        if (!confirm(`${tCommon("delete")} '${label}'?`)) return;
        await deleteEvent(lastEvent.id);
    };

    const handleQuickAction = (teamId: string, type: EventType) => {
        if (readOnly) return;
        if (type === 'corner') {
            const minute = Math.floor(time / 60) + 1;
            addEvent(teamId, 'corner', minute, null, {}, "Corner");
            return;
        }
        if (!isPro && type === 'goal') {
            const minute = Math.floor(time / 60) + 1;
            addEvent(teamId, 'goal', minute, null, {}, "Goal");
            return;
        }
        setSelectedTeamId(teamId);
        setSelectedEventType(type);
        setEventDialogOpen(true);
    };

    const handleSaveEvent = async (data: { minute: number; playerId: string; extraInfo: any; autoRed?: boolean }) => {
        if (!selectedTeamId || !selectedEventType) return;
        const player = allPlayers.find(p => p.id === data.playerId);
        const playerName = player ? player.name : "Unknown";
        await addEvent(selectedTeamId, data.autoRed ? 'red_card' : selectedEventType, data.minute, data.playerId, data.extraInfo, playerName);
    };

    const handleSetTime = async (minutes: number, seconds: number) => {
        const totalSeconds = (minutes * 60) + seconds;
        setTime(totalSeconds);
        const currentMinute = Math.ceil((totalSeconds || 1) / 60);
        await updateMatch(match.id, { elapsed_before_pause: totalSeconds, current_minute: currentMinute }, tournamentId);
        setSetTimeDialogOpen(false);
    };

    const lastAddTimeEvent = [...events].reverse().find(e => e.event_type === 'add_time' && !e.id.startsWith("temp-"));
    const addedTime = lastAddTimeEvent?.extra_info?.added_minutes || null;

    // --- Team Action Grid Component ---
    const TeamActionGrid = ({ teamId, name, type }: { teamId: string, name: string, type: 'home' | 'away' }) => {
        const actions = [
            { type: 'goal', label: t("goal"), icon: Trophy, color: 'hover:bg-secondary hover:text-black hover:border-secondary' },
            { type: 'yellow_card', label: t("yellow_card"), icon: Square, color: 'hover:bg-yellow-400 hover:text-black hover:border-yellow-400', iconColor: 'text-yellow-500' },
            { type: 'red_card', label: t("red_card"), icon: Square, color: 'hover:bg-red-500 hover:text-white hover:border-red-500', iconColor: 'text-red-500' },
            { type: 'substitution', label: t("substitution"), icon: Repeat, color: 'hover:bg-blue-500 hover:text-white hover:border-blue-500' },
            { type: 'foul', label: t("foul") || "Foul", icon: Activity, color: 'hover:bg-orange-500 hover:text-white hover:border-orange-500' },
            { type: 'penalty', label: t("penalty") || "Penalty", icon: Target, color: 'hover:bg-indigo-600 hover:text-white hover:border-indigo-600' },
            { type: 'save', label: t("save") || "Save", icon: Shield, color: 'hover:bg-teal-600 hover:text-white hover:border-teal-600' },
            { type: 'injury', label: t("injury") || "Injury", icon: Stethoscope, color: 'hover:bg-amber-600 hover:text-white hover:border-amber-600' },
            { type: 'corner', label: t("corner") || "Corner", icon: Flag, color: 'hover:bg-white hover:text-black hover:border-white' },
        ];

        return (
            <div className="bg-white/5 border border-white/5 p-4 md:p-6 relative overflow-hidden group">
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full translate-y-full group-hover:translate-y-0 transition-transform duration-500",
                    type === 'home' ? "bg-secondary" : "bg-white/40"
                )} />
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rotate-12 transition-transform group-hover:scale-110" />

                <div className="relative z-10 space-y-2 md:space-y-3">
                    <div className="space-y-1 pb-2 md:pb-3 border-b border-white/5">
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">{name}</h3>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{type === 'home' ? 'Home' : 'Away'} Team Actions</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {actions.map((action) => (
                            <Button
                                variant="outline"
                                key={action.type}
                                onClick={() => handleQuickAction(teamId, action.type as EventType)}
                                className={cn(
                                    "group flex flex-col items-center justify-center h-20 border-white/5 bg-white/5 transition-all duration-300 rounded-none",
                                    action.color
                                )}
                            >
                                <action.icon className={cn("h-5 w-5 mb-1 transition-transform group-hover:scale-110", action.iconColor)} />
                                <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{action.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "min-h-screen bg-[#0A0A0B] text-foreground flex flex-col font-display selection:bg-secondary/30 space-y-4 md:space-y-6",
            readOnly ? "pt-18 md:pt-22 px-2 md:px-0" : "pt-0"
        )}>
            {/* Top Navigation Bar */}
            {readOnly && (
                <nav className="border-b fixed top-0 border-slate-200 dark:border-white/10 left-0 right-0 z-50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 print:hidden">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                            <svg viewBox="0 0 160 160" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                                <path d="M85.4616 21.9501C86.0436 21.9471 86.6256 21.9441 87.2253 21.941C94.6778 21.9214 101.867 22.4122 109.212 23.8001C108.078 25.1269 106.944 26.4529 105.805 27.7751C104.953 28.7693 104.105 29.7682 103.268 30.7751C95.053 40.4796 85.8612 49.0996 75.6116 56.6001C75.0985 56.9801 74.5855 57.3601 74.0569 57.7517C62.719 66.1146 50.7349 73.3682 38.3116 80.0001C37.7382 80.3066 37.1648 80.6131 36.5741 80.9288C32.6149 83.0001 32.6149 83.0001 30.8116 83.0001C30.5549 81.8516 30.3068 80.7011 30.0616 79.5501C29.9223 78.9097 29.7831 78.2693 29.6397 77.6095C28.1595 68.5881 28.3166 59.5618 28.3616 50.4501C28.3656 49.0256 28.3692 47.6012 28.3725 46.1767C28.3812 42.7178 28.395 39.259 28.4116 35.8001C43.3259 28.6069 43.3259 28.6069 49.5616 26.7501C50.1967 26.5597 50.8319 26.3693 51.4864 26.1732C53.3888 25.6225 55.296 25.1029 57.2116 24.6001C58.021 24.3849 58.021 24.3849 58.8467 24.1654C67.5959 21.9748 76.496 21.9759 85.4616 21.9501Z" fill="#0D2C54" />
                                <path d="M143.612 48.5996C144.14 48.5996 144.668 48.5996 145.212 48.5996C145.95 75.4476 143.218 103.372 125.212 124.6C124.536 125.405 123.861 126.21 123.165 127.04C114.98 136.526 99.6453 150.742 86.8117 152.6C84.5742 151.628 84.5742 151.628 82.2117 150.25C81.4238 149.797 80.636 149.344 79.8242 148.878C79.2261 148.522 78.628 148.166 78.0117 147.8C78.0117 145.4 78.0117 145.4 79.3117 144.04C79.9387 143.515 80.5657 142.99 81.2117 142.45C90.2309 134.585 98.7241 126.103 106.012 116.6C106.823 115.571 107.634 114.543 108.446 113.515C123.99 93.7006 135.136 72.2987 143.612 48.5996Z" fill="#0D2C54" />
                                <path d="M128.411 7C128.675 7.528 128.939 8.056 129.211 8.6C128.486 10.2676 128.486 10.2676 127.323 12.3313C126.896 13.091 126.47 13.8508 126.03 14.6336C125.562 15.4475 125.093 16.2614 124.611 17.1C124.136 17.9304 123.661 18.7608 123.172 19.6164C114.766 34.1514 104.746 46.8321 93.2106 59C92.3567 59.9049 92.3567 59.9049 91.4856 60.8281C87.7139 64.7157 83.6366 68.1475 79.3899 71.5047C77.8355 72.739 76.2941 73.9889 74.7512 75.2375C66.616 81.759 58.2439 87.4056 49.2106 92.6C48.3451 93.1068 48.3451 93.1068 47.4621 93.6238C21.8479 108.6 21.8479 108.6 15.6106 108.6C15.3372 107.502 15.0722 106.401 14.8106 105.3C14.5878 104.381 14.5878 104.381 14.3606 103.444C13.9648 101.133 13.988 98.941 14.0106 96.6C14.5443 96.3837 15.078 96.1674 15.6279 95.9445C43.5248 84.5694 70.347 70.2494 92.4106 49.4C93.5065 48.4454 94.6064 47.4952 95.7106 46.55C101.954 41.0825 107.257 35.0974 112.411 28.6C112.769 28.1515 113.128 27.7031 113.497 27.241C118.747 20.6719 123.743 14.0008 128.411 7Z" fill="#00C49A" />
                                <path d="M132.412 16.5996C132.808 17.3916 132.808 17.3916 133.212 18.1996C132.401 20.3205 132.401 20.3205 131.121 23.009C130.893 23.4895 130.665 23.97 130.43 24.465C129.682 26.0307 128.923 27.5906 128.162 29.1496C127.905 29.6788 127.648 30.2079 127.384 30.7531C123.495 38.7442 119.335 46.2689 114.012 53.3996C113.424 54.2174 112.836 55.0352 112.23 55.8777C110.469 58.29 108.658 60.6516 106.812 62.9996C106.212 63.7638 105.613 64.5279 104.996 65.3152C94.7698 77.8603 83.0952 89.4632 70.0115 98.9996C68.8962 99.869 68.8962 99.869 67.7584 100.756C57 109.105 45.5483 116.434 33.2115 122.2C32.4195 118.24 31.6275 114.28 30.8115 110.2C31.7139 109.743 32.6162 109.286 33.5459 108.815C61.9532 94.2572 89.802 74.4553 109.729 49.166C110.957 47.616 112.202 46.0805 113.446 44.5434C119.624 36.8337 125.049 28.9151 130 20.3654C130.761 19.084 131.585 17.8399 132.412 16.5996Z" fill="#00C49A" />
                                <path d="M137.211 24.5986C138.191 27.5371 137.739 28.1896 136.565 30.983C136.234 31.7759 135.904 32.5688 135.563 33.3857C135.2 34.2315 134.836 35.0773 134.461 35.9486C133.908 37.2513 133.908 37.2513 133.343 38.5803C119.694 70.3639 98.4172 99.4369 70.8115 120.599C69.8872 121.334 68.9644 122.072 68.0427 122.811C53.7988 134.199 53.7988 134.199 50.8115 134.199C50.2508 132.803 49.7033 131.402 49.1615 129.999C48.8552 129.219 48.5489 128.439 48.2334 127.636C47.3033 124.29 47.3033 124.29 48.4115 122.199C50.0305 120.986 51.5772 119.968 53.3115 118.949C72.4474 107.16 90.9969 91.6468 105.002 74.0486C106.187 72.5746 107.402 71.1232 108.646 69.6986C120.381 56.2213 129.292 40.5486 137.211 24.5986Z" fill="#00C49A" />
                                <path d="M140.411 36.5996C142.712 43.4067 137.507 52.0474 134.811 58.1996C134.394 59.1908 133.977 60.1825 133.561 61.1746C122.113 88.2649 104.9 111.364 84.2613 132.15C83.5297 132.889 82.798 133.628 82.0441 134.39C69.3737 147 69.3737 147 66.0113 147C65.3187 145.454 64.6375 143.903 63.9613 142.35C63.5808 141.486 63.2003 140.623 62.8082 139.734C62.0113 137.4 62.0113 137.4 62.8113 135C64.3926 133.731 64.3926 133.731 66.5113 132.3C81.2412 121.83 95.1535 108.643 106.011 94.1996C106.769 93.2149 107.528 92.2306 108.286 91.2465C121.242 74.329 132.257 56.3321 140.411 36.5996Z" fill="#00C49A" />
                            </svg>
                            <span className="font-black text-foreground text-xl italic tracking-tighter">LeagueFlow</span>
                        </Link>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-sm text-muted-foreground">{tPublic("public_view")}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{tPublic("beta")}</Badge>
                        </div>
                    </div>
                </nav>
            )}

            <header className="flex items-center justify-between gap-4 md:gap-6 mx-auto w-full max-w-[1600px]">
                <div className="flex items-start gap-2 md:gap-3 w-full">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-none h-8 w-8 md:h-10 md:w-10 shrink-0 border border-border/50 hover:bg-secondary hover:text-black transition-all shadow-lg shadow-black/20"
                        asChild
                    >
                        <Link href={backUrl}>
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                    <div className="text-2xl md:text-5xl flex items-center gap-2 md:gap-3">
                        <span className="font-black uppercase tracking-tighter text-white">{match.home_team?.name || 'Home'}</span>
                        <span className="text-secondary text-xs md:text-sm font-black tracking-widest opacity-50 px-2 leading-none">VS</span>
                        <span className="font-black uppercase tracking-tighter text-white">{match.away_team?.name || 'Away'}</span>
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-secondary/10 border border-secondary/20 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-secondary/5 -rotate-12 translate-x-4 -translate-y-4" />
                        <span className="relative flex h-2 w-2">
                            <span className={cn(
                                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                match.status === 'live' ? "bg-secondary" : "bg-amber-400"
                            )}></span>
                            <span className={cn(
                                "relative inline-flex rounded-full h-2 w-2",
                                match.status === 'live' ? "bg-secondary" : "bg-amber-500"
                            )}></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {match.status === 'live' ? tMatch("status_live") : tMatch("status_" + match.status)}
                        </span>
                    </div>
                )}
            </header>

            <main className="flex-1 mx-auto w-full grid grid-cols-12 gap-2 md:gap-3 max-w-[1600px]">
                {/* Sidebar: Admin Controls or Match Info */}
                <aside className="col-span-12 lg:col-span-3 lg:row-span-2 gap-2 md:gap-3 order-2 lg:order-1 flex flex-col">
                        {/* Match Controls */}
                        <div className="bg-white/5 border border-white/5 p-4 md:p-6 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />

                                <div className="relative z-10 space-y-2 md:space-y-3">
                                    <div className="space-y-1 pb-2 md:pb-3 border-b border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary">{readOnly ? tMatch("status") || "Match Status" : t("match_controls")}</h4>
                                        <p className="text-[9px] text-muted-foreground">{readOnly ? "Real-time match updates" : "Real-time session management"}</p>
                                    </div>
                                    {readOnly ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{t("tournament") || "Tournament"}</span>
                                                <span className="text-[10px] font-black uppercase italic text-white truncate max-w-[120px]">{tournamentName}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{t("stage") || "Stage"}</span>
                                                <span className="text-[10px] font-black uppercase italic text-secondary">{match.stage || "Regular"}</span>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <div className="flex flex-col items-center gap-2 py-4 bg-secondary/5 border border-secondary/10">
                                                    <Timer className="w-6 h-6 text-secondary animate-pulse" />
                                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary/60">LIVE UPDATES ACTIVE</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <MatchControls
                                            status={match.status}
                                            isRunning={isRunning}
                                            readOnly={false}
                                            onStart={handleStartMatch}
                                            onPause={handlePauseMatch}
                                            onResume={handleResumeMatch}
                                            onEnd={handleEndMatch}
                                            onSetTime={() => setSetTimeDialogOpen(true)}
                                            onAddTime={() => setAddTimeDialogOpen(true)}
                                        />
                                    )}
                                </div>
                            </div>

                        {!readOnly && (
                            <div className="bg-white/5 border border-white/5 p-4 md:p-6 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-secondary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />

                                <div className="relative z-10 space-y-2 md:space-y-3">
                                    <div className="space-y-1 pb-2 md:pb-3 border-b border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary">{t("quick_actions")}</h4>
                                        <p className="text-[9px] text-muted-foreground italic">Admin session tools</p>
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleUndo}
                                            className="w-full flex justify-center md:justify-start items-center gap-3 h-12 border-white/5 bg-white/5 hover:bg-white/10 hover:border-secondary/50 rounded-none transition-all group"
                                        >
                                            <Undo className="h-4 w-4 text-muted-foreground group-hover:text-secondary" />
                                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{t("undo")}</span>
                                        </Button>
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
                                                    className="w-full flex justify-center md:justify-start items-center gap-3 h-12 border-white/5 bg-white/5 hover:bg-white/10 hover:border-secondary/50 rounded-none transition-all group"
                                                >
                                                    <Target className="h-4 w-4 text-muted-foreground group-hover:text-secondary" />
                                                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{t("penalty_shootout")}</span>
                                                </Button>
                                            }
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => setWoDialogOpen(true)}
                                            className="w-full flex justify-center md:justify-start items-center gap-3 h-12 border-white/5 bg-red-500/5 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/30 rounded-none transition-all group"
                                        >
                                            <Ban className="h-4 w-4 text-red-500/50 group-hover:text-red-500" />
                                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-red-500/70 group-hover:text-red-500">WO {t("walkover")}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>

                {/* Scoreboard Section */}
                <section className="flex flex-col gap-2 md:gap-3 col-span-12 lg:col-span-9 order-1 lg:order-2">
                    <Scoreboard
                        match={match}
                        homeScore={homeScore}
                        awayScore={awayScore}
                        isPro={isPro}
                        readOnly={readOnly}
                        onAction={handleQuickAction}
                        onTeamClick={(teamId) => {
                            setSelectedTeamId(teamId);
                            setEventDialogOpen(true);
                        }}
                        timerTime={time}
                        timerReadOnly={readOnly || match.status === 'finished'}
                        timerCustomText={match.status === 'finished' ? (match.current_minute || "FT") : null}
                        addedTime={isRunning ? addedTime : null}
                    />

                    {!readOnly && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            <TeamActionGrid teamId={match.home_team_id!} name={match.home_team?.name || 'Home'} type="home" />
                            <TeamActionGrid teamId={match.away_team_id!} name={match.away_team?.name || 'Away'} type="away" />
                        </div>
                    )}
                </section>

                {/* Timeline Section */}
                <section className="flex flex-col gap-6 col-span-12 lg:col-span-9 order-3 lg:order-3">
                    <EventTimeline
                        events={[
                            ...events,
                            ...penaltyShots.map((ps: PenaltyShot) => ({
                                id: ps.id, match_id: ps.match_id, team_id: ps.team_id, player_id: ps.player_id, event_type: 'penalty_shot' as const, minute: 120, extra_info: { scored: ps.scored, round: ps.round }, created_at: ps.created_at, player_name: ps.player?.name
                            }))
                        ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
                        match={match}
                        players={allPlayers}
                        readOnly={readOnly}
                        onDelete={deleteEvent}
                    />
                </section>
            </main>

            {/* Dialogs */}
            <MatchEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} teamId={selectedTeamId} eventType={selectedEventType} initialMinute={Math.floor(time / 60) + 1} players={selectedTeamId === match.home_team_id ? homePlayers : awayPlayers} existingEvents={events} onSave={handleSaveEvent} />
            <WalkoverDialog open={woDialogOpen} onOpenChange={setWoDialogOpen} match={match} onConfirm={handleWalkover} />
            <SetTimeDialog open={setTimeDialogOpen} onOpenChange={setSetTimeDialogOpen} currentTime={time} onSave={handleSetTime} />
            <AddTimeDialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen} onSave={(mins) => {
                const minute = Math.floor(time / 60) + 1;
                addEvent(null, 'add_time', minute, null, { added_minutes: mins }, `+${mins} min`);
                setAddTimeDialogOpen(false);
            }} />
        </div>
    );
}
