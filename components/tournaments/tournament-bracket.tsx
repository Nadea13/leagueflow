"use client";

import { Match } from "@/types/index";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface TournamentBracketProps {
    matches: Match[];
}

export function TournamentBracket({ matches }: TournamentBracketProps) {
    const t = useTranslations("Bracket");
    // Filter knockout matches
    const knockoutMatches = matches.filter(
        (m) => m.stage !== "league" && m.stage !== "group"
    );

    if (knockoutMatches.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                {t("no_knockout")}
            </div>
        );
    }

    // 1. Define ALL possible stages in order (supports larger tournaments)
    const allStages = ["round_of_64", "round_of_32", "round_of_16", "quarter_final", "semi_final", "final"];

    const stageLabels: Record<string, string> = {
        round_of_64: t("round_of_64"),
        round_of_32: t("round_of_32"),
        round_of_16: t("round_of_16"),
        quarter_final: t("quarter_final"),
        semi_final: t("semi_final"),
        final: t("final"),
    };

    // Group matches by stage
    const matchesByStage = knockoutMatches.reduce((acc, match) => {
        const stage = match.stage;
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    // 2. Filter only ACTIVE stages (Bug Fix: Prevents empty columns and broken lines)
    const activeStages = allStages.filter(stage => matchesByStage[stage] && matchesByStage[stage].length > 0);

    const getPairs = (matches: Match[]) => {
        const pairs = [];
        for (let i = 0; i < matches.length; i += 2) {
            pairs.push(matches.slice(i, i + 2));
        }
        return pairs;
    };

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex gap-8 min-w-max min-h-[500px] items-stretch px-4">
                {activeStages.map((stage, stageIndex) => {
                    let stageMatches = matchesByStage[stage];

                    // Sort by match_index to ensure correct pairing visual
                    stageMatches = [...stageMatches].sort((a, b) => (a.match_index ?? 0) - (b.match_index ?? 0));

                    const isFinal = stage === 'final';
                    const pairs = isFinal ? [stageMatches] : getPairs(stageMatches);

                    return (
                        <div key={stage} className="flex flex-col min-w-[260px]">
                            <h3 className="text-xs font-bold text-center uppercase text-muted-foreground/70 mb-6 tracking-widest bg-muted/20 py-1 rounded">
                                {stageLabels[stage] || stage.replace('_', ' ')}
                            </h3>

                            <div className="flex flex-col justify-around flex-grow relative">
                                {pairs.map((pair, idx) => (
                                    <div key={idx} className="relative flex flex-col justify-center gap-6 my-4">
                                        {pair.map((match, matchIdx) => (
                                            <div key={match.id} className="relative z-10 w-full">
                                                <BracketMatchCard match={match} />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function BracketMatchCard({ match }: { match: Match }) {
    const t = useTranslations("Bracket");
    const isFinished = match.status === "finished";
    const homeWinner = match.winner_id && match.winner_id === match.home_team_id;
    const awayWinner = match.winner_id && match.winner_id === match.away_team_id;

    return (
        <div className={cn(
            "flex flex-col border rounded-lg shadow-sm bg-card overflow-hidden text-sm relative transition-all hover:shadow-md hover:border-primary/30",
            isFinished ? "opacity-100" : "opacity-90"
        )}>
            {/* Header */}
            <div className="flex justify-between items-center px-3 py-1.5 border-b bg-muted/30">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {t("match")} {(match.match_index !== undefined && match.match_index !== null) ? `#${match.match_index}` : ""}
                </span>
                {match.status === 'live' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">{t("live")}</span>}
                {isFinished && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">{t("ft")}</span>}
            </div>

            {/* Home Team */}
            <div className={cn(
                "flex justify-between items-center px-3 py-2 gap-2 transition-colors",
                homeWinner ? "bg-green-50/60 dark:bg-green-900/20 font-semibold" : ""
            )}>
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {homeWinner}
                    {match.home_team?.logo_url ? (
                        <img src={match.home_team.logo_url} className="w-5 h-5 object-contain" alt="" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[9px]">
                            {match.home_team?.name?.charAt(0) || "?"}
                        </div>
                    )}
                    <span className={cn("truncate text-xs", homeWinner ? "text-foreground" : "text-muted-foreground")}>
                        {match.home_team?.name || t("tbd")}
                    </span>
                </div>
                <span className="font-mono text-xs font-bold">{match.home_score ?? "-"}</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 mx-2" />

            {/* Away Team */}
            <div className={cn(
                "flex justify-between items-center px-3 py-2 gap-2 transition-colors",
                awayWinner ? "bg-green-50/60 dark:bg-green-900/20 font-semibold" : ""
            )}>
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {awayWinner}
                    {match.away_team?.logo_url ? (
                        <img src={match.away_team.logo_url} className="w-5 h-5 object-contain" alt="" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[9px]">
                            {match.away_team?.name?.charAt(0) || "?"}
                        </div>
                    )}
                    <span className={cn("truncate text-xs", awayWinner ? "text-foreground" : "text-muted-foreground")}>
                        {match.away_team?.name || t("tbd")}
                    </span>
                </div>
                <span className="font-mono text-xs font-bold">{match.away_score ?? "-"}</span>
            </div>
        </div>
    );
}