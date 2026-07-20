"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Match, Team, BracketCanvasData } from "@/types/index";
import { MatchCard } from "@/features/tournaments/matches/match-card";
import { Calendar as CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/date";
import { useBracketStore } from "@/lib/stores/bracket-store";

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
    canvasData?: BracketCanvasData | null;
}

export function MatchManager({
    matches,
    teams,
    tournamentId,
    externalFilterStage = "all",
    externalSelectedDate = null,
    isPublic = false,
    canvasData = null
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
        if (filterStage.toLowerCase() !== "group" && (filterStage.startsWith("Group") || filterStage.toLowerCase().startsWith("group"))) {
            const parts = filterStage.split(" ");
            const groupLetter = parts[parts.length - 1];
            if (match.stage !== 'group') return false;

            // 1. Check if home or away team belongs to this group
            const homeGroup = teams.find(t => t.id === match.home_team_id)?.group_name;
            const awayGroup = teams.find(t => t.id === match.away_team_id)?.group_name;
            if (homeGroup === groupLetter || awayGroup === groupLetter) return true;

            // 2. Check if the match node label contains this group
            let nodeLabel = "";
            if (match.node_id) {
                try {
                    const storeNodes = useBracketStore.getState().nodes;
                    const node = storeNodes.find(n => n.id === match.node_id);
                    if (node?.data?.label) nodeLabel = String(node.data.label);
                } catch {}

                if (!nodeLabel && canvasData?.nodes) {
                    const node = canvasData.nodes.find((n) => n.id === match.node_id);
                    if (node?.data?.label) nodeLabel = String(node.data.label);
                }
            }

            if (nodeLabel) {
                const lowerLabel = nodeLabel.toLowerCase();
                if (lowerLabel.includes(`group ${groupLetter.toLowerCase()}`)) return true;
            }

            return false;
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
        else if (match.stage === 'knockout') stageLabel = locale === 'th' ? "น็อคเอาท์" : "KNOCKOUT";
        else if (match.stage === 'league') stageLabel = locale === 'th' ? "ลีก" : "LEAGUE";
        else stageLabel = match.stage?.replace('_', ' ').toUpperCase() || "UNKNOWN";

        if (!acc[date]) acc[date] = {};
        if (!acc[date][stageLabel]) acc[date][stageLabel] = [];
        acc[date][stageLabel].push(match);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedMatches)
        .sort((a, b) => {
            if (a === "TBD" && b === "TBD") return 0;
            if (a === "TBD") return 1;
            if (b === "TBD") return -1;
            return a.localeCompare(b);
        });

    return (
        <div>
            {matches.length === 0 ? (
                <EmptyState
                    icon={CalendarIcon}
                    title={tFixtures("ready_to_start")}
                    description={tFixtures("generate_instruction")}
                    className="border rounded-sm"
                />
            ) : (
                <div id="fixtures-canvas" className="space-y-1 md:space-y-2">
                    {filteredMatches.length === 0 ? (
                        <EmptyState
                            title={locale === 'th' ? "ไม่พบการแข่งขัน" : "NO MATCHES FOUND"}
                            description={locale === 'th' ? "ปรับการกรองของคุณหรือเลือกวันที่อื่นเพื่อดูข้อมูลการแข่งขันเพิ่มเติม" : "Adjust your filters or select a different date to see more fixtures."}
                            icon={CalendarIcon}
                        />
                    ) : (
                        sortedDates.map(date => (
                            <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                                                canvasData={canvasData}
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
