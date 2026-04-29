"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Match, Team } from "@/types/index";
import { MatchCard } from "@/components/tournaments/matches/match-card";
import { MatchGenerator } from "@/components/tournaments/matches/match-generator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { advanceStage } from "@/actions/organizer/tournaments/general";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FixturesManagerProps {
    teams: Team[];
    matches: Match[];
    tournamentId: string;
    format?: string;
    isPro?: boolean;
    hideControls?: boolean;
}

export function MatchManager({ matches, teams, tournamentId, format, hideControls = false }: FixturesManagerProps) {
    const t = useTranslations("Tournament");
    const tMatch = useTranslations("Match");
    const tFixtures = useTranslations("Fixtures");
    const tBracket = useTranslations("Bracket");
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterStage, setFilterStage] = useState<string>("all");
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);

    // ... (removed maxGroupRound as unused)

    // Filter Logic
    const filteredMatches = matches.filter(match => {
        // Stage Filter
        if (filterStage === "all") return true;
        if (filterStage.startsWith("Group")) {
            const groupLetter = filterStage.split(" ")[1];
            if (match.stage !== 'group') return false;
            const homeGroup = teams.find(t => t.id === match.home_team_id)?.group_name;
            const awayGroup = teams.find(t => t.id === match.away_team_id)?.group_name;
            return homeGroup === groupLetter || awayGroup === groupLetter;
        }
        return match.stage === filterStage;
    });

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    // Auto-expand first date if nothing is expanded
    useEffect(() => {
        if (expandedDates.size === 0 && filteredMatches.length > 0) {
            const firstDate = filteredMatches.sort((a, b) => (a.match_date || "") > (b.match_date || "") ? 1 : -1)[0].match_date;
            if (firstDate) setExpandedDates(new Set([firstDate]));
        }
    }, [filteredMatches, expandedDates.size]);



    // ... (removed handleDelete as unused)

    const handleAdvance = async () => {
        setAdvanceDialogOpen(false);
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
        <div className="space-y-4 md:space-y-6">
            {matches.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title={tFixtures("ready_to_start")}
                    description={tFixtures("generate_instruction")}
                    className="py-12 border"
                    action={!hideControls && (
                        <MatchGenerator
                            tournamentId={tournamentId}
                            hasFixtures={false}
                            format={format}
                            className="h-10 w-auto px-10"
                        />
                    )}
                />
            ) : (
                <>
                    {!hideControls && (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-3 bg-card p-2 md:p-3 border">
                            {/* Filter Area */}
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{tMatch("status")}</Label>
                                    <Select value={filterStage} onValueChange={setFilterStage}>
                                        <SelectTrigger className="h-10 w-[200px] bg-card border-foreground/10 rounded-none focus:ring-secondary/50 font-bold uppercase tracking-tighter text-xs">
                                            <SelectValue placeholder={tMatch("round")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-foreground/10 rounded-none">
                                            <SelectItem value="all" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("round")} ({tMatch("all")})</SelectItem>
                                            <SelectItem value="group" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("group")}</SelectItem>
                                            <SelectItem value="Group A" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("group")} A</SelectItem>
                                            <SelectItem value="Group B" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("group")} B</SelectItem>
                                            <SelectItem value="Group C" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("group")} C</SelectItem>
                                            <SelectItem value="Group D" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("group")} D</SelectItem>
                                            <SelectItem value="round_of_16" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("round_of_16")}</SelectItem>
                                            <SelectItem value="quarter_final" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("quarter_final")}</SelectItem>
                                            <SelectItem value="semi_final" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("semi_final")}</SelectItem>
                                            <SelectItem value="final" className="hover:bg-foreground/5 focus:bg-foreground/5 uppercase font-bold text-xs">{tMatch("final")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <Switch
                                        id="edit-mode"
                                        checked={isEditMode}
                                        onCheckedChange={setIsEditMode}
                                        className="data-[state=checked]:bg-secondary"
                                    />
                                    <Label htmlFor="edit-mode" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer">
                                        {t("edit_mode") || "Edit Mode"}
                                    </Label>
                                </div>
                                <MatchGenerator
                                    tournamentId={tournamentId}
                                    hasFixtures={matches.length > 0}
                                    format={format}
                                    className="h-10 w-auto px-4 text-[11px]"
                                />
                                <Button
                                    onClick={() => setAdvanceDialogOpen(true)}
                                    disabled={isAdvancing}
                                    className="h-10 px-4 bg-secondary text-secondary-foreground font-black uppercase tracking-tighter hover:bg-secondary/90 transition-all text-[11px]"
                                >
                                    {isAdvancing ? tFixtures("generating") : (
                                        <span className="flex items-center gap-2">
                                            <ArrowRight className="h-3.5 w-3.5" />
                                            <span className="hidden md:inline">{tFixtures("proceed_knockout")}</span>
                                        </span>
                                    )}
                                </Button>
                                <ExportToImageButton
                                    targetId="fixtures-canvas"
                                    filename="fixtures"
                                    label={t("export") || "Export"}
                                />
                            </div>
                        </div>
                    )}

                    <div id="fixtures-canvas" className="space-y-4 md:space-y-6">
                        {filteredMatches.length === 0 ? (
                            <EmptyState
                                icon={Calendar}
                                title={tFixtures("no_fixtures")}
                                description="No fixtures found for the selected filter"
                                className="py-10 border"
                            />
                        ) : (
                            (() => {
                                // Group by Date first
                                const dateGroups = filteredMatches.reduce((acc: Record<string, Match[]>, match) => {
                                    const dateKey = match.match_date || "tbd";
                                    if (!acc[dateKey]) acc[dateKey] = [];
                                    acc[dateKey].push(match);
                                    return acc;
                                }, {});

                                const sortedDates = Object.keys(dateGroups).sort();

                                return sortedDates.map((dateKey) => {
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
                                        const order = ['group', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];
                                        return order.indexOf(a) - order.indexOf(b);
                                    });

                                    return (
                                        <div key={dateKey} className="space-y-0 border border-foreground/5 overflow-hidden">
                                            {/* Date Header / Dropdown Toggle */}
                                            <button
                                                onClick={() => toggleDate(dateKey)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="h-4 w-4 text-secondary/70" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                                        {dateKey === "tbd" ? tMatch("tbd") : new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground/40 ml-2">
                                                        ({dayMatches.length} {tFixtures("matches") || "Matches"})
                                                    </span>
                                                </div>
                                                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
                                            </button>

                                            {/* Collapsible Content */}
                                            {isExpanded && (
                                                <div className="divide-y divide-foreground/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {sortedStages.map((stageKey) => {
                                                        const stageMatches = stageGroups[stageKey];
                                                        
                                                        // Determine stage label
                                                        let stageLabel = "";
                                                        if (stageKey === 'round_of_16') stageLabel = tBracket("round_of_16");
                                                        else if (stageKey === 'quarter_final') stageLabel = tBracket("quarter_final");
                                                        else if (stageKey === 'semi_final') stageLabel = tBracket("semi_final");
                                                        else if (stageKey === 'final') stageLabel = tBracket("final");
                                                        else if (stageKey === 'group') stageLabel = tMatch("group");
                                                        else stageLabel = stageKey.replace('_', ' ').toUpperCase();

                                                        return (
                                                            <div key={stageKey} className="space-y-0">
                                                                {/* Only show stage header if there are multiple stages on this day OR it's not the default 'group' */}
                                                                {(sortedStages.length > 1) && (
                                                                    <div className="px-4 py-2 bg-foreground/[0.01] border-b border-foreground/5">
                                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary/60">
                                                                            {stageLabel}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="divide-y divide-foreground/5">
                                                                    {stageMatches
                                                                        .sort((a, b) => (a.match_time || "") > (b.match_time || "") ? 1 : -1)
                                                                        .map((match) => (
                                                                            <MatchCard
                                                                                key={match.id}
                                                                                match={match}
                                                                                tournamentId={tournamentId}
                                                                                isEditMode={isEditMode}
                                                                                teams={teams}
                                                                            />
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                </>
            )}

            <AlertDialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
                <AlertDialogContent className="bg-card border rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2">
                            <ArrowRight className="h-5 w-5 text-secondary" />
                            {tFixtures("proceed_knockout")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {tFixtures("confirm_advance_knockout")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                            {t("cancel") || "Cancel"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleAdvance();
                            }}
                            className="rounded-none border border-secondary/20 bg-secondary/90 text-secondary-foreground hover:bg-secondary hover:shadow-[0_0_15_rgba(0,255,157,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
                        >
                            <ArrowRight className="h-3.5 w-3.5 mr-2" />
                            {tFixtures("proceed") || "Proceed"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
