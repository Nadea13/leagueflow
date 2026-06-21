"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Match, Team } from "@/types/index";
import { MatchCard } from "@/features/tournaments/matches/match-card";
import { Calendar as CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/date";

interface FixturesManagerProps {
    teams: Team[];
    matches: Match[];
    tournamentId: string;
    format?: string;
    isPro?: boolean;
    hideControls?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    externalEditMode?: boolean;
    externalFilterStage?: string;
    externalSelectedDate?: string | null;
    isPublic?: boolean;
}

export function MatchManager({
    matches,
    teams,
    tournamentId,
    externalFilterStage = "all",
    externalSelectedDate = null,
    isPublic = false
}: FixturesManagerProps) {
    const tMatch = useTranslations("Match");
    const tFixtures = useTranslations("Fixtures");
    const tBracket = useTranslations("Bracket");
    const locale = useLocale();

    const [filterStage, setFilterStage] = useState<string>(externalFilterStage);
    const [selectedDate, setSelectedDate] = useState<string | null>(externalSelectedDate);

    // Sync external states
    useEffect(() => {
        setFilterStage(externalFilterStage);
    }, [externalFilterStage]);

    useEffect(() => {
        setSelectedDate(externalSelectedDate);
    }, [externalSelectedDate]);

    // Filter Logic
    const filteredMatches = matches.filter(match => {
        // Date Filter
        const matchesDate = !selectedDate || match.match_date === selectedDate;
        if (!matchesDate) return false;

        // Stage Filter
        if (filterStage === "all") return true;
        if (filterStage === "knockout") {
            return match.stage !== 'group' && match.stage !== 'league';
        }
        if (filterStage.startsWith("Group")) {
            const groupLetter = filterStage.split(" ")[1];
            if (match.stage !== 'group') return false;
            const homeGroup = teams.find(t => t.id === match.home_team_id)?.group_name;
            const awayGroup = teams.find(t => t.id === match.away_team_id)?.group_name;
            return homeGroup === groupLetter || awayGroup === groupLetter;
        }
        return match.stage === filterStage;
    });

    // Group matches by date and stage
    const groupedMatches = filteredMatches.reduce((acc: Record<string, Record<string, Match[]>>, match) => {
        const date = match.match_date || "TBD";

        // Determine stage label
        let stageLabel = "";
        if (match.stage === 'round_of_16') stageLabel = tBracket("round_of_16");
        else if (match.stage === 'quarter_final') stageLabel = tBracket("quarter_final");
        else if (match.stage === 'semi_final') stageLabel = tBracket("semi_final");
        else if (match.stage === 'final') stageLabel = tBracket("final");
        else if (match.stage === 'group') stageLabel = tMatch("group");
        else stageLabel = match.stage?.replace('_', ' ').toUpperCase() || "UNKNOWN";

        if (!acc[date]) acc[date] = {};
        if (!acc[date][stageLabel]) acc[date][stageLabel] = [];
        acc[date][stageLabel].push(match);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedMatches)
        .sort((a, b) => {
            if (a === "TBD") return 1;
            if (b === "TBD") return -1;
            return new Date(a).getTime() - new Date(b).getTime(); // Chronological for manager
        });

    return (
        <div>
            {matches.length === 0 ? (
                <EmptyState
                    icon={CalendarIcon}
                    title={tFixtures("ready_to_start")}
                    description={tFixtures("generate_instruction")}
                    className="py-24 border border-dashed"
                />
            ) : (
                <div id="fixtures-canvas" className="space-y-1 md:space-y-2">
                    {filteredMatches.length === 0 ? (
                        <EmptyState
                            title="NO MATCHES FOUND"
                            description="Adjust your filters or select a different date to see more fixtures."
                            icon={CalendarIcon}
                        />
                    ) : (
                        sortedDates.map(date => (
                            <div key={date} className="space-y-1 md:space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Date Header */}
                                {date !== "TBD" && (
                                    <div className="flex items-center gap-1 md:gap-2">
                                        <h2 className="text-base md:text-xl font-black tracking-tighter text-foreground">
                                            {formatDate(date, "EEEE, d MMM yyyy", locale)}
                                        </h2>
                                    </div>
                                )}

                                <div className="space-y-1 md:space-y-2">
                                    {Object.entries(groupedMatches[date]).map(([stageLabel, stageMatches]) => (
                                        <div key={stageLabel} className="space-y-1 md:space-y-2">
                                            {/* Stage Header */}
                                            <div className="flex items-center gap-1 md:gap-2 group/stage">
                                                <div className="h-px flex-1 bg-border" />
                                                <div className="flex flex-col">
                                                    <h4 className="text-lg font-black tracking-tight text-primary">
                                                        {stageLabel}
                                                    </h4>
                                                </div>
                                                <div className="h-px flex-1 bg-border" />
                                            </div>

                                            <div className="grid grid-cols-1 gap-1 md:gap-2">
                                                {stageMatches
                                                    .sort((a, b) => (a.match_time || "") > (b.match_time || "") ? 1 : -1)
                                                    .map((match) => (
                                                        <div key={match.id} className="relative group overflow-hidden">
                                                            <MatchCard
                                                                match={match}
                                                                tournamentId={tournamentId}
                                                                isEditMode={false}
                                                                isPublic={isPublic}
                                                                teams={teams}
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
