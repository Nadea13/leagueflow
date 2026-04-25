"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Match } from "@/types/index";
import { advanceStage } from "@/actions/organizer/tournaments/general";

import { useTranslations } from "next-intl";
import { ArrowRight, Trophy } from "lucide-react";
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
import { useState } from "react";

interface NextRoundProps {
    tournamentId: string;
    matches: Match[];
    format: string; // 'league', 'knockout', 'group_knockout'
}

export function ProgressionLogic({ tournamentId, matches, format }: NextRoundProps) {
    const t = useTranslations("Fixtures");
    const [isPending, startTransition] = useTransition();
    const [confirmOpen, setConfirmOpen] = useState(false);

    // 1. Identify Current Stage
    // Order: group -> round_of_16 -> quarter_final -> semi_final -> final
    if (!matches || matches.length === 0) return null;

    // Quick check for League (no progression)
    if (format === 'league') return null;

    const stages = new Set(matches.map(m => m.stage));
    let currentStage = 'group';
    if (stages.has('final')) currentStage = 'final';
    else if (stages.has('semi_final')) currentStage = 'semi_final';
    else if (stages.has('quarter_final')) currentStage = 'quarter_final';
    else if (stages.has('round_of_16')) currentStage = 'round_of_16';
    else if (stages.has('group')) currentStage = 'group';

    // 2. Check if Final
    if (currentStage === 'final') {
        const finalMatch = matches.find(m => m.stage === 'final');
        if (finalMatch?.status === 'finished') {
            return (
                <div className="mt-6 flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-none border border-green-200">
                    <Trophy className="mr-2 h-5 w-5" />
                    <span className="font-semibold">{t("tournament_completed")}{finalMatch.winner_id ? t("completed") : ''}</span>
                </div>
            );
        }
        return null; // Final in progress, no next round to generate
    }

    // 3. Check Status
    const currentStageMatches = matches.filter(m => m.stage === currentStage);
    const allFinished = currentStageMatches.every(m => m.status === 'finished');

    const handleAdvance = () => {
        setConfirmOpen(false);
        startTransition(async () => {
            const result = await advanceStage(tournamentId);
            if (!result.success) {
                alert(result.error);
            }
        });
    };

    let buttonText = t("start_next_round");
    if (currentStage === 'group') buttonText = t("generate_semis");
    else if (currentStage === 'round_of_16') buttonText = t("start_quarters");
    else if (currentStage === 'quarter_final') buttonText = t("start_semis");
    else if (currentStage === 'semi_final') buttonText = t("start_final");

    return (
        <div className="flex justify-end mt-6">
            <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!allFinished || isPending}
                size="lg"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
                {buttonText}
                <ArrowRight className="h-4 w-4" />
            </Button>
            {!allFinished && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                    {t("complete_matches")}
                </p>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2">
                            <ArrowRight className="h-5 w-5 text-primary" />
                            Advance Round
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            Are you sure you want to advance to the next round? Ensure all scores are correct.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleAdvance();
                            }}
                            className="rounded-none border border-primary/20 bg-primary/90 text-foreground hover:bg-primary hover:shadow-[0_0_15_rgba(34,197,94,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
                        >
                            <ArrowRight className="h-3.5 w-3.5 mr-2" />
                            Advance
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
