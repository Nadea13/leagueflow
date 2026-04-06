"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Match, Team } from "@/types/index";
import { MatchCard } from "@/components/tournaments/match-card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { deleteMatch, advanceStage } from "@/app/[locale]/organizer/tournaments/[id]/actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, ArrowRight } from "lucide-react";
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
    const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);

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
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 border border-white/5 group relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1 h-0 bg-secondary group-hover:h-full transition-all duration-500" />
                    <div className="h-16 w-16 rounded-none bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-secondary/30 transition-colors">
                        <Calendar className="h-8 w-8 text-muted-foreground/40 group-hover:text-secondary transition-colors" />
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground mb-2">{tFixtures("ready_to_start")}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 max-w-xs leading-relaxed">
                        {tFixtures("generate_instruction")}
                    </p>
                </div>
            ) : (
                <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-3 bg-white/5 p-4 md:p-6 border border-white/5">
                    {/* Filter Area */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{tMatch("status")}</Label>
                            <Select value={filterStage} onValueChange={setFilterStage}>
                                <SelectTrigger className="h-10 w-[200px] bg-[#0A0A0A] border-white/10 rounded-none focus:ring-secondary/50 font-bold uppercase italic tracking-tighter text-xs">
                                    <SelectValue placeholder={tMatch("round")} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#111] border-white/10 rounded-none">
                                    <SelectItem value="all" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("round")} ({tMatch("all")})</SelectItem>
                                    <SelectItem value="group" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("group")}</SelectItem>
                                    <SelectItem value="Group A" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("group")} A</SelectItem>
                                    <SelectItem value="Group B" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("group")} B</SelectItem>
                                    <SelectItem value="Group C" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("group")} C</SelectItem>
                                    <SelectItem value="Group D" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("group")} D</SelectItem>
                                    <SelectItem value="round_of_16" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("round_of_16")}</SelectItem>
                                    <SelectItem value="quarter_final" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("quarter_final")}</SelectItem>
                                    <SelectItem value="semi_final" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("semi_final")}</SelectItem>
                                    <SelectItem value="final" className="hover:bg-white/5 focus:bg-white/5 uppercase italic font-bold text-xs">{tMatch("final")}</SelectItem>
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
                        <ExportToImageButton 
                            targetId="fixtures-canvas" 
                            filename="fixtures" 
                            label={t("export") || "Export"}
                        />
                    </div>
                </div>

            <div id="fixtures-canvas" className="space-y-4 md:space-y-6">
                {filteredMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 border border-white/5">
                        <Calendar className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-muted-foreground/40">{tFixtures("no_fixtures")}</h3>
                    </div>
                ) : (
                    (() => {
                        const groups = filteredMatches.reduce((acc: Record<string, Match[]>, match) => {
                            const isKnockout = match.stage !== 'group' && match.stage !== 'league';
                            const key = isKnockout ? match.stage : 'group_stage';
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(match);
                            return acc;
                        }, {});

                        const sortedKeys = Object.keys(groups).sort((a, b) => {
                            if (a === 'group_stage') return -1;
                            if (b === 'group_stage') return 1;
                            
                            const aRound = groups[a][0].round || 0;
                            const bRound = groups[b][0].round || 0;
                            return aRound - bRound;
                        });

                        return sortedKeys.map((key) => {
                            const stageMatches = groups[key];
                            const firstMatch = stageMatches[0];
                            const stage = firstMatch.stage;
                            
                            let headerText = "";
                            if (key === 'group_stage') {
                                headerText = "";
                            } else {
                                if (stage === 'round_of_16') headerText = tBracket("round_of_16");
                                else if (stage === 'quarter_final') headerText = tBracket("quarter_final");
                                else if (stage === 'semi_final') headerText = tBracket("semi_final");
                                else if (stage === 'final') headerText = tBracket("final");
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
                                                if (a.match_date !== b.match_date) return (a.match_date || "") > (b.match_date || "") ? 1 : -1;
                                                if (a.match_time !== b.match_time) return (a.match_time || "") > (b.match_time || "") ? 1 : -1;
                                                return 0;
                                            })
                                            .map((match) => (
                                                <div key={match.id} className="relative group overflow-hidden">
                                                    <MatchCard
                                                        match={match}
                                                        tournamentId={tournamentId}
                                                        goals={goals.filter((g: any) => g.match_id === match.id)}
                                                        isEditMode={isEditMode}
                                                        teams={teams}
                                                        isPro={isPro}
                                                    />
                                                </div>
                                            ))
                                        }
                                    </div>
                                    
                                    {/* Proceed to Knockout Button - Styled for Sidebar potentially, but keep here for now if matches are listed */}
                                    {key === 'group_stage' && matches.some(m => m.stage === 'group') && !matches.some(m => m.stage !== 'group' && m.stage !== 'league') && (
                                        <div className="flex justify-center pt-4 md:pt-6">
                                            <Button
                                                onClick={() => setAdvanceDialogOpen(true)}
                                                disabled={isAdvancing}
                                                className="h-14 px-4 md:px-6 bg-secondary text-secondary-foreground font-black uppercase italic tracking-tighter hover:bg-secondary/90 shadow-lg shadow-secondary/10 group transition-all"
                                            >
                                                {isAdvancing ? tFixtures("generating") : (
                                                    <span className="flex items-center gap-3">
                                                        {tFixtures("proceed_knockout")} 
                                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                )}
                                            </Button>
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
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                            <ArrowRight className="h-5 w-5 text-secondary" />
                            {tFixtures("proceed_knockout")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {tFixtures("confirm_advance_knockout")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
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
