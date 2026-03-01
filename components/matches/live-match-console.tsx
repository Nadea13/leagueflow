"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPlayers } from "@/app/[locale]/dashboard/tournaments/[id]/player-actions";
import { updateMatch } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { createClient } from "@/utils/supabase/client";

import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Timer, Plus, Target } from "lucide-react";

// Types
// Types
import { Match, Goal, Player, EventType, MatchEvent } from "@/types";

// Components & Hooks
import { MatchTimer } from "./console/match-timer";
import { MatchControls } from "./console/match-controls";
import { Scoreboard } from "./console/scoreboard";
import { EventTimeline } from "./console/event-timeline";
import { MatchEventDialog } from "./console/match-event-dialog";
import { WalkoverDialog } from "./console/walkover-dialog";
import { PenaltyShootoutDialog } from "./console/penalty-shootout-dialog";
import { AddTimeDialog, SetTimeDialog } from "./console/time-dialogs";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { useMatchEvents } from "@/hooks/use-match-events";

interface LiveMatchConsoleProps {
    match: Match;
    tournamentId: string;
    goals: Goal[];
    trigger?: ReactNode;
    isPro?: boolean;
    readOnly?: boolean;
    initialEvents?: MatchEvent[];
}

export function LiveMatchConsole({ match: initialMatch, tournamentId, trigger, isPro = false, readOnly = false, initialEvents }: LiveMatchConsoleProps) {
    const t = useTranslations("Console");
    const tMatch = useTranslations("Match");
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // --- State ---
    const [match, setMatch] = useState<Match>(initialMatch);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

    // Hooks
    const { time, setTime, isRunning, setIsRunning } = useMatchTimer(match, tournamentId);
    const { events, addEvent, deleteEvent } = useMatchEvents(match.id, tournamentId, initialEvents);

    // Dialog States
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const [woDialogOpen, setWoDialogOpen] = useState(false);
    const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false);
    const [setTimeDialogOpen, setSetTimeDialogOpen] = useState(false);

    // Event Selection State
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

    // --- Effects ---

    // 1. Sync initial match prop
    useEffect(() => {
        setMatch(initialMatch);
    }, [initialMatch]);

    // 2. Fetch Players
    useEffect(() => {
        const loadPlayers = async () => {
            // Helper to fetch and set
            const fetchTeam = async (id: string, setter: any) => {
                const res = await getPlayers(id);
                if (res.success && res.data) setter(res.data);
            };
            if (match.home_team_id) fetchTeam(match.home_team_id, setHomePlayers);
            if (match.away_team_id) fetchTeam(match.away_team_id, setAwayPlayers);
        };
        loadPlayers();
    }, [match.home_team_id, match.away_team_id]);

    // 3. Realtime Subscription
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`match-${match.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
                setMatch(payload.new as Match);
                router.refresh();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [match.id, router]);


    // --- Computed Data ---
    const homeScore = events.filter(e => e.team_id === match.home_team_id && e.event_type === 'goal').length;
    const awayScore = events.filter(e => e.team_id === match.away_team_id && e.event_type === 'goal').length;
    const allPlayers = [...homePlayers, ...awayPlayers];

    // --- Handlers ---

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            router.refresh();
        }
    };

    // Match Action Handlers
    const handleStartMatch = async () => {
        if (readOnly) return;

        const currentMinute = Math.floor(time / 60);

        // Auto Event: Kick Off
        // User Request: Log event every time Start is pressed.
        const teamId = match.home_team_id || match.away_team_id;
        if (teamId) {
            await addEvent(teamId, 'kick_off', currentMinute, null, {}, "Kick Off");
        }

        // Optimistic State Update
        const updatedMatch = {
            ...match,
            status: 'live',
            timer_status: 'playing',
            elapsed_before_pause: time,
            current_minute: currentMinute
        };
        setMatch(updatedMatch as Match);
        setIsRunning(true);

        // Server Update
        await updateMatch(match.id, {
            status: 'live',
            timer_status: 'playing',
            elapsed_before_pause: time, // snapshot
            current_minute: currentMinute
        }, tournamentId);
        router.refresh();
    };

    const handlePauseMatch = async () => {
        if (readOnly) return;

        const currentMinute = Math.ceil((time || 1) / 60);

        // Auto Event: Half Time (or Pause)
        const teamId = match.home_team_id || match.away_team_id;
        if (teamId) {
            await addEvent(teamId, 'half_time', currentMinute, null, {}, "Half Time");
        }

        const updatedMatch = {
            ...match,
            timer_status: 'paused',
            elapsed_before_pause: time,
            current_minute: "HT" // or string representation
        };
        // @ts-ignore
        setMatch(updatedMatch as Match);
        setIsRunning(false);

        await updateMatch(match.id, {
            timer_status: 'paused',
            elapsed_before_pause: time,
            current_minute: "HT"
        }, tournamentId);
        router.refresh();
    };

    const handleResumeMatch = async () => {
        if (readOnly) return;

        // User Request: Always log Kick Off on Resume (covers Set Time -> Start case)
        const currentMinute = Math.floor(time / 60);
        const teamId = match.home_team_id || match.away_team_id;
        if (teamId) {
            await addEvent(teamId, 'kick_off', currentMinute, null, {}, "Kick Off");
        }

        const updatedMatch = {
            ...match,
            timer_status: 'playing',
        };
        setMatch(updatedMatch as Match);
        setIsRunning(true);

        await updateMatch(match.id, {
            timer_status: 'playing',
            current_minute: Math.ceil((time || 1) / 60)
        }, tournamentId);
        router.refresh();
    };

    const handleEndMatch = async () => {
        if (!confirm(t("confirm_end"))) return;

        const currentMinute = Math.ceil((time || 1) / 60);
        const teamId = match.home_team_id || match.away_team_id;
        if (teamId) {
            await addEvent(teamId, 'full_time', currentMinute, null, {}, "Full Time");
        }

        const updatedMatch = {
            ...match,
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore,
            current_minute: "FT"
        };
        setMatch(updatedMatch as Match);
        setIsRunning(false);

        await updateMatch(match.id, {
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore,
            current_minute: "FT"
        }, tournamentId);

        setOpen(false);
        router.refresh();
    };

    const handleWalkover = async (winnerId: string) => {
        if (!confirm(t("confirm_walkover"))) return;

        const isHomeWinner = winnerId === match.home_team_id;
        // Logic: walkover sets scores 3-0 usually. 
        // Server action likely handles this, but here we just pass updated fields

        await updateMatch(match.id, {
            status: 'finished',
            home_score: isHomeWinner ? 3 : 0,
            away_score: isHomeWinner ? 0 : 3,
            winner_id: winnerId
        }, tournamentId);

        setWoDialogOpen(false);
        setOpen(false);
        router.refresh();
    };


    // Event Handlers
    const handleQuickAction = (teamId: string, type: EventType) => {
        if (readOnly) return;
        if (!match.home_team_id || !match.away_team_id) return alert(t("error_team_missing"));

        // Instant Goal for Free Plan or general ease of use?
        // Original code: if !isPro && type === 'goal' -> Instant.
        // Let's keep that logic.
        if (!isPro && type === 'goal') {
            const minute = Math.ceil((time || 1) / 60);
            addEvent(teamId, 'goal', minute, null, {}, "Goal");
            return;
        }

        setSelectedTeamId(teamId);
        setSelectedEventType(type);
        setEventDialogOpen(true);
    };

    const handleSaveEvent = async (data: { minute: number; playerId: string; extraInfo: any }) => {
        if (!selectedTeamId || !selectedEventType) return;

        // Player Name lookup for nicer optimistic UI
        const player = allPlayers.find(p => p.id === data.playerId);
        const playerName = player ? player.name : "Unknown";

        await addEvent(selectedTeamId, selectedEventType, data.minute, data.playerId, data.extraInfo, playerName);
    };

    // Time Handlers
    const handleSaveSetTime = async (minutes: number, seconds: number) => {
        const totalSeconds = (minutes * 60) + seconds;
        setTime(totalSeconds);
        setSetTimeDialogOpen(false);

        // Update Server
        // Similar logic to original: update snapshot or current minute
        await updateMatch(match.id, {
            elapsed_before_pause: totalSeconds,
            current_minute: Math.ceil((totalSeconds || 1) / 60)
        }, tournamentId);
        router.refresh();
    };

    const handleSaveAddTime = async (minutes: number) => {
        // Add Time Event
        const currentMinute = Math.ceil((time || 1) / 60);
        const teamId = match.home_team_id || match.away_team_id; // Arbitrary owner
        if (teamId) {
            await addEvent(teamId, 'add_time', currentMinute, null, { added_minutes: minutes }, `+${minutes} min`);
        }
        setAddTimeDialogOpen(false);
    };


    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className={cn("gap-2", match.status === 'live' && "border-red-500 text-red-600")}>
                        {match.status === 'live' && <span className="flex h-2 w-2 rounded-none bg-red-500 animate-pulse" />}
                        {t("console")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex flex-row items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="font-bold text-lg">{t("match_console")}</DialogTitle>
                        <div className="sr-only">
                            <DialogDescription>
                                {t("match_console")}
                            </DialogDescription>
                        </div>
                        <Badge variant={match.status === 'live' ? 'destructive' : 'secondary'} className="animate-pulse">
                            {match.status === 'live' ? tMatch("status_live") : tMatch("status_" + match.status)}
                        </Badge>
                    </div>
                    <MatchTimer
                        time={time}
                        readOnly={readOnly || match.status === 'finished'}
                        customText={match.status === 'finished' ? (match.current_minute || "FT") : null}
                    />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50 dark:bg-slate-950/50">
                    <MatchControls
                        status={match.status}
                        isRunning={isRunning}
                        readOnly={readOnly}
                        onStart={handleStartMatch}
                        onPause={handlePauseMatch}
                        onResume={handleResumeMatch}
                        onEnd={handleEndMatch}
                    />

                    {!readOnly && match.status !== 'finished' && (
                        <div className="flex justify-center items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSetTimeDialogOpen(true)}
                                title={t("set_time")}
                            >
                                <Timer className="h-4 w-4 mr-1" /> {t("set_time")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAddTimeDialogOpen(true)}
                                title={t("add_time")}
                            >
                                <Plus className="h-4 w-4 mr-1" /> {t("add_time")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setWoDialogOpen(true)}
                                title={t("walkover")}
                            >
                                <span className="text-xs font-bold mr-1">WO</span> {t("walkover")}
                            </Button>
                            {/* Penalty Shootout - Only for knockout stages */}
                            {(match.stage !== 'league' && match.stage !== 'group') && (
                                <PenaltyShootoutDialog
                                    matchId={match.id}
                                    homeTeamId={match.home_team_id}
                                    awayTeamId={match.away_team_id}
                                    homeTeamName={match.home_team?.name || 'Home'}
                                    awayTeamName={match.away_team?.name || 'Away'}
                                    trigger={
                                        <Button type="button" variant="outline" size="sm">
                                            <Target className="h-4 w-4 mr-1" /> PEN
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    )}

                    <Scoreboard
                        match={match}
                        homeScore={homeScore}
                        awayScore={awayScore}
                        isPro={isPro}
                        readOnly={readOnly}
                        onAction={handleQuickAction}
                    />

                    <EventTimeline
                        events={events}
                        match={match}
                        players={allPlayers}
                        readOnly={readOnly}
                        onDelete={deleteEvent}
                    />
                </div>
            </DialogContent>

            {/* Dialogs */}
            <MatchEventDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                teamId={selectedTeamId}
                eventType={selectedEventType}
                initialMinute={Math.ceil((time || 1) / 60)}
                players={selectedTeamId === match.home_team_id ? homePlayers : awayPlayers}
                onSave={handleSaveEvent}
            />

            <WalkoverDialog
                open={woDialogOpen}
                onOpenChange={setWoDialogOpen}
                match={match}
                onConfirm={handleWalkover}
            />

            <SetTimeDialog
                open={setTimeDialogOpen}
                onOpenChange={setSetTimeDialogOpen}
                currentTime={time}
                onSave={handleSaveSetTime}
            />

            <AddTimeDialog
                open={addTimeDialogOpen}
                onOpenChange={setAddTimeDialogOpen}
                onSave={handleSaveAddTime}
            />

        </Dialog>
    );
}