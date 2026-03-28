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

    // Group by stage for knockouts, consolidate for group/league
    const groups = matches.reduce((acc: any, match: any) => {
        const isKnockout = match.stage !== 'group' && match.stage !== 'league';
        const key = isKnockout ? match.stage : 'group_stage';
        if (!acc[key]) acc[key] = [];
        acc[key].push(match);
        return acc;
    }, {});

    // Sort stages logically
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === 'group_stage') return -1;
        if (b === 'group_stage') return 1;
        
        const aRound = groups[a][0].round || 0;
        const bRound = groups[b][0].round || 0;
        return aRound - bRound;
    });

    return (
        <div className="space-y-6">
            {sortedKeys.map((key) => {
                const stageMatches = groups[key];
                const firstMatch = stageMatches[0];
                const stage = firstMatch.stage;
                
                let headerText = "";
                if (key !== 'group_stage') {
                    if (stage === 'round_of_16') headerText = t("stage_round_of_16");
                    else if (stage === 'quarter_final') headerText = t("stage_quarter_final");
                    else if (stage === 'semi_final') headerText = t("stage_semi_final");
                    else if (stage === 'final') headerText = t("stage_final");
                    else headerText = stage?.replace('_', ' ').toUpperCase() || "";
                }

                const MatchList = (
                    <div className="grid gap-3">
                        {[...stageMatches]
                            .sort((a, b) => {
                                if (a.round !== b.round) return (a.round || 0) - (b.round || 0);
                                if (a.match_date !== b.match_date) return (a.match_date || '') > (b.match_date || '') ? 1 : -1;
                                if (a.match_time !== b.match_time) return (a.match_time || '') > (b.match_time || '') ? 1 : -1;
                                return (a.venue || '').localeCompare(b.venue || '', undefined, { numeric: true });
                            })
                            .map((match: any) => {
                                const matchEvents = events.filter((e: any) => e.match_id === match.id);
                                return (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        tournamentId={tournamentId}
                                        goals={[]}
                                        initialEvents={matchEvents}
                                        isPublic={true}
                                    />
                                );
                            })
                        }
                    </div>
                );

                if (key === 'group_stage') {
                    return <div key={key}>{MatchList}</div>;
                }

                return (
                    <Card key={key} className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
                        <CardHeader className="py-3">
                            <CardTitle className="text-md font-medium">
                                {headerText}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4">
                            {MatchList}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
