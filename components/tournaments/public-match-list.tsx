"use client";

import { MatchCard } from "@/components/tournaments/match-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

import { Calendar } from "lucide-react";

export function PublicMatchList({ matches, tournamentId, events = [] }: { matches: any[]; tournamentId: string; events?: any[] }) {
    const t = useTranslations("PublicView");

    if (!matches || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 border border-white/5 group relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-0 bg-secondary group-hover:h-full transition-all duration-500" />
                <div className="h-16 w-16 rounded-none bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-secondary/30 transition-colors">
                    <Calendar className="h-8 w-8 text-muted-foreground/40 group-hover:text-secondary transition-colors" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground mb-2 whitespace-nowrap">{t("no_matches")}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 max-w-xs leading-relaxed">
                    Stay tuned for match updates and schedules.
                </p>
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

                return (
                    <div key={key} className="space-y-4 md:space-y-6">
                        {headerText && (
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="h-px bg-secondary/30 flex-1" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-secondary">
                                    {headerText}
                                </h3>
                                <div className="h-px bg-secondary/30 flex-1" />
                            </div>
                        )}
                        <div className="space-y-[1px] bg-white/5 border border-white/5">
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
                                        <div key={match.id} className="relative group overflow-hidden">
                                            <MatchCard
                                                match={match}
                                                tournamentId={tournamentId}
                                                goals={[]}
                                                initialEvents={matchEvents}
                                                isPublic={true}
                                            />
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
