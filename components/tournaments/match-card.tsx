"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, MapPin, Clock, Trophy, Eraser } from "lucide-react";
import { Match, Goal, Team, MatchEvent } from "@/types/index";
import { updateMatch, deleteMatch } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LiveMatchConsole } from "@/components/matches/live-match-console";
import { createClient } from "@/utils/supabase/client"; // Added Import

// ...

export function MatchCard({ match: initialMatch, tournamentId, goals = [], isPublic = false, isEditMode = false, teams = [], isPro = false, initialEvents = [] }: { match: Match; tournamentId: string; goals?: Goal[]; isPublic?: boolean; isEditMode?: boolean; teams?: Team[]; isPro?: boolean; initialEvents?: MatchEvent[] }) {
    const t = useTranslations("Fixtures");
    const tMatch = useTranslations("Match");
    const tCommon = useTranslations("Common");
    const locale = useLocale();

    const [isLoading, setIsLoading] = useState(false);

    // --- Realtime Sync State ---
    const [match, setMatchState] = useState<Match>(initialMatch);

    // Update local state if prop changes
    useEffect(() => {
        setMatchState(initialMatch);
    }, [initialMatch]);

    // Supabase Realtime Subscription
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`match-card-${match.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
                setMatchState(payload.new as Match);
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

    // Running Timer Logic
    const [elapsedTime, setElapsedTime] = useState<string>("");

    useEffect(() => {
        if (match.status === 'live') {
            const calculateTime = () => {
                if (match.timer_status === 'paused' && match.elapsed_before_pause !== undefined) {
                    // Paused: Static time from snapshot
                    const totalSeconds = match.elapsed_before_pause;
                    const mins = Math.floor(totalSeconds / 60);
                    const secs = totalSeconds % 60;
                    setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                } else if (match.match_date && match.match_time) {
                    // Playing: Calc diff from Last Resume Time + specific elapsed history
                    const now = new Date();
                    const start = new Date(`${match.match_date}T${match.match_time}`);
                    const extraSeconds = match.elapsed_before_pause || 0;

                    const diffMs = now.getTime() - start.getTime();
                    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000) + extraSeconds);

                    const mins = Math.floor(totalSeconds / 60);
                    const secs = totalSeconds % 60;

                    setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                }
            };

            calculateTime(); // Initial Update

            // Run interval ONLY if playing
            if (match.timer_status !== 'paused') {
                const interval = setInterval(calculateTime, 1000);
                return () => clearInterval(interval);
            }
        } else {
            setElapsedTime("");
        }
    }, [match.status, match.match_date, match.match_time, match.timer_status, match.elapsed_before_pause]);

    // Helper Variables
    const status = match.status?.toLowerCase() || 'scheduled';
    const isLive = status === 'live';
    const isFinished = status === 'finished';
    const isTie = isFinished && (match.home_score === match.away_score);

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
    const showTieBreaker = isTie && (
        match.stage?.includes('knockout') ||
        match.stage === 'quarter_final' ||
        match.stage === 'semi_final' ||
        match.stage === 'final'
    );

    const handleSelectWinner = async (winnerId: string | null) => {
        if (!winnerId) return;
        setIsLoading(true);
        try {
            await updateMatch(match.id, { winner_id: winnerId }, tournamentId);
        } catch (error) {
            console.error("Failed to set winner");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        if (confirm(t("confirm_clear"))) {
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
            } catch (error) {
                console.error("Failed to clear match");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const CardContent = (
        <div
            className={cn(
                "flex flex-col md:grid md:grid-cols-[140px_1fr_140px] items-center p-3 md:p-4 border rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer",
                isFinished ? "bg-muted/30" : "bg-card",
                "gap-3 md:gap-4",
                isPublic && "hover:border-primary/50 hover:bg-muted/50"
            )}
        >
            {/* 1. Status/Time/Badge Section */}
            <div className="flex flex-col items-center justify-center w-full md:w-auto md:items-start md:justify-start md:gap-1 min-w-[90px] mb-2 md:mb-0">
                {status !== 'scheduled' && (
                    <Badge
                        variant="outline"
                        className={cn(
                            "uppercase text-[10px] tracking-wider font-bold border px-2 py-0.5",
                            status === 'scheduled' && "text-muted-foreground border-muted-foreground/30",
                            isLive && "bg-red-500 text-white border-red-600 animate-pulse",
                            isFinished && "bg-muted text-muted-foreground border-transparent", // Fixed transparent border for better vis
                            !match.away_team_id && "text-muted-foreground border-muted-foreground/30"
                        )}
                    >
                        {!match.away_team_id ? t("scheduled") : (
                            isLive ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    {match.current_minute ? (
                                        typeof match.current_minute === 'number' ? `${match.current_minute}'` : match.current_minute
                                    ) : (
                                        <>
                                            {t("live")} {elapsedTime && <span className="font-mono ml-1.5 min-w-[35px] inline-block text-left">{elapsedTime}</span>}
                                        </>
                                    )}
                                </span>
                            ) : (
                                isFinished ? t("ft") : t("scheduled")
                            )
                        )}
                    </Badge>
                )}

                {/* Date/Time Info (Editable if Admin & Not Finished) */}
                {!isFinished && !isLive && (
                    <div className="mt-1 md:mt-2 w-full md:space-y-1">
                        {/* If Public -> Show Text. If Admin -> Show Inputs */}
                        {isPublic || !isEditMode ? (
                            <div className="flex flex-row md:flex-col items-center justify-center md:items-start gap-3 md:gap-1 text-xs text-muted-foreground flex-wrap">
                                {match.match_date && (
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-3 h-3" />
                                        <span>{formatDate(match.match_date, "d MMM", locale)}</span>
                                    </div>
                                )}
                                {match.match_time && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatTime(match.match_time)}</span>
                                    </div>
                                )}
                                {match.venue && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3" />
                                        <span className="max-w-[80px] truncate" title={match.venue}>{match.venue}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 w-full min-w-[110px]" onClick={(e) => e.stopPropagation()}>
                                <Input
                                    type="date"
                                    className="h-6 text-[10px] px-1 w-full"
                                    value={matchDate}
                                    onChange={(e) => handleDateUpdate(e.target.value)}
                                />
                                <Input
                                    type="time"
                                    className="h-6 text-[10px] px-1 w-full"
                                    value={formatTime(matchTime) || ""}
                                    onChange={(e) => handleTimeUpdate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Teams & Score Section */}
            <div className="flex flex-row items-center justify-between w-full gap-2 md:gap-4">

                {/* Home Team (Right Aligned) */}
                <div className="flex-1 flex items-center justify-end gap-2 md:gap-3 text-right w-[40%]">
                    {match.winner_id === match.home_team_id}

                    <div className={cn(
                        "font-semibold text-sm md:text-lg flex items-center gap-2 justify-end",
                        (isFinished && (match.home_score ?? -1) > (match.away_score ?? -1)) || match.winner_id === match.home_team_id ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {isEditMode ? (
                            <div onClick={e => e.stopPropagation()}>
                                <Select
                                    value={match.home_team_id || "tbd"}
                                    onValueChange={(value) => updateMatch(match.id, { home_team_id: value === "tbd" ? "" : value }, tournamentId)}
                                >
                                    <SelectTrigger className="h-8 w-[100px] md:w-[140px] text-xs">
                                        <SelectValue placeholder={tMatch("select_team")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tbd">{tMatch("tbd")}</SelectItem>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                                <span className="line-clamp-1">{match.home_team?.name || tMatch("tbd")}</span>
                                {match.home_team?.logo_url ? (
                                    <img src={match.home_team.logo_url} className="w-6 h-6 md:w-8 md:h-8 object-contain" alt="" />
                                ) : (
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground">
                                            {match.home_team?.name?.substring(0, 2).toUpperCase() || "?"}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Score / VS Display */}
                <div className="flex items-center justify-center w-[20%] min-w-[60px] md:min-w-[100px] shrink-0">
                    <div className={cn(
                        "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-1.5 rounded-lg border",
                        isLive ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50" : "bg-muted/30 border-border/50"
                    )}>
                        {isLive || isFinished ? (
                            <>
                                <span className={cn("text-lg md:text-xl font-mono font-bold w-4 md:w-6 text-center", isLive && "text-red-600")}>
                                    {match.home_score ?? 0}
                                </span>
                                <span className="text-muted-foreground/40 font-mono">:</span>
                                <span className={cn("text-lg md:text-xl font-mono font-bold w-4 md:w-6 text-center", isLive && "text-red-600")}>
                                    {match.away_score ?? 0}
                                </span>
                            </>
                        ) : (
                            <span className="text-muted-foreground font-mono font-bold text-xs md:text-sm">VS</span>
                        )}
                    </div>
                </div>

                {/* Away Team (Left Aligned) */}
                <div className="flex-1 flex items-center justify-start gap-2 md:gap-3 text-left w-[40%]">
                    <div className={cn(
                        "font-semibold text-sm md:text-lg flex items-center gap-2 justify-start",
                        (isFinished && (match.away_score ?? -1) > (match.home_score ?? -1)) || match.winner_id === match.away_team_id ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {isEditMode ? (
                            <div onClick={e => e.stopPropagation()}>
                                <Select
                                    value={match.away_team_id || tMatch("tbd")}
                                    onValueChange={(value) => updateMatch(match.id, { away_team_id: value === "tbd" ? "" : value }, tournamentId)}
                                >
                                    <SelectTrigger className="h-8 w-[100px] md:w-[140px] text-xs">
                                        <SelectValue placeholder={tMatch("select_team")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tbd">{tMatch("tbd")}</SelectItem>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                                {/* Logo First for Symmetry */}
                                {match.away_team?.logo_url ? (
                                    <img src={match.away_team.logo_url} className="w-6 h-6 md:w-8 md:h-8 object-contain" alt="" />
                                ) : (
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] md:text-xs font-bold text-muted-foreground">
                                            {match.away_team?.name?.substring(0, 2).toUpperCase() || "?"}
                                        </span>
                                    </div>
                                )}
                                <span className="line-clamp-1">{match.away_team?.name || tMatch("tbd")}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Actions / Tie Breaker */}
            {!isPublic && match.away_team_id && (
                <div className="flex flex-col items-end gap-2 md:ml-auto w-full md:w-auto justify-end mt-2 md:mt-0" onClick={e => e.stopPropagation()}>

                    {/* Console Button removed - Card is now trigger */}
                    {isEditMode && (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="gap-2 min-w-[110px] bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={handleClear}
                            disabled={isLoading}
                        >
                            <Eraser className="h-4 w-4" />
                            {tCommon("clear")}
                        </Button>
                    )}

                    {/* Tie Breaker Buttons (เฉพาะตอนเสมอในรอบน็อคเอาท์) */}
                    {showTieBreaker && !match.winner_id && (
                        <div className="flex gap-1 animate-in fade-in slide-in-from-top-1">
                            <span className="text-[10px] text-muted-foreground uppercase self-center mr-1">{t("select_winner")}:</span>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => handleSelectWinner(match.home_team_id)}
                                disabled={isLoading}
                                title={`${match.home_team?.name} Win`}
                            >
                                H
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => handleSelectWinner(match.away_team_id)}
                                disabled={isLoading}
                                title={`${match.away_team?.name} Win`}
                            >
                                A
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // If there is an away team, the card is clickable to open console (or if public view)
    // For Admin: Only clickable if away team exists (consistent with previous button visibility)
    // For Public: Always clickable (readonly)
    const canOpen = isPublic || !!match.away_team_id;

    if (canOpen) {
        return (
            <LiveMatchConsole
                match={match}
                tournamentId={tournamentId}
                goals={goals}
                isPro={isPro}
                readOnly={isPublic}
                trigger={CardContent}
                initialEvents={initialEvents}
            />
        );
    }

    return CardContent;
}