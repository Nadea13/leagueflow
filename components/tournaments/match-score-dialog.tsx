"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { updateMatchScore, addGoal, deleteGoal, updateMatch } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { Match, Goal } from "@/types/index";

interface MatchScoreDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: Match;
    tournamentId: string;
    goals?: Goal[]; // Assuming we fetch goals for the match
}

export function MatchScoreDialog({ open, onOpenChange, match, tournamentId, goals: initialGoals = [] }: MatchScoreDialogProps) {
    const t = useTranslations("Match");
    const tCommon = useTranslations("Common");
    const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? "0");
    const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? "0");
    const [loading, setLoading] = useState(false);

    // Scorer State
    const [scorerName, setScorerName] = useState("");
    const [scorerTeamId, setScorerTeamId] = useState<string>(match.home_team_id || "");

    const handleSaveScore = async () => {
        setLoading(true);
        try {
            await updateMatchScore(match.id, Number(homeScore), Number(awayScore), tournamentId);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleWalkover = async (winnerTeamId: string) => {
        if (!confirm(t("walkover_confirm"))) return;

        setLoading(true);
        try {
            const isHomeWinner = winnerTeamId === match.home_team_id;
            const newHomeScore = isHomeWinner ? 3 : 0;
            const newAwayScore = isHomeWinner ? 0 : 3;

            // Update score
            await updateMatchScore(match.id, newHomeScore, newAwayScore, tournamentId);
            // Update match winner explicitly if needed, but score usually implies it. 
            // Let's set winner_id just in case types support it and it helps logic.
            await updateMatch(match.id, { winner_id: winnerTeamId, status: 'finished' }, tournamentId);

            setHomeScore(newHomeScore.toString());
            setAwayScore(newAwayScore.toString());
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGoal = async () => {
        if (!scorerName || !scorerTeamId) return;
        setLoading(true);
        try {
            await addGoal(match.id, scorerTeamId, scorerName, tournamentId);
            setScorerName("");
            // Ideally we should refresh goals here or rely on parent revalidation. 
            // Component might not auto-update strictly unless we use optimistic UI or fetch.
            // For MVP, revalidatePath in action should trigger page refresh.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("update_score")}</DialogTitle>
                    <DialogDescription>
                        {match.home_team?.name} vs {match.away_team?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Score Inputs */}
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <Label>{match.home_team?.name}</Label>
                            <Input
                                type="number"
                                value={homeScore}
                                onChange={(e) => setHomeScore(e.target.value)}
                                className="w-20 text-center text-lg font-bold"
                            />
                        </div>
                        <span className="text-xl font-bold">:</span>
                        <div className="flex flex-col items-center gap-2">
                            <Label>{match.away_team?.name}</Label>
                            <Input
                                type="number"
                                value={awayScore}
                                onChange={(e) => setAwayScore(e.target.value)}
                                className="w-20 text-center text-lg font-bold"
                            />
                        </div>
                    </div>

                    {/* Walkover / W.O. */}
                    <div className="border-t pt-4">
                        <Label className="mb-2 block text-muted-foreground text-xs uppercase tracking-wider">{t("walkover")}</Label>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => match.home_team_id && handleWalkover(match.home_team_id)} disabled={loading}>
                                {t("wo")} {match.home_team?.name} (3-0)
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => match.away_team_id && handleWalkover(match.away_team_id)} disabled={loading}>
                                {t("wo")} {match.away_team?.name} (0-3)
                            </Button>
                        </div>
                    </div>

                    {/* Goal Scorers */}
                    <div className="border-t pt-4">
                        <Label className="mb-2 block text-muted-foreground text-xs uppercase tracking-wider">{t("add_scorer")}</Label>
                        <div className="flex gap-2 mb-2">
                            <Select value={scorerTeamId} onValueChange={setScorerTeamId}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder={t("team")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {match.home_team_id && <SelectItem value={match.home_team_id}>{match.home_team?.name}</SelectItem>}
                                    {match.away_team_id && <SelectItem value={match.away_team_id}>{match.away_team?.name}</SelectItem>}
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder={t("player_name_placeholder")}
                                value={scorerName}
                                onChange={(e) => setScorerName(e.target.value)}
                            />
                            <Button size="icon" onClick={handleAddGoal} disabled={loading || !scorerName}>
                                <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : 'hidden'}`} />
                                {!loading && "+"}
                            </Button>
                        </div>

                        {/* List Goals (Passed from props ideally) */}
                        {initialGoals && initialGoals.length > 0 && (
                            <div className="space-y-1 mt-2 max-h-[100px] overflow-y-auto">
                                {initialGoals.filter(g => g.match_id === match.id).map(goal => (
                                    <div key={goal.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                                        <span>{goal.player_name} ({goal.team_id === match.home_team_id ? match.home_team?.name : match.away_team?.name})</span>
                                        {/* Delete Goal Action would go here if needed */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
                    <Button onClick={handleSaveScore} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("save_score")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
