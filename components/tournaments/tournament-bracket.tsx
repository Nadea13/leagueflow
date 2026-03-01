"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Match } from "@/types/index";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";

interface TournamentBracketProps {
    matches: Match[];
    isPublic?: boolean;
}

const CONNECTOR_W = 48;
const CARD_W = 232;
const MATCH_SLOT_H = 80; // Base height per match slot in the first round
const MATCH_GAP = 12;    // Gap between cards in a pair

export function TournamentBracket({ matches, isPublic = false }: TournamentBracketProps) {
    const t = useTranslations("Bracket");
    const knockoutMatches = matches.filter(
        (m) => m.stage !== "league" && m.stage !== "group"
    );

    if (knockoutMatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                    <Trophy className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">{t("no_knockout")}</h3>
            </div>
        );
    }

    const allStages = ["round_of_64", "round_of_32", "round_of_16", "quarter_final", "semi_final", "final"];
    const stageLabels: Record<string, string> = {
        round_of_64: t("round_of_64"),
        round_of_32: t("round_of_32"),
        round_of_16: t("round_of_16"),
        quarter_final: t("quarter_final"),
        semi_final: t("semi_final"),
        final: t("final"),
    };

    const matchesByStage = knockoutMatches.reduce((acc, match) => {
        const stage = match.stage;
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(match);
        return acc;
    }, {} as Record<string, Match[]>);

    const activeStages = allStages.filter(stage => matchesByStage[stage] && matchesByStage[stage].length > 0);

    // Measure actual card height for precise slot sizing
    const [cardHeight, setCardHeight] = useState(MATCH_SLOT_H);
    const measureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (measureRef.current) {
            const h = measureRef.current.getBoundingClientRect().height;
            if (h > 0) setCardHeight(h);
        }
    }, []);

    // The base slot height = card height + gap
    const baseSlotH = cardHeight + MATCH_GAP;

    return (
        <div className="space-y-4">
            {!isPublic && (
                <div className="flex justify-end">
                    <ExportToImageButton targetId="tournament-bracket-canvas" filename="tournament_bracket" label={t("export") || "Export Bracket"} />
                </div>
            )}

            {/* Hidden measurement card */}
            <div className="absolute opacity-0 pointer-events-none" style={{ width: CARD_W }}>
                <div ref={measureRef}>
                    <BracketMatchCard match={knockoutMatches[0]} />
                </div>
            </div>

            <div className="w-full overflow-auto pb-4 custom-scrollbar scroll-smooth">
                <div id="tournament-bracket-canvas" className="inline-flex items-start py-6 pl-4 pr-8">
                    {activeStages.map((stage, stageIndex) => {
                        let stageMatches = matchesByStage[stage];
                        stageMatches = [...stageMatches].sort((a, b) => (a.match_index ?? 0) - (b.match_index ?? 0));

                        const isFinal = stage === 'final';
                        const isLast = stageIndex === activeStages.length - 1;

                        // Each successive round doubles its slot height
                        // stageIndex 0 = first active round = multiplier 1
                        const multiplier = Math.pow(2, stageIndex);
                        const slotHeight = baseSlotH * multiplier;

                        return (
                            <div key={stage} className="flex flex-col shrink-0">
                                {/* Stage label */}
                                <div
                                    className="text-center mb-4"
                                    style={{ width: CARD_W + (!isLast ? CONNECTOR_W : 0) }}
                                >
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground/70 tracking-[0.12em] inline-block pb-1.5 border-b border-border/40">
                                        {stageLabels[stage] || stage.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Matches in this stage */}
                                <div className="flex flex-col">
                                    {stageMatches.map((match, idx) => (
                                        <BracketSlot
                                            key={match.id}
                                            match={match}
                                            slotHeight={slotHeight}
                                            isFinal={isFinal}
                                            showConnector={!isLast}
                                            isTopOfPair={idx % 2 === 0}
                                            isBottomOfPair={idx % 2 === 1}
                                            hasPairPartner={!isFinal && stageMatches.length > 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/**
 * Each match occupies a fixed-height slot. The slot height doubles per round,
 * so matches in round N+1 naturally center between two feeder matches from round N.
 *
 * Connector lines:
 *   - Horizontal stub from card center-right
 *   - Vertical bar from top-of-pair center to bottom-of-pair center (on right edge)
 *   - Output horizontal from vertical bar midpoint to next round
 */
function BracketSlot({
    match,
    slotHeight,
    isFinal,
    showConnector,
    isTopOfPair,
    isBottomOfPair,
    hasPairPartner,
}: {
    match: Match;
    slotHeight: number;
    isFinal: boolean;
    showConnector: boolean;
    isTopOfPair: boolean;
    isBottomOfPair: boolean;
    hasPairPartner: boolean;
}) {
    return (
        <div
            className="flex items-center relative"
            style={{ height: slotHeight }}
        >
            {/* Match card */}
            <div style={{ width: CARD_W }} className="shrink-0">
                <BracketMatchCard match={match} isFinal={isFinal} />
            </div>

            {/* Connector lines */}
            {showConnector && (
                <div className="relative shrink-0" style={{ width: CONNECTOR_W, alignSelf: 'stretch' }}>
                    {/* Horizontal stub from card center to vertical bar position */}
                    <div
                        className="absolute bg-border"
                        style={{
                            left: 0,
                            top: '50%',
                            width: CONNECTOR_W / 2,
                            height: 1.5,
                            transform: 'translateY(-0.75px)',
                        }}
                    />

                    {hasPairPartner && (
                        <>
                            {/* Vertical bar: top-of-pair extends downward, bottom-of-pair extends upward */}
                            {isTopOfPair && (
                                <div
                                    className="absolute bg-border"
                                    style={{
                                        left: CONNECTOR_W / 2 - 0.75,
                                        top: '50%',
                                        width: 1.5,
                                        bottom: 0,
                                    }}
                                />
                            )}
                            {isBottomOfPair && (
                                <>
                                    <div
                                        className="absolute bg-border"
                                        style={{
                                            left: CONNECTOR_W / 2 - 0.75,
                                            top: 0,
                                            width: 1.5,
                                            height: '50%',
                                        }}
                                    />
                                    {/* Output horizontal from vertical bar to next round */}
                                    <div
                                        className="absolute bg-border"
                                        style={{
                                            left: CONNECTOR_W / 2,
                                            top: 0,
                                            width: CONNECTOR_W / 2,
                                            height: 1.5,
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {/* Single match (no pair): straight horizontal through */}
                    {!hasPairPartner && (
                        <div
                            className="absolute bg-border"
                            style={{
                                left: CONNECTOR_W / 2,
                                top: '50%',
                                width: CONNECTOR_W / 2,
                                height: 1.5,
                                transform: 'translateY(-0.75px)',
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function BracketMatchCard({ match, isFinal }: { match: Match; isFinal?: boolean }) {
    const t = useTranslations("Bracket");
    const isFinished = match.status === "finished";
    const homeWinner = match.winner_id && match.winner_id === match.home_team_id;
    const awayWinner = match.winner_id && match.winner_id === match.away_team_id;
    const hasPenalties = match.penalty_home_score != null || match.penalty_away_score != null;

    return (
        <div className={cn(
            "flex flex-col border rounded-sm bg-card overflow-hidden text-sm relative transition-all",
            "shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_3px_10px_rgba(0,0,0,0.1)] hover:border-primary/25",
            isFinal && "ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.08)]",
            isFinished ? "opacity-100" : "opacity-90"
        )}>
            {/* Header */}
            <div className="flex justify-between items-center px-2.5 py-1 bg-muted/30 border-b border-border/40">
                <span className="text-[9px] uppercase font-semibold text-muted-foreground/60 tracking-wider flex items-center gap-1">
                    {isFinal && <Trophy className="h-3 w-3 text-amber-500" />}
                    {t("match")} {(match.match_index !== undefined && match.match_index !== null) ? `#${match.match_index}` : ""}
                </span>
                <div className="flex items-center gap-1">
                    {match.status === 'live' && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded-sm animate-pulse leading-none">
                            {t("live")}
                        </span>
                    )}
                    {isFinished && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-sm leading-none">
                            {t("ft")}
                        </span>
                    )}
                    {hasPenalties && isFinished && (
                        <span className="text-[8px] font-medium px-1 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-sm leading-none">
                            PEN
                        </span>
                    )}
                </div>
            </div>

            {/* Home Team */}
            <TeamRow
                name={match.home_team?.name}
                logoUrl={match.home_team?.logo_url}
                score={match.home_score}
                penaltyScore={hasPenalties ? match.penalty_home_score : undefined}
                isWinner={!!homeWinner}
                tbd={t("tbd")}
            />

            {/* Divider */}
            <div className="h-px bg-border/30" />

            {/* Away Team */}
            <TeamRow
                name={match.away_team?.name}
                logoUrl={match.away_team?.logo_url}
                score={match.away_score}
                penaltyScore={hasPenalties ? match.penalty_away_score : undefined}
                isWinner={!!awayWinner}
                tbd={t("tbd")}
            />
        </div>
    );
}

function TeamRow({
    name,
    logoUrl,
    score,
    penaltyScore,
    isWinner,
    tbd,
}: {
    name?: string;
    logoUrl?: string | null;
    score: number | null | undefined;
    penaltyScore?: number | null;
    isWinner: boolean;
    tbd: string;
}) {
    return (
        <div className={cn(
            "flex justify-between items-center px-2.5 py-1.5 gap-2 transition-colors",
            isWinner && "bg-emerald-50/60 dark:bg-emerald-900/10"
        )}>
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                {isWinner && (
                    <div className="w-0.5 h-4 bg-emerald-500 rounded-full shrink-0 -ml-1 mr-0.5" />
                )}
                {logoUrl ? (
                    <img src={logoUrl} className="w-4 h-4 object-contain shrink-0" alt="" />
                ) : (
                    <div className="w-4 h-4 rounded-sm bg-muted/80 flex items-center justify-center shrink-0 text-[8px] font-medium text-muted-foreground/70">
                        {name?.charAt(0) || "?"}
                    </div>
                )}
                <span className={cn(
                    "truncate text-xs leading-none",
                    isWinner ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                    {name || tbd}
                </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
                <span className={cn(
                    "font-mono text-xs min-w-[16px] text-center tabular-nums",
                    isWinner ? "font-bold text-foreground" : "text-muted-foreground/70"
                )}>
                    {score ?? "-"}
                </span>
                {penaltyScore != null && (
                    <span className="text-[9px] text-muted-foreground/50 font-mono tabular-nums">
                        ({penaltyScore})
                    </span>
                )}
            </div>
        </div>
    );
}