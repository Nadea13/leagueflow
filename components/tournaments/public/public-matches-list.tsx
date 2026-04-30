"use client";

import { useState, useEffect, useRef } from "react";
import { MatchCard } from "@/components/tournaments/matches/match-card";
import { useTranslations } from "next-intl";
import { Match, MatchEvent, Team } from "@/types";

import { Calendar, ChevronDown } from "lucide-react";

export function PublicMatches({ 
    matches, 
    tournamentId, 
    teams = [],
    events: _events = [] 
}: { 
    matches: Match[]; 
    tournamentId: string; 
    teams?: Team[];
    events?: MatchEvent[] 
}) {
    const t = useTranslations("PublicView");
    const tMatch = useTranslations("Match");
    const tBracket = useTranslations("Bracket");
    
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    const hasInitialized = useRef(false);
    // Auto-expand first date if nothing is expanded
    useEffect(() => {
        if (!hasInitialized.current && matches.length > 0) {
            const sortedMatches = [...matches].sort((a, b) => (a.match_date || "") > (b.match_date || "") ? 1 : -1);
            const firstDate = sortedMatches[0].match_date;
            if (firstDate) {
                hasInitialized.current = true;
                setTimeout(() => {
                    setExpandedDates(new Set([firstDate]));
                }, 0);
            }
        }
    }, [matches]);

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-foreground/5 border border-foreground/5 group relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-0 bg-primary group-hover:h-full transition-all duration-500" />
                <div className="h-16 w-16 rounded-none bg-foreground/5 flex items-center justify-center mb-6 border border-foreground/10 group-hover:border-primary/30 transition-colors">
                    <Calendar className="h-8 w-8 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-black tracking-tighter text-foreground mb-2 whitespace-nowrap">{t("no_matches")}</h3>
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground/40 max-w-xs leading-relaxed">
                    Stay tuned for match updates and schedules.
                </p>
            </div>
        );
    }

    // Group by Date first
    const dateGroups = matches.reduce((acc: Record<string, Match[]>, match) => {
        const dateKey = match.match_date || "tbd";
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(match);
        return acc;
    }, {});

    const sortedDates = Object.keys(dateGroups).sort();

    return (
        <div className="space-y-4">
            {sortedDates.map((dateKey) => {
                const dayMatches = dateGroups[dateKey];
                const isExpanded = expandedDates.has(dateKey);

                // Sub-group by Stage within each day
                const stageGroups = dayMatches.reduce((acc: Record<string, Match[]>, match) => {
                    const stageKey = match.stage || "unknown";
                    if (!acc[stageKey]) acc[stageKey] = [];
                    acc[stageKey].push(match);
                    return acc;
                }, {});

                const sortedStages = Object.keys(stageGroups).sort((a, b) => {
                    const order = ['group', 'league', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];
                    return order.indexOf(a) - order.indexOf(b);
                });

                return (
                    <div key={dateKey} className="space-y-0 border border-foreground/5 overflow-hidden bg-card shadow-sm">
                        {/* Date Header / Dropdown Toggle */}
                        <button
                            onClick={() => toggleDate(dateKey)}
                            className="w-full flex items-center justify-between px-4 py-4 bg-foreground/[0.02] hover:bg-foreground/[0.05] transition-colors group border-b border-foreground/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-none bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Calendar className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-xs font-black tracking-widest text-foreground">
                                        {dateKey === "tbd" ? tMatch("tbd") : new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                    <span className="text-[9px] font-bold text-muted-foreground/60 tracking-wider">
                                        {dayMatches.length} {tMatch("matches") || "Matches"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        {isExpanded && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                {sortedStages.map((stageKey) => {
                                    const stageMatches = stageGroups[stageKey];
                                    
                                    // Determine stage label
                                    let stageLabel = "";
                                    if (stageKey === 'round_of_16') stageLabel = tBracket("round_of_16");
                                    else if (stageKey === 'quarter_final') stageLabel = tBracket("quarter_final");
                                    else if (stageKey === 'semi_final') stageLabel = tBracket("semi_final");
                                    else if (stageKey === 'final') stageLabel = tBracket("final");
                                    else if (stageKey === 'group') stageLabel = tMatch("group");
                                    else if (stageKey === 'league') stageLabel = tMatch("league") || "League";
                                    else stageLabel = stageKey.replace('_', ' ').toUpperCase();

                                    return (
                                        <div key={stageKey} className="space-y-0">
                                            {/* Only show stage header if there are multiple stages on this day OR it's not the default 'group' */}
                                            {(sortedStages.length > 1 || (stageKey !== 'group' && stageKey !== 'league')) && (
                                                <div className="px-4 py-2 bg-primary/5 border-b border-foreground/5 flex items-center justify-between">
                                                    <span className="text-[9px] font-black tracking-[0.2em] text-primary">
                                                        {stageLabel}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="divide-y divide-foreground/5">
                                                {stageMatches
                                                    .sort((a, b) => (a.match_time || "") > (b.match_time || "") ? 1 : -1)
                                                    .map((match) => (
                                                        <div key={match.id} className="relative group overflow-hidden">
                                                            <MatchCard
                                                                match={match}
                                                                tournamentId={tournamentId}
                                                                isPublic={true}
                                                                teams={teams}
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
