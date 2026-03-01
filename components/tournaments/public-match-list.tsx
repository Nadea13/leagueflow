"use client";

import { MatchCard } from "@/components/tournaments/match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

import { Calendar } from "lucide-react";

export function PublicMatchList({ matches, tournamentId, events = [] }: { matches: any[]; tournamentId: string; events?: any[] }) {
    const t = useTranslations("PublicView");

    if (!matches || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">{t("no_matches")}</h3>
            </div>
        );
    }

    // Group matches by round
    const matchesByRound = matches.reduce((acc: any, match: any) => {
        const round = match.round;
        if (!acc[round]) {
            acc[round] = [];
        }
        acc[round].push(match);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {Object.keys(matchesByRound).map((roundKey) => {
                const round = Number(roundKey);
                const firstMatch = matchesByRound[round][0];
                const stage = firstMatch?.stage;

                let headerText = `${t("round_prefix")}${round}`;
                if (stage === 'league' || stage === 'group') {
                    headerText = `${t("match_day_prefix")}${round}`;
                } else if (stage === 'round_of_16') {
                    headerText = t("stage_round_of_16");
                } else if (stage === 'quarter_final') {
                    headerText = t("stage_quarter_final");
                } else if (stage === 'semi_final') {
                    headerText = t("stage_semi_final");
                } else if (stage === 'final') {
                    headerText = t("stage_final");
                }

                return (
                    <Card key={round} className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
                        <CardHeader className="py-3">
                            <CardTitle className="text-md font-medium flex items-center justify-between">
                                {headerText}
                                <span className="text-xs font-normal text-muted-foreground capitalize">
                                    {stage?.replace('_', ' ')}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4 space-y-3">
                            {matchesByRound[round]
                                .sort((a: any, b: any) => {
                                    // 1. Date
                                    if (a.match_date !== b.match_date) {
                                        return (a.match_date || '') > (b.match_date || '') ? 1 : -1;
                                    }
                                    // 2. Time
                                    if (a.match_time !== b.match_time) {
                                        return (a.match_time || '') > (b.match_time || '') ? 1 : -1;
                                    }
                                    // 3. Venue (Numeric/Text sort)
                                    return (a.venue || '').localeCompare(b.venue || '', undefined, { numeric: true });
                                })
                                .map((match: any) => {
                                    const matchEvents = events.filter((e: any) => e.match_id === match.id);
                                    return (
                                        <MatchCard
                                            key={match.id}
                                            match={match}
                                            tournamentId={tournamentId}
                                            goals={[]} // Still empty, but we pass full events now
                                            initialEvents={matchEvents}
                                            isPublic={true}
                                        />
                                    );
                                })}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
