"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Match } from "@/types/index";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";

interface BracketProps {
    matches: Match[];
    isPublic?: boolean;
}

const CONNECTOR_W = 48;
const CARD_W = 232;
const MATCH_SLOT_H = 80; // Base height per match slot in the first round
const MATCH_GAP = 12;    // Gap between cards in a pair

export function Bracket({ matches, isPublic = false }: BracketProps) {
    const t = useTranslations("Bracket");

    // Measure actual card height for precise slot sizing
    const [cardHeight, setCardHeight] = useState(MATCH_SLOT_H);
    const measureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (measureRef.current) {
            const h = measureRef.current.getBoundingClientRect().height;
            if (h > 0) setCardHeight(h);
        }
    }, []);

    const knockoutMatches = matches.filter(
        (m) => m.stage !== "league" && m.stage !== "group"
    );

    if (knockoutMatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/20 rounded-none bg-muted/5">
                <div className="h-12 w-12 rounded-none bg-muted/10 flex items-center justify-center mb-4 border border-border/10">
                    <Trophy className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{t("no_knockout")}</h3>
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

    // The base slot height = card height + gap
    const baseSlotH = cardHeight + MATCH_GAP;

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Hidden measurement card */}
            <div className="absolute opacity-0 pointer-events-none" style={{ width: CARD_W }}>
                <div ref={measureRef}>
                    <BracketMatchCard match={knockoutMatches[0]} isPublic={isPublic} />
                </div>
            </div>

            <div className="w-full overflow-auto custom-scrollbar scroll-smooth">
                <div id="tournament-bracket-canvas" className="inline-flex items-start">
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
                                    className="text-center mb-4 md:mb-6 pr-12"
                                    style={{ width: CARD_W + (!isLast ? CONNECTOR_W : 0) }}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-secondary/80 bg-secondary/5 px-3 py-1 border-l-2 border-secondary">
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
                                            isPublic={isPublic}
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
    isPublic,
}: {
    match: Match;
    slotHeight: number;
    isFinal: boolean;
    showConnector: boolean;
    isTopOfPair: boolean;
    isBottomOfPair: boolean;
    hasPairPartner: boolean;
    isPublic?: boolean;
}) {
    return (
        <div
            className="flex items-center relative"
            style={{ height: slotHeight }}
        >
            {/* Match card */}
            <div style={{ width: CARD_W }} className="shrink-0">
                <BracketMatchCard match={match} isFinal={isFinal} isPublic={isPublic} />
            </div>

            {/* Connector lines */}
            {showConnector && (
                <div className="relative shrink-0" style={{ width: CONNECTOR_W, alignSelf: 'stretch' }}>
                    {/* Horizontal stub from card center to vertical bar position */}
                    <div
                        className="absolute bg-secondary/30"
                        style={{
                            left: 0,
                            top: '50%',
                            width: CONNECTOR_W / 2,
                            height: 1,
                            transform: 'translateY(-0.5px)',
                        }}
                    />

                    {hasPairPartner && (
                        <>
                            {/* Vertical bar: top-of-pair extends downward, bottom-of-pair extends upward */}
                            {isTopOfPair && (
                                <div
                                    className="absolute bg-secondary/30"
                                    style={{
                                        left: CONNECTOR_W / 2 - 0.5,
                                        top: '50%',
                                        width: 1,
                                        bottom: 0,
                                    }}
                                />
                            )}
                            {isBottomOfPair && (
                                <>
                                    <div
                                        className="absolute bg-secondary/30"
                                        style={{
                                            left: CONNECTOR_W / 2 - 0.5,
                                            top: 0,
                                            width: 1,
                                            height: '50%',
                                        }}
                                    />
                                    {/* Output horizontal from vertical bar to next round */}
                                    <div
                                        className="absolute bg-secondary/30"
                                        style={{
                                            left: CONNECTOR_W / 2,
                                            top: 0,
                                            width: CONNECTOR_W / 2,
                                            height: 1,
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {/* Single match (no pair): straight horizontal through */}
                    {!hasPairPartner && (
                        <div
                            className="absolute bg-secondary/30"
                            style={{
                                left: CONNECTOR_W / 2,
                                top: '50%',
                                width: CONNECTOR_W / 2,
                                height: 1,
                                transform: 'translateY(-0.5px)',
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function BracketMatchCard({ match, isFinal, isPublic }: { match: Match; isFinal?: boolean; isPublic?: boolean }) {
    const t = useTranslations("Bracket");
    const tournamentId = match.tournament_id;
    const isFinished = match.status === "finished";
    const isScheduled = match.status === "scheduled";
    const homeWinner = match.winner_id && match.winner_id === match.home_team_id;
    const awayWinner = match.winner_id && match.winner_id === match.away_team_id;
    const hasPenalties = !isScheduled && ((match.penalty_home_score ?? 0) > 0 || (match.penalty_away_score ?? 0) > 0);

    const url = isPublic 
        ? `/${tournamentId}/matches/${match.id}`
        : `/organizer/tournaments/${tournamentId}/matches/${match.id}`;

    return (
        <Link 
            href={url}
            className={cn(
                "flex flex-col border border-border/40 bg-card rounded-none overflow-hidden text-sm relative transition-all group",
                "shadow-lg hover:border-secondary/30",
                isFinal && "border-secondary/40 shadow-[0_0_20px_rgba(0,196,154,0.1)]",
                !isFinished && "opacity-95"
            )}
        >
             {/* Dynamic color strip on top */}
             <div className={cn(
                "h-0.5 w-full",
                isFinal ? "bg-secondary shadow-[0_0_8px_rgba(0,196,154,0.6)]" : "bg-muted/20 group-hover:bg-secondary/40"
            )} />

            {/* Header */}
            <div className="flex justify-between items-center px-3 py-1.5 bg-muted/10 border-b border-border/20">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                    {isFinal && <Trophy className="h-2.5 w-2.5 text-secondary" />}
                    {t("match")} {(match.match_index !== undefined && match.match_index !== null) ? `#${match.match_index}` : ""}
                </span>
                <div className="flex items-center gap-1">
                    {match.status === 'live' && (
                        <div className="flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded-none">
                            <span className="h-1 w-1 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[8px] font-black uppercase text-red-500 tracking-tighter">
                                {t("live")}
                            </span>
                        </div>
                    )}
                    {isFinished && (
                        <span className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-tighter">
                            {t("ft")}
                        </span>
                    )}
                </div>
            </div>

            {/* Home Team */}
            <TeamRow
                name={match.home_team?.name}
                logoUrl={match.home_team?.logo_url}
                score={isScheduled ? null : match.home_score}
                penaltyScore={hasPenalties ? match.penalty_home_score : undefined}
                isWinner={!!homeWinner}
                tbd={t("tbd")}
            />

            {/* Away Team */}
            <TeamRow
                name={match.away_team?.name}
                logoUrl={match.away_team?.logo_url}
                score={isScheduled ? null : match.away_score}
                penaltyScore={hasPenalties ? match.penalty_away_score : undefined}
                isWinner={!!awayWinner}
                tbd={t("tbd")}
            />
        </Link>
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
            "flex justify-between items-center px-3 py-2 gap-2 transition-colors relative",
            isWinner ? "bg-secondary/[0.03]" : ""
        )}>
            {isWinner && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 bg-secondary shadow-[0_0_8px_rgba(0,196,154,0.4)]" />
            )}
            <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                <div className="w-5 h-5 bg-muted/10 border border-border/10 p-0.5 rounded-none shrink-0 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                        <Image src={logoUrl} width={20} height={20} className="w-full h-full object-contain" alt="" unoptimized />
                    ) : (
                        <span className="text-[9px] font-black text-muted-foreground/30 capitalize">
                            {name?.charAt(0) || "?"}
                        </span>
                    )}
                </div>
                <span className={cn(
                    "truncate text-[11px] font-black uppercase tracking-tighter transition-colors",
                    isWinner ? "text-foreground" : "text-muted-foreground/60"
                )}>
                    {name || tbd}
                </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {penaltyScore != null && (
                    <span className="text-[9px] font-black text-muted-foreground/30">
                        ({penaltyScore})
                    </span>
                )}
                <span className={cn(
                    "text-xs min-w-[16px] text-center font-black tracking-tighter",
                    isWinner ? "text-secondary" : "text-muted-foreground/60"
                )}>
                    {score ?? "-"}
                </span>
            </div>
        </div>
    );
}