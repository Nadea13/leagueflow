"use client";

import { useState, useEffect, useMemo } from "react";
import { PenaltyShot } from "@/types/index";
import { getPenaltyShootout, addPenaltyShot, clearPenaltyShootout } from "@/app/[locale]/dashboard/tournaments/[id]/penalty-actions";
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
}

export function PenaltyShootoutDialog({
    matchId,
    homeTeamId,
    awayTeamId,
    homeTeamName,
    awayTeamName,
    trigger,
    onComplete,
}: PenaltyShootoutDialogProps) {
    const { toast } = useToast();
    const t = useTranslations("Penalty");
    const [open, setOpen] = useState(false);
    const [shots, setShots] = useState<PenaltyShot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchShots = async () => {
        setIsLoading(true);
        const result = await getPenaltyShootout(matchId);
        if (result.success && result.data) {
            setShots(result.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (open) fetchShots();
    }, [open, matchId]);

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
            // Tied and both teams shot same number — show one more empty row for sudden death
            return maxCompleted + 1;
        }

        if (!bothComplete) {
            // One team hasn't shot yet this round — show current max
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
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleClear = async () => {
        if (!confirm(t("clear_confirm"))) return;
        await clearPenaltyShootout(matchId);
        setShots([]);
    };

    // Determine winner
    const hasWinner = useMemo(() => {
        const hLen = homeShots.length;
        const aLen = awayShots.length;
        if (hLen < 5 || aLen < 5) return null; // Regulation not complete

        if (hLen === aLen && homeScore !== awayScore) {
            return homeScore > awayScore ? 'home' : 'away';
        }
        return null;
    }, [homeShots.length, awayShots.length, homeScore, awayScore]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Target className="h-4 w-4 mr-1" />
                        Penalty Shootout
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {t("title")}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Score Summary */}
                        <div className="flex items-center justify-center gap-6 py-4 bg-muted/30 rounded-none">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1 truncate max-w-[100px]">{homeTeamName}</p>
                                <span className={cn("text-3xl font-bold", hasWinner === 'home' && "text-green-600")}>{homeScore}</span>
                            </div>
                            <span className="text-muted-foreground text-lg">-</span>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-1 truncate max-w-[100px]">{awayTeamName}</p>
                                <span className={cn("text-3xl font-bold", hasWinner === 'away' && "text-green-600")}>{awayScore}</span>
                            </div>
                        </div>

                        {/* Winner Banner */}
                        {hasWinner && (
                            <div className="text-center py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-none">
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                    🏆 {t("wins_on_penalties", { team: hasWinner === 'home' ? homeTeamName : awayTeamName })}
                                </p>
                            </div>
                        )}

                        {/* Sudden Death Indicator */}
                        {isSuddenDeath && !hasWinner && (
                            <div className="flex items-center justify-center gap-2">
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {t("sudden_death")}
                                </Badge>
                            </div>
                        )}

                        {/* Shot Grid */}
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-sm">
                            <div className="text-center font-medium text-xs text-muted-foreground">{homeTeamName}</div>
                            <div className="text-center text-xs text-muted-foreground">#</div>
                            <div className="text-center font-medium text-xs text-muted-foreground">{awayTeamName}</div>

                            {Array.from({ length: totalRounds }, (_, i) => {
                                const homeShot = homeShots[i];
                                const awayShot = awayShots[i];
                                const isSD = i >= 5;

                                return (
                                    <div key={i} className={cn("contents", isSD && "[&>div]:border-t [&>div]:pt-1")}>
                                        {/* Home Shot */}
                                        <div className="flex justify-center">
                                            {homeShot ? (
                                                <div className={cn(
                                                    "w-8 h-8 rounded-none flex items-center justify-center",
                                                    homeShot.scored ? "bg-green-100 text-green-700 dark:bg-green-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                                                )}>
                                                    {homeShot.scored ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                </div>
                                            ) : !hasWinner ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        className="w-8 h-8 rounded-none border border-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center justify-center disabled:opacity-50 transition-colors"
                                                        onClick={() => homeTeamId && handleAddShot(homeTeamId, true)}
                                                        disabled={isSaving || !homeTeamId}
                                                        title={t("scored")}
                                                    >
                                                        <Check className="h-3 w-3 text-green-600" />
                                                    </button>
                                                    <button
                                                        className="w-8 h-8 rounded-none border border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center disabled:opacity-50 transition-colors"
                                                        onClick={() => homeTeamId && handleAddShot(homeTeamId, false)}
                                                        disabled={isSaving || !homeTeamId}
                                                        title={t("missed")}
                                                    >
                                                        <X className="h-3 w-3 text-red-600" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8" />
                                            )}
                                        </div>

                                        {/* Round Number */}
                                        <div className="flex items-center justify-center">
                                            <span className={cn(
                                                "text-xs font-mono",
                                                isSD ? "text-amber-600 font-bold" : "text-muted-foreground"
                                            )}>
                                                {isSD ? `SD${i - 4}` : i + 1}
                                            </span>
                                        </div>

                                        {/* Away Shot */}
                                        <div className="flex justify-center">
                                            {awayShot ? (
                                                <div className={cn(
                                                    "w-8 h-8 rounded-none flex items-center justify-center",
                                                    awayShot.scored ? "bg-green-100 text-green-700 dark:bg-green-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                                                )}>
                                                    {awayShot.scored ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                </div>
                                            ) : !hasWinner ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        className="w-8 h-8 rounded-none border border-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center justify-center disabled:opacity-50 transition-colors"
                                                        onClick={() => awayTeamId && handleAddShot(awayTeamId, true)}
                                                        disabled={isSaving || !awayTeamId}
                                                        title={t("scored")}
                                                    >
                                                        <Check className="h-3 w-3 text-green-600" />
                                                    </button>
                                                    <button
                                                        className="w-8 h-8 rounded-none border border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center disabled:opacity-50 transition-colors"
                                                        onClick={() => awayTeamId && handleAddShot(awayTeamId, false)}
                                                        disabled={isSaving || !awayTeamId}
                                                        title={t("missed")}
                                                    >
                                                        <X className="h-3 w-3 text-red-600" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        {shots.length > 0 && (
                            <div className="flex justify-center pt-2">
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleClear}>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    {t("clear_all")}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
