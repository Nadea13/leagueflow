"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Match, Team } from "@/types/index";
import { MatchCard } from "@/components/tournaments/match-card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MatchDialog } from "@/components/tournaments/match-dialog";
import { deleteMatch, advanceStage } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";

interface FixturesManagerProps {
    teams: Team[];
    matches: Match[];
    tournamentId: string;
    goals?: any[]; // Using any[] or Goal[] if imported
    format?: string;
    isPro?: boolean;
}

export function FixturesManager({ matches, teams, tournamentId, format, goals = [], isPro = false }: FixturesManagerProps) {
    const t = useTranslations("Tournament");
    const tMatch = useTranslations("Match");
    const tFixtures = useTranslations("Fixtures");
    const tBracket = useTranslations("Bracket");
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterRound, setFilterRound] = useState<string>("all");
    const [filterStage, setFilterStage] = useState<string>("all");
    const [isAdvancing, setIsAdvancing] = useState(false);

    // Calculate Max Group Round
    const maxGroupRound = matches.reduce((max, m) => {
        if (m.stage === 'group' && (m.round || 0) > max) return m.round || 0;
        return max;
    }, 0);

    // Filter Logic
    const filteredMatches = matches.filter(match => {
        if (filterStage === "all") return true;

        if (filterStage.startsWith("Group")) {
            const groupLetter = filterStage.split(" ")[1];
            // Match must be in 'group' stage AND involve a team from that group (or both)
            if (match.stage !== 'group') return false;

            const homeGroup = teams.find(t => t.id === match.home_team_id)?.group_name;
            const awayGroup = teams.find(t => t.id === match.away_team_id)?.group_name;

            return homeGroup === groupLetter || awayGroup === groupLetter;
        }

        return match.stage === filterStage;
    });

    // Group matches by round
    const matchesByRound = (filteredMatches || []).reduce((acc: Record<number, Match[]>, match: Match) => {
        const round = match.round;
        if (!acc[round]) {
            acc[round] = [];
        }
        acc[round].push(match);
        return acc;
    }, {});

    const handleDelete = async (matchId: string) => {
        if (confirm(tFixtures("confirm_delete_match"))) {
            await deleteMatch(matchId, tournamentId);
        }
    };

    const handleAdvance = async () => {
        if (!confirm(tFixtures("confirm_advance_knockout"))) return;

        setIsAdvancing(true);
        try {
            const result = await advanceStage(tournamentId);
            if (!result.success) {
                alert(result.error); // Or toast.error
            } else {
                // Success - UI will update via server action revalidate
            }
        } catch (error) {
            console.error(error);
            alert("Failed to advance stage");
        } finally {
            setIsAdvancing(false);
        }
    };

    return (
        <div className="space-y-6">
            {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                    <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">{tFixtures("ready_to_start")}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {tFixtures("generate_instruction")}
                    </p>
                </div>
            ) : (

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 rounded-none">
                    {/* Filter */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-medium">{tMatch("status")}:</span>
                        <Select value={filterStage} onValueChange={setFilterStage}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={tMatch("round")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{tMatch("round")} ({tMatch("all")})</SelectItem>
                                <SelectItem value="group">{tMatch("group")}</SelectItem>
                                <SelectItem value="Group A">{tMatch("group")} A</SelectItem>
                                <SelectItem value="Group B">{tMatch("group")} B</SelectItem>
                                <SelectItem value="Group C">{tMatch("group")} C</SelectItem>
                                <SelectItem value="Group D">{tMatch("group")} D</SelectItem>
                                <SelectItem value="round_of_16">{tMatch("round_of_16")}</SelectItem>
                                <SelectItem value="quarter_final">{tMatch("quarter_final")}</SelectItem>
                                <SelectItem value="semi_final">{tMatch("semi_final")}</SelectItem>
                                <SelectItem value="final">{tMatch("final")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                            <Label htmlFor="edit-mode" className="font-semibold">{t("edit_mode") || "Edit Mode"}</Label>
                        </div>
                        <ExportToImageButton targetId="fixtures-canvas" filename="fixtures" label={t("export") || "Export"} />
                    </div>
                </div>
            )}


            <div id="fixtures-canvas" className="space-y-6 rounded-none">
                {Object.keys(matchesByRound).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                        <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                            <Calendar className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground">{tFixtures("no_fixtures")}</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            No match data available at this time.
                        </p>
                    </div>
                ) : (
                    Object.keys(matchesByRound).map((roundKey) => {
                        const round = Number(roundKey);
                        const firstMatch = matchesByRound[round][0];
                        const stage = firstMatch?.stage;

                        let headerText = `${tMatch("round")} ${round}`;
                        if (stage === 'league' || stage === 'group') {
                            headerText = `${tFixtures("match_day")} ${round}`;
                        } else if (stage === 'round_of_16') {
                            headerText = tBracket("round_of_16");
                        } else if (stage === 'quarter_final') {
                            headerText = tBracket("quarter_final");
                        } else if (stage === 'semi_final') {
                            headerText = tBracket("semi_final");
                        } else if (stage === 'final') {
                            headerText = tBracket("final");
                        }

                        return (
                            <div key={round} className="rounded-none relative bg-card">
                                <h3 className="font-semibold leading-none tracking-tight mb-4 flex items-center gap-2">
                                    {headerText}
                                    {stage !== 'league' && stage !== 'group' && (
                                        <span className="text-xs font-normal text-muted-foreground border px-2 py-0.5 rounded-none capitalize">
                                            {stage?.replace('_', ' ')}
                                        </span>
                                    )}
                                </h3>
                                <div className="grid gap-2">
                                    {matchesByRound[round].map((match) => (
                                        <div key={match.id} className="relative group">
                                            <MatchCard
                                                match={match}
                                                tournamentId={tournamentId}
                                                goals={goals.filter((g: any) => g.match_id === match.id)}
                                                isEditMode={isEditMode}
                                                teams={teams}
                                                isPro={isPro}
                                            />


                                        </div>
                                    ))}
                                </div>

                                {/* Add Match to specific round */}
                                {/* Add Match to specific round */}
                                {/* {isEditMode && (
                                <div className="mt-4 flex justify-center">
                                    <MatchDialog
                                        tournamentId={tournamentId}
                                        teams={teams}
                                        defaultRound={round}
                                        trigger={
                                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                                + Add Match to Round {round}
                                            </Button>
                                        }
                                    />
                                </div>
                            )} */}

                                {/* Proceed to Knockout Button - Only show on Max Group Round */}
                                {round === maxGroupRound && stage === 'group' && (
                                    <div className="mt-6">
                                        <Button
                                            onClick={handleAdvance}
                                            disabled={isAdvancing}
                                            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
                                        >
                                            {isAdvancing ? tFixtures("generating") : (
                                                <>
                                                    {tFixtures("proceed_knockout")} <ArrowRight className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
