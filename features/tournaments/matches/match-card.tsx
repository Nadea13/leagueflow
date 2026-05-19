"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Eraser } from "lucide-react";
import { Match, Team } from "@/types/index";
import { updateMatch } from "@/actions/organizer/tournaments/general";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useMatchEvents } from "@/hooks/use-match-events";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { createClient } from "@/lib/supabase/client";
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

// ...

export function MatchCard({ match: initialMatch, tournamentId, isPublic = false, isEditMode = false, teams = [] }: { match: Match; tournamentId: string; isPublic?: boolean; isEditMode?: boolean; teams?: Team[] }) {
    const t = useTranslations("Fixtures");
    const tMatch = useTranslations("Match");
    const tCommon = useTranslations("Common");
    const _locale = useLocale();
    const searchParams = useSearchParams();

    const [isLoading, setIsLoading] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    // --- Realtime Sync State ---
    const [match, setMatchState] = useState<Match>(initialMatch);

    // Live Timer Logic
    const isLiveStatus = match.status === 'live';
    const { events } = useMatchEvents(match.id, tournamentId, undefined, true);
    const { time: liveTime } = useMatchTimer(match, tournamentId, events);

    const formatSeconds = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Update local state if prop changes
    useEffect(() => {
        setMatchState(initialMatch);
    }, [initialMatch]);

    // Supabase Realtime Subscription
    useEffect(() => {
        const supabase = createClient();
        const channelId = Math.random().toString(36).substring(7);
        const channel = supabase
            .channel(`match-card-${match.id}-${channelId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload: { new: Match }) => {
                setMatchState(prev => ({ ...prev, ...payload.new }));
                // No router.refresh() here to avoid full page reloads on every card update, local state is enough for the card itself
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [match.id]);

    // Local state for auto-save inputs
    const [matchDate, setMatchDate] = useState(match.match_date || "");
    const [matchTime, setMatchTime] = useState(match.match_time || "");

    const handleDateUpdate = async (newDate: string) => {
        setMatchDate(newDate);
        if (newDate !== match.match_date) {
            await updateMatch(match.id, { match_date: newDate }, tournamentId);
        }
    };

    const handleTimeUpdate = async (newTime: string) => {
        setMatchTime(newTime);
        if (newTime !== match.match_time) {
            await updateMatch(match.id, { match_time: newTime }, tournamentId);
        }
    };

    // Helper Variables
    const status = match.status?.toLowerCase() || 'scheduled';
    const isLive = status === 'live';
    const isFinished = status === 'finished';

    // Format Date Helper
    // Use global formatDate helper
    // const formatDate = ... (removed)

    // Format Time Helper (24H)
    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return null;
        // Assume timeStr is HH:mm:ss or HH:mm
        const [h, m] = timeStr.split(':');
        return `${h.padStart(2, '0')}:${m}`;
    };

    // Tie Breaker Logic (ถ้าต้องการให้เลือกผู้ชนะเมื่อเสมอในรอบ Knockout)
    // const showTieBreaker = ... (removed as unused)

    const handleClear = async () => {
        setClearDialogOpen(false);
        setIsLoading(true);
        try {
            await updateMatch(match.id, {
                home_team_id: null,
                away_team_id: null,
                home_score: null,
                away_score: null,
                winner_id: null,
                status: 'scheduled'
            }, tournamentId);
        } catch (_error) {
            console.error("Failed to clear match");
        } finally {
            setIsLoading(false);
        }
    };

    const CardContent = (
        <div
            className={cn(
                "flex flex-col border md:grid md:grid-cols-[150px_1fr_150px] items-center p-2 md:p-3 transition-all cursor-pointer group relative overflow-hidden",
            )}
        >
            {/* 1. Status/Time/Badge Section */}
            <div className="flex flex-col items-center justify-center w-full md:w-auto gap-2 min-w-[120px]">
                {status !== 'scheduled' && (
                    <div
                        className={cn(
                            "text-xs tracking-widest font-black",
                            status === 'scheduled' && "text-muted-foreground",
                            isLive && "text-primary border-primary animate-pulse",
                            isFinished && "text-muted-foreground",
                            !match.away_team_id && "text-muted-foreground"
                        )}
                    >
                        {!match.away_team_id ? t("scheduled") : (
                            isLive ? (
                                <span className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                                    </span>
                                </span>
                            ) : (
                                isFinished ? t("ft") : t("scheduled")
                            )
                        )}
                    </div>
                )}

                {/* Date/Time Info (Edit Mode only) */}
                {!isFinished && !isLive && !isPublic && isEditMode && (
                    <div className="w-full pr-2 md:pr-3">
                        <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                            <Input
                                type="date"
                                value={matchDate}
                                className="bg-card"
                                onChange={(e) => handleDateUpdate(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Teams & Score Section */}
            <div className="flex flex-row items-center justify-between w-full gap-2 md:gap-3">

                {/* Home Team */}
                <div className="flex-1 flex items-center justify-end gap-3 md:gap-6 text-right w-[40%]">
                    <div className={cn(
                        "text-base md:text-2xl font-black tracking-tighter flex items-center gap-3 justify-end group-hover:text-primary transition-colors duration-300",
                        (isFinished && (match.home_score ?? -1) > (match.away_score ?? -1)) || match.winner_id === match.home_team_id ? "text-foreground" : "text-muted-foreground/60"
                    )}>
                        {isEditMode ? (
                            <div onClick={e => e.stopPropagation()}>
                                <Select
                                    value={match.home_team_id || "tbd"}
                                    onValueChange={(value) => updateMatch(match.id, { home_team_id: value === "tbd" ? "" : value }, tournamentId)}
                                >
                                    <SelectTrigger className="w-[120px] md:w-[180px]">
                                        <SelectValue placeholder={tMatch("select_team")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        <SelectItem value="tbd" className="font-black text-xs text-foreground">{tMatch("tbd")}</SelectItem>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="font-black text-xs text-foreground">{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                                <span className="line-clamp-1 py-1 px-2 text-foreground">
                                    {match.home_team?.name || tMatch("tbd")}
                                </span>
                                {match.home_team?.logo_url ? (
                                    <img src={match.home_team.logo_url} width={48} height={48} className="w-8 h-8 p-1 md:w-12 md:h-12 object-contain grayscale-[0.2] group-hover:grayscale-0 transition-all" alt=""/>
                                ) : (
                                    <div className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shrink-0 border">
                                        <span className="text-sm md:text-base font-black text-muted-foreground">
                                            {match.home_team?.name?.substring(0, 2).toUpperCase() || "?"}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Score Box */}
                <div className="flex items-center justify-center shrink-0">
                    <div className={cn(
                        "flex flex-col items-center justify-center transition-all duration-300",
                        isLive ? " text-primary-foreground scale-110" :
                            isFinished ? " text-foreground" : " text-muted-foreground/40"
                    )}>
                        {isLive || isFinished ? (
                            <div className="flex flex-col w-[5rem] items-center leading-none">
                                <div className="flex items-center gap-1 md:gap-3">
                                    <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter">
                                        {match.home_score ?? 0}
                                    </span>
                                    <span className="text-muted-foreground font-black">-</span>
                                    <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter">
                                        {match.away_score ?? 0}
                                    </span>
                                </div>
                                {((match.penalty_home_score ?? 0) > 0 || (match.penalty_away_score ?? 0) > 0) && (
                                    <span className="text-[10px] font-black tracking-tighter">
                                        ({match.penalty_home_score ?? 0}-{match.penalty_away_score ?? 0} PK)
                                    </span>
                                )}
                                {isLiveStatus && (
                                    <span className="text-[10px] font-black text-primary tabular-nums">
                                        {formatSeconds(liveTime)}
                                    </span>
                                )}
                            </div>
                        ) : isEditMode ? (
                            <div className="flex flex-col items-center justify-center transition-transform duration-300">
                                <Input
                                    type="time"
                                    value={formatTime(matchTime) || ""}
                                    className="bg-card text-foreground"
                                    onChange={(e) => handleTimeUpdate(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-w-[5rem] transition-transform duration-300">
                                <span className="text-lg md:text-xl font-black text-foreground tracking-tighter leading-none hover:text-primary transition-colors">
                                    {formatTime(match.match_time) || "--:--"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-start gap-3 md:gap-6 text-left w-[40%]">
                    <div className={cn(
                        "text-base md:text-2xl font-black tracking-tighter flex items-center gap-3 justify-start group-hover:text-primary transition-colors duration-300",
                        (isFinished && (match.away_score ?? -1) > (match.home_score ?? -1)) || match.winner_id === match.away_team_id ? "text-foreground" : "text-muted-foreground/60"
                    )}>
                        {isEditMode ? (
                            <div onClick={e => e.stopPropagation()}>
                                <Select
                                    value={match.away_team_id || "tbd"}
                                    onValueChange={(value) => updateMatch(match.id, { away_team_id: value === "tbd" ? "" : value }, tournamentId)}
                                >
                                    <SelectTrigger className="w-[120px] md:w-[180px]">
                                        <SelectValue placeholder={tMatch("select_team")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        <SelectItem value="tbd" className="font-black text-xs">{tMatch("tbd")}</SelectItem>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="font-black text-xs">{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                                {match.away_team?.logo_url ? (
                                    <img src={match.away_team.logo_url} width={48} height={48} className="w-8 h-8 p-1 md:w-12 md:h-12 object-contain grayscale-[0.2] group-hover:grayscale-0 transition-all" alt="" />
                                ) : (
                                    <div className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shrink-0 border">
                                        <span className="text-sm md:text-base font-black text-muted-foreground">
                                            {match.away_team?.name?.substring(0, 2).toUpperCase() || "?"}
                                        </span>
                                    </div>
                                )}
                                <span className="line-clamp-1 py-1 px-2 text-foreground">
                                    {match.away_team?.name || tMatch("tbd")}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Actions / Selection Indicator */}
            <div className="flex items-center justify-center w-full" onClick={e => e.stopPropagation()}>
                {isEditMode && match.away_team_id && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setClearDialogOpen(true)}
                        disabled={isLoading}
                    >
                        <Eraser className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );

    // If there is an away team, the card is clickable to open the full page console
    const canOpen = isPublic || !!match.away_team_id;
    const currentTab = searchParams.get('tab');
    const querySuffix = currentTab ? `?from=${currentTab}` : '';

    const url = isPublic
        ? `/${tournamentId}/matches/${match.id}${querySuffix}`
        : `/dashboard/tournaments/${tournamentId}/matches/${match.id}${querySuffix}`;

    return (
        <>
            {canOpen ? (
                <Link href={url} className="block transition-transform">
                    {CardContent}
                </Link>
            ) : CardContent}

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent className="bg-card border-border/10 shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <Eraser className="h-5 w-5 text-destructive" />
                            {t("clear_match") || "Clear Match"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("confirm_clear")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleClear();
                            }}
                            className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                        >
                            <Eraser className="h-3.5 w-3.5 mr-2" />
                            {t("clear") || "Clear"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
