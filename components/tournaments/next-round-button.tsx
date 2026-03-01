"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Match } from "@/types/index";
import { advanceStage } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { startTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Trophy } from "lucide-react";

interface NextRoundButtonProps {
    tournamentId: string;
    matches: Match[];
    format: string; // 'league', 'knockout', 'group_knockout'
}

export function NextRoundButton({ tournamentId, matches, format }: NextRoundButtonProps) {
    const t = useTranslations("Fixtures");
    const [isPending, startTransition] = useTransition();

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
        if (!confirm("Are you sure you want to advance to the next round? Ensure all scores are correct.")) return;

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
                onClick={handleAdvance}
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
        </div>
    );
}
