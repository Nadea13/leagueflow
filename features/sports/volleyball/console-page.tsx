"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Match, MatchEvent, Player } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VolleyballScoreboard } from "./console/scoreboard";
import { VolleyballEventLog } from "./console/log";
import { VolleyballEventDialog } from "./console/event-dialog";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
    ArrowLeft, Zap, Flame, ShieldCheck, HelpCircle, Cloud, CloudOff, RefreshCw,
    Undo, Tv, CalendarRange, Ban, XCircle, Users, Play, Square
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Header } from "@/components/ui/header";
import { cn } from "@/lib/utils";
import { updateMatch } from "@/actions/tournaments/general";
import { getPlayers } from "@/actions/tournaments/player";
import { createClient } from "@/lib/supabase/client";
import { useMatchEvents } from "@/hooks/use-match-events";
import { BroadcastDialog } from "../football/console/broadcast-dialog";
import { WalkoverDialog } from "../football/console/walkover-dialog";
import { RosterSelectionDialog } from "../football/console/roster-selection-dialog";
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

interface VolleyballConsolePageProps {
    match: Match;
    tournamentId: string;
    readOnly?: boolean;
    initialEvents?: MatchEvent[];
    backUrl: string;
    tournamentName?: string;
}

export function VolleyballConsolePage({
    match: initialMatch,
    tournamentId,
    readOnly = false,
    initialEvents = [],
    backUrl,
    tournamentName: _tournamentName
}: VolleyballConsolePageProps) {
    const locale = useLocale();
    const tPublic = useTranslations("PublicView");
    const { toast } = useToast();
    const supabase = createClient();

    // State for Volleyball Match
    const [match, setMatch] = useState<Match>(initialMatch);
    const { events, addEvent, deleteEvent } = useMatchEvents(match.id, tournamentId, initialEvents, readOnly);

    // Derived team helpers & real-time point counts from match_events
    const isHomeEvent = useCallback((e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'home') return true;
        if (extra?.team_side === 'away') return false;

        if (e.team_id) {
            if (e.team_id === match.home_team_id || e.team_id === match.home_team?.id) return true;
            if (e.team_id === match.away_team_id || e.team_id === match.away_team?.id) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return true;
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return false;

        return false;
    }, [match.home_team_id, match.home_team?.id, match.away_team_id, match.away_team?.id]);

    const isAwayEvent = useCallback((e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'away') return true;
        if (extra?.team_side === 'home') return false;

        if (e.team_id) {
            if (e.team_id === match.away_team_id || e.team_id === match.away_team?.id) return true;
            if (e.team_id === match.home_team_id || e.team_id === match.home_team?.id) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return true;
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return false;

        return false;
    }, [match.home_team_id, match.home_team?.id, match.away_team_id, match.away_team?.id]);

    const pointTypes = useMemo(() => ['point', 'ace', 'spike', 'block'], []);

    const getSetNumber = useCallback((e: MatchEvent) => {
        const extraSet = (e.extra_info as Record<string, unknown> | null)?.set;
        return typeof extraSet === 'number' ? extraSet : (e.minute || 1);
    }, []);

    // Calculate sets, points, and history dynamically from match_events with Deuce rule
    const { setHistory, homeSets, awaySets, currentSet, homePoints, awayPoints } = useMemo(() => {
        const setPointsMap = new Map<number, { home: number; away: number }>();
        events.forEach(e => {
            if (!pointTypes.includes(e.event_type)) return;
            const setNum = getSetNumber(e);
            const current = setPointsMap.get(setNum) || { home: 0, away: 0 };
            if (isHomeEvent(e)) current.home += 1;
            if (isAwayEvent(e)) current.away += 1;
            setPointsMap.set(setNum, current);
        });

        const allSetNumbers = Array.from(setPointsMap.keys()).sort((a, b) => a - b);
        const maxLoggedSet = allSetNumbers.length > 0 ? Math.max(...allSetNumbers) : 1;

        const history: Array<{ set: number; home: number; away: number }> = [];
        let hSets = 0;
        let aSets = 0;

        for (let s = 1; s <= maxLoggedSet; s++) {
            const pts = setPointsMap.get(s) || { home: 0, away: 0 };
            const targetPts = s === 5 ? 15 : 25;
            // Deuce Rule: Must reach targetPts (25 for sets 1-4, 15 for set 5) AND lead by at least 2 points
            const isSetFinishedByScore = (pts.home >= targetPts || pts.away >= targetPts) && Math.abs(pts.home - pts.away) >= 2;
            const isPastSet = s < maxLoggedSet;

            if (isPastSet || isSetFinishedByScore) {
                history.push({ set: s, home: pts.home, away: pts.away });
                if (pts.home > pts.away) hSets += 1;
                else if (pts.away > pts.home) aSets += 1;
            }
        }

        const activeSet = Math.min(5, hSets + aSets + 1);
        const activePts = setPointsMap.get(activeSet) || { home: 0, away: 0 };

        return {
            setHistory: history,
            homeSets: hSets,
            awaySets: aSets,
            currentSet: activeSet,
            homePoints: activePts.home,
            awayPoints: activePts.away
        };
    }, [events, pointTypes, getSetNumber, isHomeEvent, isAwayEvent]);

    const latestPointEvent = events.find(e => pointTypes.includes(e.event_type));
    const servingTeam: 'home' | 'away' | null = latestPointEvent
        ? (isHomeEvent(latestPointEvent) ? 'home' : 'away')
        : 'home';

    // Lineup & Roster States
    const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
    const [homeLineup, setHomeLineup] = useState<string[]>([]);
    const [awayLineup, setAwayLineup] = useState<string[]>([]);

    // Fetch players for home & away teams
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

            const promises = [];
            if (match.home_team_id) promises.push(fetchTeam(match.home_team_id, setHomePlayers));
            if (match.away_team_id) promises.push(fetchTeam(match.away_team_id, setAwayPlayers));

            await Promise.all(promises);
        };

        loadPlayers();
    }, [match.home_team_id, match.away_team_id, match.tournament_category_id, supabase]);

    // Load saved lineup from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`match-lineup-${match.id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    queueMicrotask(() => {
                        if (parsed.home) setHomeLineup(parsed.home);
                        if (parsed.away) setAwayLineup(parsed.away);
                    });
                } catch (e) {
                    console.error("Failed to parse saved lineup:", e);
                }
            }
        }
    }, [match.id]);

    const handleSaveLineup = (homeActive: string[], awayActive: string[]) => {
        setHomeLineup(homeActive);
        setAwayLineup(awayActive);
        if (typeof window !== "undefined") {
            localStorage.setItem(
                `match-lineup-${match.id}`,
                JSON.stringify({ home: homeActive, away: awayActive })
            );
        }
        toast({ title: locale === "th" ? "บันทึกรายชื่อผู้เล่นเรียบร้อย" : "Roster saved successfully" });
    };

    // Dialog states
    const [overlayDialogOpen, setOverlayDialogOpen] = useState(false);
    const [woDialogOpen, setWoDialogOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        open: boolean;
        title: string;
        description?: string;
        actionLabel?: string;
        cancelLabel?: string;
        onConfirm?: () => void;
    }>({ open: false, title: "" });

    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionConfig, setActionConfig] = useState<{
        teamSide: 'home' | 'away';
        eventType: 'ace' | 'spike' | 'block';
    }>({ teamSide: 'home', eventType: 'ace' });

    const handleTriggerActionEvent = (teamSide: 'home' | 'away', eventType: 'ace' | 'spike' | 'block') => {
        setActionConfig({ teamSide, eventType });
        setActionDialogOpen(true);
    };

    const addPoint = useCallback(async (
        team: 'home' | 'away',
        eventType: 'point' | 'ace' | 'spike' | 'block' = 'point',
        playerId?: string,
        playerName?: string
    ) => {
        if (readOnly) return;

        const teamId = team === 'home' ? match.home_team_id : match.away_team_id;
        const teamName = team === 'home' ? match.home_team?.name : match.away_team?.name;
        const playerText = playerName ? ` (${playerName})` : "";

        await addEvent(
            teamId || null,
            eventType,
            currentSet,
            playerId || null,
            {
                text: `Set ${currentSet} - Point for ${teamName || team} (${eventType.toUpperCase()})${playerText}`,
                set: currentSet,
                team_side: team,
                player_name: playerName
            },
            playerName || teamName || "Team"
        );
    }, [readOnly, match, currentSet, addEvent]);

    // Auto-finish match when a team reaches 3 set wins (Best of 5)
    useEffect(() => {
        if (readOnly || match.status === 'finished') return;
        if (homeSets >= 3 || awaySets >= 3) {
            const winnerId = homeSets >= 3 ? match.home_team_id : match.away_team_id;
            updateMatch(
                match.id,
                {
                    status: 'finished',
                    home_score: homeSets,
                    away_score: awaySets,
                    winner_id: winnerId
                },
                tournamentId
            ).then(res => {
                if (res.success) {
                    setMatch(prev => ({ ...prev, status: 'finished', home_score: homeSets, away_score: awaySets, winner_id: winnerId }));
                    toast({
                        title: locale === "th" ? "จบการแข่งขันเรียบร้อย!" : "Match Completed!",
                        description: `Winner: ${homeSets >= 3 ? match.home_team?.name : match.away_team?.name}`
                    });
                }
            });
        }
    }, [homeSets, awaySets, match.status, match.id, match.home_team_id, match.away_team_id, match.home_team?.name, match.away_team?.name, tournamentId, readOnly, locale, toast]);

    const handleUndo = async () => {
        if (readOnly) return;
        if (events.length === 0) {
            toast({ title: locale === "th" ? "ไม่มีรายการเหตุการณ์ให้ยกเลิก" : "No events to undo" });
            return;
        }
        const lastEvent = events[0];
        if (lastEvent) {
            await deleteEvent(lastEvent.id);
            toast({ title: locale === "th" ? "ยกเลิกเหตุการณ์ล่าสุดแล้ว" : "Undid last event" });
        }
    };

    const handlePostponeMatch = () => {
        setConfirmConfig({
            open: true,
            title: locale === "th" ? "เลื่อนการแข่งขัน?" : "Postpone Match?",
            description: locale === "th" ? "คุณแน่ใจหรือไม่ว่าต้องการเลื่อนการแข่งขันนี้?" : "Are you sure you want to postpone this match?",
            actionLabel: locale === "th" ? "ยืนยัน" : "Confirm",
            cancelLabel: locale === "th" ? "ยกเลิก" : "Cancel",
            onConfirm: async () => {
                const res = await updateMatch(match.id, { status: 'scheduled' }, tournamentId);
                if (res.success) {
                    setMatch(prev => ({ ...prev, status: 'scheduled' }));
                    toast({ title: locale === "th" ? "เลื่อนการแข่งขันแล้ว" : "Match postponed" });
                }
            }
        });
    };

    const handleAbandonMatch = () => {
        setConfirmConfig({
            open: true,
            title: locale === "th" ? "ยกเลิกการแข่งขัน?" : "Abandon Match?",
            description: locale === "th" ? "คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการแข่งขันนี้?" : "Are you sure you want to abandon this match?",
            actionLabel: locale === "th" ? "ยืนยัน" : "Confirm",
            cancelLabel: locale === "th" ? "ยกเลิก" : "Cancel",
            onConfirm: async () => {
                const res = await updateMatch(match.id, { status: 'canceled' }, tournamentId);
                if (res.success) {
                    setMatch(prev => ({ ...prev, status: 'canceled' }));
                    toast({ title: locale === "th" ? "ยกเลิกการแข่งขันเรียบร้อย" : "Match canceled" });
                }
            }
        });
    };

    const handleWalkover = async (winnerTeamId: string) => {
        const homeWon = winnerTeamId === match.home_team_id;
        const res = await updateMatch(
            match.id,
            {
                status: 'finished',
                home_score: homeWon ? 3 : 0,
                away_score: homeWon ? 0 : 3,
                winner_id: winnerTeamId
            },
            tournamentId
        );
        if (res.success) {
            setMatch(prev => ({
                ...prev,
                status: 'finished',
                home_score: homeWon ? 3 : 0,
                away_score: homeWon ? 0 : 3,
                winner_id: winnerTeamId
            }));
            setWoDialogOpen(false);
            toast({ title: locale === "th" ? "บันทึกชนะบายเรียบร้อย" : "Walkover recorded" });
        }
    };

    const matchControlsBox = (
        <div className="bg-card border p-2 lg:p-4 relative overflow-hidden group rounded-sm" id="vball-status-control">
            <div className="relative z-10 space-y-2 lg:space-y-4">
                {!readOnly && (
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 lg:gap-2 w-full">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const res = await updateMatch(match.id, { status: 'live' }, tournamentId);
                                if (res.success) {
                                    setMatch(prev => ({ ...prev, status: 'live' }));
                                    toast({ title: locale === "th" ? "เริ่มต้นการแข่งขันเรียบร้อย" : "Match started" });
                                }
                            }}
                            className="w-full justify-center lg:justify-start px-2 bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-foreground/20 transition-all group"
                        >
                            <div className="flex items-center gap-1 lg:gap-2">
                                <Play className="h-4 w-4 fill-primary text-primary" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">
                                    {locale === "th" ? "เริ่มการแข่งขัน" : "Start Match"}
                                </span>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={async () => {
                                const winnerId = homeSets >= awaySets ? match.home_team_id : match.away_team_id;
                                const res = await updateMatch(
                                    match.id,
                                    {
                                        status: 'finished',
                                        home_score: homeSets,
                                        away_score: awaySets,
                                        winner_id: winnerId
                                    },
                                    tournamentId
                                );
                                if (res.success) {
                                    setMatch(prev => ({ ...prev, status: 'finished' }));
                                    toast({ title: locale === "th" ? "จบการแข่งขันเรียบร้อย" : "Match finished" });
                                }
                            }}
                            disabled={match.status === 'finished'}
                            className="w-full justify-center lg:justify-start px-2 bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-foreground/20 transition-all group"
                        >
                            <div className="flex items-center gap-1 lg:gap-2">
                                <Square className="h-4 w-4 fill-destructive text-destructive" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">
                                    {locale === "th" ? "จบการแข่งขัน" : "Finish Match"}
                                </span>
                            </div>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    const quickActionsBox = !readOnly ? (
        <div className="bg-card border p-2 lg:p-4 relative overflow-hidden group rounded-sm" id="vball-action-panel">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 lg:gap-2">
                <Button
                    variant="outline"
                    onClick={handleUndo}
                    className="w-full flex justify-start items-center gap-2"
                >
                    <Undo className="h-4 w-4 text-muted-foreground" />
                    <span>{locale === "th" ? "ยกเลิก (Undo)" : "Undo"}</span>
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setOverlayDialogOpen(true)}
                    className="w-full flex justify-start items-center gap-2"
                >
                    <Tv className="h-4 w-4 text-primary" />
                    <span>{locale === "th" ? "กราฟิกถ่ายทอดสด (Broadcast)" : "Broadcast Overlay"}</span>
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setRosterDialogOpen(true)}
                    className="w-full flex justify-start items-center gap-2"
                >
                    <Users className="h-4 w-4 text-primary" />
                    <span>{locale === "th" ? "จัดตัวผู้เล่น (Roster)" : "Select Lineup"}</span>
                </Button>

                <Button
                    variant="outline"
                    onClick={handlePostponeMatch}
                    className="w-full flex justify-start items-center gap-2"
                >
                    <CalendarRange className="h-4 w-4 text-primary" />
                    <span>{locale === "th" ? "เลื่อนการแข่งขัน" : "Postpone Match"}</span>
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setWoDialogOpen(true)}
                    className="w-full flex justify-start items-center gap-2"
                >
                    <Ban className="h-4 w-4 text-destructive" />
                    <span>{locale === "th" ? "ชนะบาย (Walkover)" : "Walkover"}</span>
                </Button>

                <Button
                    variant="outline"
                    onClick={handleAbandonMatch}
                    className="w-full flex justify-start items-center gap-2"
                >
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>{locale === "th" ? "ยกเลิกการแข่งขัน" : "Abandon Match"}</span>
                </Button>
            </div>
        </div>
    ) : null;

    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const startConsoleTutorial = () => {
        const steps = [
            {
                element: "#vball-scoreboard",
                popover: {
                    title: locale === "th" ? "กระดานคะแนนวอลเลย์บอล" : "Volleyball Scoreboard",
                    description: locale === "th" ? "แสดงชื่อทีม โลโก้ จำนวนเซตที่ชนะ คะแนนในเซตปัจจุบัน และประวัติคะแนนของแต่ละเซต" : "Displays team names, logos, sets won, current set points, and set history.",
                    side: "bottom" as const,
                    align: "start" as const
                }
            },
            {
                element: "#vball-point-controls",
                popover: {
                    title: locale === "th" ? "ปุ่มให้คะแนน (Point Controls)" : "Point Controls",
                    description: locale === "th" ? "กด +1 Point หรือเลือกเหตุการณ์ Ace / Spike / Block เพื่อให้คะแนนทีมที่ทำได้" : "Add points or record Ace, Spike, or Block events.",
                    side: "top" as const,
                    align: "start" as const
                }
            },
            {
                element: "#vball-events-log",
                popover: {
                    title: locale === "th" ? "บันทึกเหตุการณ์ (Events Log)" : "Events Log",
                    description: locale === "th" ? "แสดงประวัติคะแนนและเหตุการณ์ทั้งหมด สามารถกดลบรายการได้" : "View recorded events and delete items if needed.",
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

    const handleManualSync = async () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            setPendingCount(0);
            toast({ title: locale === "th" ? "ซิงค์ข้อมูลเรียบร้อย" : "Data synced successfully" });
        }, 600);
    };

    return (
        <div className={cn(
            "min-h-screen flex flex-col font-display selection:bg-primary/30 space-y-2 lg:space-y-4 bg-background text-foreground",
            readOnly ? "pt-18 lg:pt-22 px-2 lg:px-0" : ""
        )}>
            {/* Top Navigation Bar (Public View) */}
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
                        <div className="flex items-center gap-2 lg:gap-3">
                            <span className="text-sm text-muted-foreground">{tPublic("public_view")}</span>
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">{tPublic("beta")}</Badge>
                        </div>
                    </div>
                </nav>
            )}

            {/* Console Main Header */}
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
                    <div className="flex items-center gap-1 lg:gap-2 shrink-0">
                        {/* Help Tutorial Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={startConsoleTutorial}
                            title={locale === "th" ? "สอนการใช้งาน" : "Help Tutorial"}
                        >
                            <HelpCircle className="h-4 w-4" />
                        </Button>

                        {/* Sync Icon */}
                        {pendingCount > 0 ? (
                            <div className="flex items-center gap-1 text-amber-500 animate-pulse">
                                <CloudOff className="w-4 h-4" />
                                <button
                                    onClick={handleManualSync}
                                    disabled={isSyncing}
                                    className="hover:text-white transition-colors"
                                >
                                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center text-primary h-8 w-8" title={locale === "th" ? "ซิงค์ข้อมูลแล้ว" : "Synced"}>
                                <Cloud className="w-4 h-4" />
                            </div>
                        )}

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border">
                            <span className="relative flex h-2 w-2">
                                <span className={cn(
                                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                    match.status === 'finished' ? "bg-emerald-500" : "bg-primary"
                                )}></span>
                                <span className={cn(
                                    "relative inline-flex rounded-full h-2 w-2",
                                    match.status === 'finished' ? "bg-emerald-500" : "bg-primary"
                                )}></span>
                            </span>
                            <span className="text-[10px] font-black tracking-widest">
                                {match.status === 'finished' ? (locale === 'th' ? 'จบการแข่งขัน' : 'FINISHED') : (locale === 'th' ? 'กำลังแข่งขัน' : 'LIVE')}
                            </span>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content & Sidebar Grid */}
            <main className="flex-1 w-full grid grid-cols-12 gap-2 lg:gap-4">
                {/* Sidebar: Admin Controls or Match Info */}
                <aside className="col-span-12 lg:col-span-3 gap-2 lg:gap-4 order-2 lg:order-1 flex flex-col">
                    {/* Match Controls (Desktop only) */}
                    <div className="hidden lg:block">
                        {matchControlsBox}
                    </div>

                    {/* Quick Actions (Desktop only) */}
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
                    <section className="flex flex-col gap-2 lg:gap-4" id="vball-scoreboard">
                        <VolleyballScoreboard
                            match={match}
                            events={events}
                            homeSetsWon={homeSets}
                            awaySetsWon={awaySets}
                            currentSetHomePoints={homePoints}
                            currentSetAwayPoints={awayPoints}
                            setScoresHistory={setHistory}
                            servingTeam={servingTeam}
                            currentSetNumber={currentSet}
                        />

                        {/* Quick Actions (Mobile only) */}
                        <div className="block lg:hidden">
                            {quickActionsBox}
                        </div>

                        {/* Point Controls Section */}
                        {/* Point Controls Section (Split into Home & Away Cards) */}
                        {!readOnly && match.status !== 'finished' && (
                            <div className="flex flex-col gap-2 lg:gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-4" id="vball-point-controls">
                                    {/* Home Team Control Card */}
                                    <div className="bg-card border rounded-sm p-2 lg:p-4 relative overflow-hidden group space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm lg:text-base font-black tracking-tight truncate">
                                                {match.home_team?.name || "Home"}
                                            </h3>
                                        </div>

                                        <Button
                                            size="lg"
                                            onClick={() => addPoint('home', 'point')}
                                            className="w-full bg-primary flex items-center justify-center"
                                        >
                                            <span>+1 Point ({match.home_team?.name || 'Home'})</span>
                                        </Button>

                                        <div className="grid grid-cols-3 gap-1 lg:gap-2">
                                            <Button variant="outline" onClick={() => handleTriggerActionEvent('home', 'ace')}>
                                                <Zap className="h-4 w-4 text-yellow-500" />
                                                <span>Ace</span>
                                            </Button>
                                            <Button variant="outline" onClick={() => handleTriggerActionEvent('home', 'spike')}>
                                                <Flame className="h-4 w-4 text-red-500" />
                                                <span>Spike</span>
                                            </Button>
                                            <Button variant="outline" onClick={() => handleTriggerActionEvent('home', 'block')}>
                                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                                <span>Block</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Away Team Control Card */}
                                    <div className="bg-card border rounded-sm p-2 lg:p-4 relative overflow-hidden group space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm lg:text-base font-black tracking-tight truncate">
                                                {match.away_team?.name || "Away"}
                                            </h3>
                                        </div>

                                        <Button
                                            size="lg"
                                            onClick={() => addPoint('away', 'point')}
                                            className="w-full bg-primary flex items-center justify-center"
                                        >
                                            <span>+1 Point ({match.away_team?.name || 'Away'})</span>
                                        </Button>

                                        <div className="grid grid-cols-3 gap-1 lg:gap-2">
                                            <Button variant="outline" onClick={() => handleTriggerActionEvent('away', 'ace')}>
                                                <Zap className="h-4 w-4 text-yellow-500" />
                                                <span>Ace</span>
                                            </Button>
                                            <Button variant="outline" onClick={() => handleTriggerActionEvent('away', 'spike')}>
                                                <Flame className="h-4 w-4 text-red-500" />
                                                <span>Spike</span>
                                            </Button>
                                            <Button variant="outline" onClick={() => handleTriggerActionEvent('away', 'block')}>
                                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                                <span>Block</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Log Section */}
                    <section className="flex flex-col gap-2 lg:gap-4" id="vball-events-log">
                            <VolleyballEventLog
                                events={events}
                                match={match}
                                homeTeamId={match.home_team_id || undefined}
                                awayTeamId={match.away_team_id || undefined}
                                readOnly={readOnly}
                                onDeleteEvent={(id) => deleteEvent(id)}
                            />
                    </section>
                </div>
            </main>

            {/* Dialogs */}
            <VolleyballEventDialog
                open={actionDialogOpen}
                onOpenChange={setActionDialogOpen}
                teamSide={actionConfig.teamSide}
                teamName={actionConfig.teamSide === 'home' ? match.home_team?.name : match.away_team?.name}
                eventType={actionConfig.eventType}
                players={actionConfig.teamSide === 'home' ? homePlayers : awayPlayers}
                activeLineupIds={actionConfig.teamSide === 'home' ? homeLineup : awayLineup}
                onSave={({ playerId, playerName }) => {
                    addPoint(actionConfig.teamSide, actionConfig.eventType, playerId, playerName);
                }}
            />
            <RosterSelectionDialog
                open={rosterDialogOpen}
                onOpenChange={setRosterDialogOpen}
                homeTeamName={match.home_team?.name || 'Home'}
                awayTeamName={match.away_team?.name || 'Away'}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                homeActiveIds={homeLineup}
                awayActiveIds={awayLineup}
                onSave={handleSaveLineup}
            />
            <BroadcastDialog open={overlayDialogOpen} onOpenChange={setOverlayDialogOpen} matchId={match.id} tournamentId={tournamentId} />
            <WalkoverDialog open={woDialogOpen} onOpenChange={setWoDialogOpen} match={match} onConfirm={handleWalkover} />

            <AlertDialog open={confirmConfig.open} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="bg-card border rounded-sm shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="border-b p-4">
                            {confirmConfig.title}
                        </AlertDialogTitle>
                        {confirmConfig.description && (
                            <AlertDialogDescription className="p-4">
                                {confirmConfig.description}
                            </AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-4 bg-muted/20 border-t flex gap-2">
                        <AlertDialogCancel>{confirmConfig.cancelLabel || "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmConfig.onConfirm?.()}>
                            {confirmConfig.actionLabel || "Confirm"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
