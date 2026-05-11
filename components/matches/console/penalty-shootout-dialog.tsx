"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PenaltyShot } from "@/types/index";
import { getPenaltyShootout, addPenaltyShot, clearPenaltyShootout } from "@/app/[locale]/organizer/tournaments/[id]/penalty-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Target, Check, X, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PenaltyShootoutDialogProps {
    matchId: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeTeamName: string;
    awayTeamName: string;
    trigger?: React.ReactNode;
    onComplete?: (homeScore: number, awayScore: number) => void;
    onUpdate?: () => void;
}

export function PenaltyShootoutDialog({
    matchId,
    homeTeamId,
    awayTeamId,
    homeTeamName,
    awayTeamName,
    trigger,
    onComplete: _onComplete,
    onUpdate,
}: PenaltyShootoutDialogProps) {
    const { toast } = useToast();
    const t = useTranslations("Penalty");
    const [open, setOpen] = useState(false);
    const [shots, setShots] = useState<PenaltyShot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchShots = useCallback(async () => {
        setIsLoading(true);
        const result = await getPenaltyShootout(matchId);
        if (result.success && result.data) {
            setShots(result.data);
        }
        setIsLoading(false);
    }, [matchId]);

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => fetchShots(), 0);
            return () => clearTimeout(timer);
        }
    }, [open, fetchShots]);

    const homeShots = shots.filter(s => s.team_id === homeTeamId);
    const awayShots = shots.filter(s => s.team_id === awayTeamId);
    const homeScore = homeShots.filter(s => s.scored).length;
    const awayScore = awayShots.filter(s => s.scored).length;

    // Calculate total display rounds:
    // - Always show at least 5 regulation rounds
    // - If all 5 are completed AND scores are tied, show sudden death rounds (current + 1 empty)
    const totalRounds = useMemo(() => {
        const completedHomRounds = homeShots.length;
        const completedAwayRounds = awayShots.length;
        const maxCompleted = Math.max(completedHomRounds, completedAwayRounds);

        if (maxCompleted < 5) {
            return 5; // Still in regulation
        }

        // All 5 regulation rounds done
        // If there's a winner after regulation OR during sudden death with equal shots, show + 1 for next round
        const isTied = homeScore === awayScore;
        const bothComplete = completedHomRounds === completedAwayRounds;

        if (isTied && bothComplete) {
            // Tied and both teams shot same number | show one more empty row for sudden death
            return maxCompleted + 1;
        }

        if (!bothComplete) {
            // One team hasn't shot yet this round | show current max
            return maxCompleted;
        }

        // Winner decided
        return maxCompleted;
    }, [homeShots.length, awayShots.length, homeScore, awayScore]);

    const isSuddenDeath = homeShots.length >= 5 || awayShots.length >= 5;

    const handleAddShot = async (teamId: string, scored: boolean) => {
        setIsSaving(true);
        const teamShots = shots.filter(s => s.team_id === teamId);
        const round = teamShots.length + 1;

        const result = await addPenaltyShot(matchId, teamId, round, scored);
        if (result.success) {
            await fetchShots();
            onUpdate?.();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleClear = async () => {
        if (!confirm(t("clear_confirm"))) return;
        await clearPenaltyShootout(matchId);
        setShots([]);
        onUpdate?.();
    };

    // Determine winner based on mathematical possibility
    const hasWinner = useMemo(() => {
        const hLen = homeShots.length;
        const aLen = awayShots.length;

        // 1. Regulation Phase (5 shots each)
        const hRemaining = Math.max(0, 5 - hLen);
        const aRemaining = Math.max(0, 5 - aLen);

        // Check if home team has already won
        if (homeScore > awayScore + aRemaining) return 'home';
        // Check if away team has already won
        if (awayScore > homeScore + hRemaining) return 'away';

        // 2. Sudden Death Phase (after 5 shots each and still tied)
        if (hLen >= 5 && aLen >= 5 && hLen === aLen) {
            if (homeScore > awayScore) return 'home';
            if (awayScore > homeScore) return 'away';
        }

        return null;
    }, [homeShots.length, awayShots.length, homeScore, awayScore]); return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-12 border-foreground/5 bg-foreground/5 hover:bg-foreground/10 hover:border-primary/50 rounded-none transition-all group">
                        <Target className="h-4 w-4" />
                        <span className="text-[10px] font-black tracking-widest">Penalty Shootout</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-card border-foreground/5 p-0 overflow-hidden max-w-md rounded-none">
                <DialogHeader className="p-4 md:p-6 text-left">
                    <DialogTitle className="flex items-center gap-4 text-2xl font-black tracking-tighter text-foreground">
                        <div className="p-2 md:p-3 bg-primary/10 border border-primary/20">
                            <Target className="h-6 w-6 text-primary" />
                        </div>
                        {t("title")}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="px-4 pb-4 space-y-4 md:px-6 md:pb-6 md:space-y-6 relative">
                        {/* Score Summary Scoreboard Style */}
                        <div className="flex items-center justify-center gap-10 py-6 bg-foreground/5 border border-foreground/5 relative z-10 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent pointer-events-none" />
                            <div className="text-center relative z-10">
                                <p className="text-[9px] font-black tracking-widest text-foreground/40 mb-2 truncate max-w-[120px]">{homeTeamName}</p>
                                <span className={cn(
                                    "text-5xl font-black tracking-tighter transition-all",
                                    hasWinner === 'home' ? "text-primary drop-shadow-[0_0_10px_rgba(5,255,163,0.3)]" : "text-foreground"
                                )}>
                                    {homeScore}
                                </span>
                            </div>
                            <span className="text-foreground/20 text-3xl font-black tracking-tighter relative z-10">-</span>
                            <div className="text-center relative z-10">
                                <p className="text-[9px] font-black tracking-widest text-foreground/40 mb-2 truncate max-w-[120px]">{awayTeamName}</p>
                                <span className={cn(
                                    "text-5xl font-black tracking-tighter transition-all",
                                    hasWinner === 'away' ? "text-primary drop-shadow-[0_0_10px_rgba(5,255,163,0.3)]" : "text-foreground"
                                )}>
                                    {awayScore}
                                </span>
                            </div>
                        </div>

                        {/* Winner/Status Banner */}
                        {hasWinner ? (
                            <div className="text-center py-3 bg-primary/10 border border-primary/20 relative z-10 overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <p className="text-xs font-black tracking-widest text-primary relative z-10">
                                    {t("wins_on_penalties", { team: hasWinner === 'home' ? homeTeamName : awayTeamName })}
                                </p>
                            </div>
                        ) : isSuddenDeath ? (
                            <div className="flex items-center justify-center relative z-10">
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 rounded-none px-4 py-1 animate-pulse">
                                    <AlertTriangle className="h-3 w-3 mr-2" />
                                    <span className="text-[10px] font-black tracking-[0.2em]">{t("sudden_death")}</span>
                                </Badge>
                            </div>
                        ) : null}

                        {/* Shot Grid */}
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-6 gap-y-4 relative z-10">
                            <div className="text-[9px] font-black tracking-widest text-foreground/20 text-center">{homeTeamName}</div>
                            <div className="w-8" />
                            <div className="text-[9px] font-black tracking-widest text-foreground/20 text-center">{awayTeamName}</div>

                            {Array.from({ length: totalRounds }, (_, i) => {
                                const homeShot = homeShots[i];
                                const awayShot = awayShots[i];
                                const isSD = i >= 5;

                                return (
                                    <div key={i} className="contents">
                                        {/* Home Shot */}
                                        <div className="flex justify-center">
                                            {homeShot ? (
                                                <div className={cn(
                                                    "w-12 h-12 flex items-center justify-center border transition-all",
                                                    homeShot.scored ? "bg-primary/10 border-primary/30 text-primary" : "bg-red-500/10 border-red-500/30 text-red-500"
                                                )}>
                                                    {homeShot.scored ? <Check className="h-6 w-6 stroke-[3px]" /> : <X className="h-6 w-6 stroke-[3px]" />}
                                                </div>
                                            ) : !hasWinner ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        className="w-12 h-12 border border-foreground/5 bg-foreground/5 hover:bg-primary hover:text-black hover:border-primary flex items-center justify-center group/btn transition-all disabled:opacity-20"
                                                        onClick={() => homeTeamId && handleAddShot(homeTeamId, true)}
                                                        disabled={isSaving || !homeTeamId}
                                                    >
                                                        <Check className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        className="w-12 h-12 border border-foreground/5 bg-foreground/5 hover:bg-red-500 hover:text-foreground hover:border-red-500 flex items-center justify-center group/btn transition-all disabled:opacity-20"
                                                        onClick={() => homeTeamId && handleAddShot(homeTeamId, false)}
                                                        disabled={isSaving || !homeTeamId}
                                                    >
                                                        <X className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 border border-foreground/2 bg-foreground/2 opacity-20" />
                                            )}
                                        </div>

                                        {/* Round Number */}
                                        <div className="flex items-center justify-center">
                                            <span className={cn(
                                                "text-xs font-black tracking-tighter",
                                                isSD ? "text-amber-500" : "text-foreground/40"
                                            )}>
                                                {isSD ? `SD${i - 4}` : i + 1}
                                            </span>
                                        </div>

                                        {/* Away Shot */}
                                        <div className="flex justify-center">
                                            {awayShot ? (
                                                <div className={cn(
                                                    "w-12 h-12 flex items-center justify-center border transition-all",
                                                    awayShot.scored ? "bg-primary/10 border-primary/30 text-primary" : "bg-red-500/10 border-red-500/30 text-red-500"
                                                )}>
                                                    {awayShot.scored ? <Check className="h-6 w-6 stroke-[3px]" /> : <X className="h-6 w-6 stroke-[3px]" />}
                                                </div>
                                            ) : !hasWinner ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        className="w-12 h-12 border border-foreground/5 bg-foreground/5 hover:bg-primary hover:text-black hover:border-primary flex items-center justify-center group/btn transition-all disabled:opacity-20"
                                                        onClick={() => awayTeamId && handleAddShot(awayTeamId, true)}
                                                        disabled={isSaving || !awayTeamId}
                                                    >
                                                        <Check className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        className="w-12 h-12 border border-foreground/5 bg-foreground/5 hover:bg-red-500 hover:text-foreground hover:border-red-500 flex items-center justify-center group/btn transition-all disabled:opacity-20"
                                                        onClick={() => awayTeamId && handleAddShot(awayTeamId, false)}
                                                        disabled={isSaving || !awayTeamId}
                                                    >
                                                        <X className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 border border-foreground/2 bg-foreground/2 opacity-20" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 relative z-10">
                            {shots.length > 0 && (
                                <Button
                                    variant="ghost"
                                    className="h-10 text-[9px] font-black tracking-widest text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-all"
                                    onClick={handleClear}
                                >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    {t("clear_all")}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="h-10 text-[9px] font-black tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-none"
                            >
                                {t("close_session")}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
