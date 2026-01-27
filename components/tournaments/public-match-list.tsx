"use client";

import { MatchCard } from "@/components/tournaments/match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PublicMatchList({ matches, tournamentId }: { matches: any[]; tournamentId: string }) {
    if (!matches || matches.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                No matches scheduled yet.
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

                let headerText = `Round ${round}`;
                if (stage === 'league' || stage === 'group') {
                    headerText = `Match Day ${round}`;
                } else if (stage === 'round_of_16') {
                    headerText = "Round of 16";
                } else if (stage === 'quarter_final') {
                    headerText = "Quarter Final";
                } else if (stage === 'semi_final') {
                    headerText = "Semi Final";
                } else if (stage === 'final') {
                    headerText = "Final";
                }

                return (
                    <Card key={round} className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
                        <CardHeader className="bg-muted/30 py-3 border-b">
                            <CardTitle className="text-md font-medium flex items-center justify-between">
                                {headerText}
                                <span className="text-xs font-normal text-muted-foreground capitalize">
                                    {stage?.replace('_', ' ')}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4 space-y-3">
                            {matchesByRound[round].map((match: any) => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    tournamentId={tournamentId}
                                    goals={[]}
                                    isPublic={true}
                                />
                            ))}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
