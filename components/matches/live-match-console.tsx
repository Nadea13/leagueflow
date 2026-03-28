"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPlayers } from "@/app/[locale]/organizer/tournaments/[id]/player-actions";
import { updateMatch } from "@/app/[locale]/organizer/tournaments/[id]/actions";
import { getPenaltyShootout } from "@/app/[locale]/organizer/tournaments/[id]/penalty-actions";
import { createClient } from "@/utils/supabase/client";

import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Timer, Plus, Target, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
// Types
import { Match, Goal, Player, EventType, MatchEvent, PenaltyShot } from "@/types";

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
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    // --- State ---
    const [match, setMatch] = useState<Match>(initialMatch);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

    // Hooks
    const { events, addEvent, deleteEvent } = useMatchEvents(match.id, tournamentId, initialEvents);
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

    // 2.1 Fetch Penalty Shots
    const fetchShots = async () => {
        const res = await getPenaltyShootout(match.id);
        if (res.success && res.data) {
            setPenaltyShots(res.data);
        }
    };

    useEffect(() => {
        fetchShots();
    }, [match.id]);

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

        // Sequence of periods based on existing events
        // 1st pause: Half Time
        // 2nd pause: Full Time
        // 3rd pause: Extra Time Interval
        // 4th+ pause: Full Time

        // Count existing period markers
        const pausePeriods = events.filter(e =>
            ['half_time', 'full_time', 'add_time'].includes(e.event_type) &&
            ['Half Time', 'Full Time', 'Extra Time Interval'].includes(e.player_name || '')
        );
        const pauseCount = pausePeriods.length;

        let periodEvent: EventType = 'half_time';
        let periodName = 'Half Time';

        if (pauseCount === 0) {
            periodEvent = 'half_time';
            periodName = 'Half Time';
        } else if (pauseCount === 1) {
            periodEvent = 'full_time';
            periodName = 'Full Time';
        } else if (pauseCount === 2) {
            periodEvent = 'add_time'; // Using add_time but labeled as Extra Time Interval
            periodName = 'Extra Time Interval';
        } else {
            periodEvent = 'full_time';
            periodName = 'Full Time';
        }

        // Auto Event: Period Marker
        const teamId = match.home_team_id || match.away_team_id;
        if (teamId) {
            await addEvent(teamId, periodEvent, currentMinute, null, {}, periodName);
        }

        const updatedMatch = {
            ...match,
            timer_status: 'paused',
            elapsed_before_pause: time,
            current_minute: currentMinute // Fix integer constraint error
        };
        setMatch(updatedMatch as Match);
        setIsRunning(false);

        await updateMatch(match.id, {
            timer_status: 'paused',
            elapsed_before_pause: time,
            current_minute: currentMinute
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

        // Fetch latest penalty shootout scores
        let penaltyHomeScore = 0;
        let penaltyAwayScore = 0;
        const penaltyRes = await getPenaltyShootout(match.id);
        if (penaltyRes.success && penaltyRes.data) {
            const homeShots = penaltyRes.data.filter((s: PenaltyShot) => s.team_id === match.home_team_id);
            const awayShots = penaltyRes.data.filter((s: PenaltyShot) => s.team_id === match.away_team_id);
            penaltyHomeScore = homeShots.filter((s: PenaltyShot) => s.scored).length;
            penaltyAwayScore = awayShots.filter((s: PenaltyShot) => s.scored).length;
        }
        // Auto-determine winner
        let winnerId: string | null = null;
        if (homeScore > awayScore) {
            winnerId = match.home_team_id;
        } else if (awayScore > homeScore) {
            winnerId = match.away_team_id;
        } else if (penaltyHomeScore > penaltyAwayScore) {
            winnerId = match.home_team_id;
        } else if (penaltyAwayScore > penaltyHomeScore) {
            winnerId = match.away_team_id;
        }

        const updatedMatch = {
            ...match,
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore,
            penalty_home_score: penaltyHomeScore,
            penalty_away_score: penaltyAwayScore,
            current_minute: currentMinute,
            winner_id: winnerId
        };
        setMatch(updatedMatch as Match);
        setIsRunning(false);

        await updateMatch(match.id, {
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore,
            penalty_home_score: penaltyHomeScore,
            penalty_away_score: penaltyAwayScore,
            current_minute: currentMinute,
            winner_id: winnerId
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

    const handleUndo = async () => {
        if (readOnly) return;

        // Find the most recent non-temporary event to delete
        const lastEvent = events.find(e => !e.id.startsWith("temp-"));
        if (!lastEvent) {
            toast({ title: t("no_events"), description: "No events to undo.", variant: "default" });
            return;
        }

        if (!confirm(`Are you sure you want to undo recently added '${tMatch(lastEvent.event_type)}'?`)) return;

        const res = await deleteEvent(lastEvent.id);
        if (!res.success) {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
            toast({ title: "Undo successful" });
        }
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

    const handleSaveEvent = async (data: { minute: number; playerId: string; extraInfo: any; autoRed?: boolean }) => {
        if (!selectedTeamId || !selectedEventType) return;

        // Player Name lookup for nicer optimistic UI
        const player = allPlayers.find(p => p.id === data.playerId);
        const playerName = player ? player.name : "Unknown";

        const typeToSave = data.autoRed ? 'red_card' : selectedEventType;

        await addEvent(selectedTeamId, typeToSave, data.minute, data.playerId, data.extraInfo, playerName);
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
                        onSetTime={() => setSetTimeDialogOpen(true)}
                    />

                    {!readOnly && match.status !== 'finished' && (
                        <div className="flex justify-center items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleUndo}
                                title={"Undo Last Event"}
                            >
                                <RotateCcw className="h-4 w-4 mr-1" /> Undo
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
                        </div>
                    )}

                    {/* Penalty Shootout - always accessible (even after match ends) */}
                    {!readOnly && (
                        <div className="flex justify-center items-center">
                            <PenaltyShootoutDialog
                                matchId={match.id}
                                homeTeamId={match.home_team_id}
                                awayTeamId={match.away_team_id}
                                homeTeamName={match.home_team?.name || 'Home'}
                                awayTeamName={match.away_team?.name || 'Away'}
                                onUpdate={async () => {
                                    await fetchShots();
                                    // Auto-update winner_id if match is already finished and tied
                                    if (match.status === 'finished' && homeScore === awayScore) {
                                        const penaltyRes = await getPenaltyShootout(match.id);
                                        if (penaltyRes.success && penaltyRes.data) {
                                            const phScore = penaltyRes.data.filter((s: PenaltyShot) => s.team_id === match.home_team_id && s.scored).length;
                                            const paScore = penaltyRes.data.filter((s: PenaltyShot) => s.team_id === match.away_team_id && s.scored).length;
                                            await updateMatch(match.id, {
                                                penalty_home_score: phScore,
                                                penalty_away_score: paScore,
                                                winner_id: phScore > paScore ? match.home_team_id : paScore > phScore ? match.away_team_id : null
                                            }, tournamentId);
                                            setMatch(prev => ({ ...prev, penalty_home_score: phScore, penalty_away_score: paScore, winner_id: phScore > paScore ? match.home_team_id : paScore > phScore ? match.away_team_id : null }) as Match);
                                        }
                                    }
                                }}
                                trigger={
                                    <Button type="button" variant="outline" size="sm" title={t("penalty_shootout")}>
                                        <Target className="h-4 w-4 mr-1" /> PEN
                                    </Button>
                                }
                            />
                        </div>
                    )}

                    <Scoreboard
                        match={match}
                        homeScore={homeScore}
                        awayScore={awayScore}
                        isPro={isPro}
                        readOnly={readOnly}
                        onAction={handleQuickAction}
                        timerTime={time}
                        timerReadOnly={readOnly || match.status === 'finished'}
                        timerCustomText={match.status === 'finished' ? (match.current_minute || "FT") : null}
                        onAddTime={!readOnly && match.status !== 'finished' ? () => setAddTimeDialogOpen(true) : undefined}
                        addedTime={match.status !== 'finished' ? (() => { const lastAddTimeEvent = [...events].reverse().find(e => e.event_type === 'add_time' && !e.id.startsWith("temp-")); return lastAddTimeEvent?.extra_info?.added_minutes || null; })() : null}
                    />

                    <EventTimeline
                        events={[
                            ...events,
                            ...penaltyShots.map(ps => ({
                                id: ps.id,
                                match_id: ps.match_id,
                                team_id: ps.team_id,
                                player_id: ps.player_id,
                                event_type: 'penalty_shot' as const,
                                minute: 120, // Arbitrary minute for penalty shootout
                                extra_info: { scored: ps.scored, round: ps.round },
                                created_at: ps.created_at,
                                player_name: ps.player?.name
                            }))
                        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
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
                existingEvents={events}
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