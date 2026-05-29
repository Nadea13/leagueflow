"use client";

import React, { useEffect } from "react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, LayoutGrid, Trash2, ListOrdered, ExternalLink, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";

type MatchItem = {
    id: string;
    placeholderA: string;
    placeholderB: string;
    match_date?: string;
    match_time?: string;
    dbId?: string;
    matchId?: string;
};
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Teams } from "@/features/tournaments/teams/team-list";
import { Registrations } from "@/features/tournaments/management/registrations";
import { TeamForm } from "@/features/tournaments/teams/team-form";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

export function NodeSettings() {
    const { nodes, edges, updateNodeData, deleteNode, teams, fetchTeams, activeNodeId, activeCategoryId } = useBracketStore();
    const params = useParams();
    const tournamentId = params.id as string;
    const selectedNode = nodes.find((node) => node.id === activeNodeId);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const t = useTranslations("Team");

    useEffect(() => {
        if (activeCategoryId && selectedNode?.type === "teamListNode") {
            fetchTeams(activeCategoryId);
        }
    }, [activeCategoryId, fetchTeams, selectedNode?.type]);

    if (!selectedNode || !activeNodeId) {
        return null;
    }

    const { id, type, data } = selectedNode;

    // Resolve live teams from edges
    const getResolvedTeam = (targetId: string, handleId: string) => {
        const edge = edges.find(e => e.target === targetId && e.targetHandle === handleId);
        if (!edge) return null;

        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return null;

        // Handle StandingNode propagation
        if (sourceNode.type === 'standingNode') {
            const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
            if (rankMatch) {
                const rankIndex = parseInt(rankMatch[1], 10);
                const rankings = (sourceNode.data as { rankings?: string[] }).rankings || [];
                return rankings[rankIndex] || `${rankIndex + 1}st Place (${sourceNode.data.label})`;
            }
        }
        return null;
    };

    return (
        <aside className="w-[512px] border-l bg-background flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-right">
            <div className="p-2 md:p-4 border-b flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNode(id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                {/* ── Header based on type ── */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${type === 'groupNode' ? 'bg-node-5' :
                        type === 'matchNode' ? 'bg-node-2' :
                            type === 'standingNode' ? 'bg-node-1' :
                                type === 'teamListNode' ? 'bg-node-3' : 'bg-node-4'
                        }`}>
                        {type === 'groupNode' ? <LayoutGrid className="h-4 w-4 text-foreground" /> :
                            type === 'matchNode' ? <span className="text-sm font-bold text-foreground select-none">VS</span> :
                                type === 'standingNode' ? <ListOrdered className="h-4 w-4 text-foreground" /> :
                                    type === 'teamListNode' ? <Users className="h-4 w-4 text-foreground" /> :
                                        <Megaphone className="h-4 w-4 text-foreground" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground leading-none mb-1">
                            {type?.replace('Node', '')}
                        </span>
                        <span className="text-xs font-bold truncate max-w-[140px]">
                            {data.label as string}
                        </span>
                    </div>
                </div>

                {/* ── Common Settings ── */}
                <div className="space-y-2 md:space-y-4">
                    <div className="space-y-1">
                        <Label>
                            Label
                        </Label>
                        <Input
                            value={data.label as string}
                            onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        />
                    </div>

                    {/* ── Type Specific Settings ── */}
                    {type === "groupNode" && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                    Team Count
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={data.teamCount as number}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        updateNodeData(id, { teamCount: parseInt(val, 10) || 0 });
                                    }}
                                    className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-violet-500"
                                />
                            </div>
                        </>
                    )}

                    {type === "standingNode" && (
                        <div className="space-y-4 pt-2 border-t">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                    Advancing Teams
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={data.advancingCount as number || 0}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        const num = parseInt(val, 10) || 0;
                                        updateNodeData(id, { advancingCount: Math.min(16, num) });
                                    }}
                                    className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-emerald-500"
                                />
                                <p className="text-[9px] text-muted-foreground font-medium">Number of teams that move to the next stage.</p>
                            </div>

                            <h4 className="text-[10px] font-black tracking-widest text-muted-foreground">Column Visibility</h4>
                            <div className="grid gap-4">
                                {[
                                    { label: "Matches Played", key: "showPlayed" },
                                    { label: "Win / Draw / Loss", key: "showWDL", composite: ["showWin", "showDraw", "showLoss"] },
                                    { label: "GF / GA", key: "showG", composite: ["showGF", "showGA"], defaultOff: true },
                                    { label: "Goal Difference", key: "showGD" },
                                    { label: "Points", key: "showPts" },
                                    { label: "Form (Last 5)", key: "showForm", defaultOff: true },
                                    { label: "Next Match", key: "showNextMatch", defaultOff: true },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold text-foreground leading-none cursor-pointer" htmlFor={item.key}>
                                            {item.label}
                                        </Label>
                                        <Switch
                                            id={item.key}
                                            checked={item.composite
                                                ? item.composite.every(k => item.defaultOff ? !!data[k] : data[k] !== false)
                                                : item.defaultOff ? !!data[item.key] : data[item.key] !== false
                                            }
                                            onCheckedChange={(checked) => {
                                                if (item.composite) {
                                                    const updates: Record<string, boolean> = {};
                                                    item.composite.forEach(k => updates[k] = checked);
                                                    updateNodeData(id, updates);
                                                } else {
                                                    updateNodeData(id, { [item.key]: checked });
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {type === "matchNode" && (
                        <div className="space-y-4 pt-2 border-t">
                            <h4 className="text-[10px] font-black tracking-widest text-muted-foreground">Matches in Node</h4>
                            <div className="space-y-3">
                                {((data.matches as MatchItem[]) || [])
                                    .slice()
                                    .sort((a, b) => {
                                        const dateA = a.match_date || "9999-12-31";
                                        const timeA = a.match_time || "23:59";
                                        const dateB = b.match_date || "9999-12-31";
                                        const timeB = b.match_time || "23:59";
                                        if (dateA !== dateB) return dateA.localeCompare(dateB);
                                        return timeA.localeCompare(timeB);
                                    })
                                    .map((match, idx) => {
                                        const updateMatch = (updates: Partial<MatchItem>) => {
                                            const originalMatches = [...((data.matches as MatchItem[]) || [])];
                                            const matchIdx = originalMatches.findIndex(m => m.id === match.id);
                                            if (matchIdx !== -1) {
                                                originalMatches[matchIdx] = { ...originalMatches[matchIdx], ...updates };
                                                updateNodeData(id, { matches: originalMatches });
                                            }
                                        };

                                        return (
                                            <div key={match.id || idx} className="p-2 bg-card border rounded-lg space-y-2 relative group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-muted-foreground">Match #{idx + 1}</span>
                                                    {((data.matches as MatchItem[]).length > 1) && (
                                                        <button
                                                            onClick={() => {
                                                                const originalMatches = [...((data.matches as MatchItem[]) || [])];
                                                                const filtered = originalMatches.filter(m => m.id !== match.id);
                                                                updateNodeData(id, { matches: filtered });
                                                            }}
                                                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Home Team</Label>
                                                        <Select
                                                            value={match.placeholderA}
                                                            onValueChange={(val) => updateMatch({ placeholderA: val })}
                                                        >
                                                            <SelectTrigger className={`bg-card w-full ${getResolvedTeam(id, `slot-a-${idx}`) ? "text-violet-600 font-black border-violet-200" : ""}`}>
                                                                <SelectValue placeholder="Select Team" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="TBD">TBD</SelectItem>
                                                                {getResolvedTeam(id, `slot-a-${idx}`) && (
                                                                    <SelectItem value={getResolvedTeam(id, `slot-a-${idx}`) || ""} disabled>
                                                                        {getResolvedTeam(id, `slot-a-${idx}`)} (Live)
                                                                    </SelectItem>
                                                                )}
                                                                {teams.map(t => (
                                                                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Away Team</Label>
                                                        <Select
                                                            value={match.placeholderB}
                                                            onValueChange={(val) => updateMatch({ placeholderB: val })}
                                                        >
                                                            <SelectTrigger className={`bg-card w-full ${getResolvedTeam(id, `slot-b-${idx}`) ? "text-violet-600 font-black border-violet-200" : ""}`}>
                                                                <SelectValue placeholder="Select Team" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="TBD">TBD</SelectItem>
                                                                {getResolvedTeam(id, `slot-b-${idx}`) && (
                                                                    <SelectItem value={getResolvedTeam(id, `slot-b-${idx}`) || ""} disabled>
                                                                        {getResolvedTeam(id, `slot-b-${idx}`)} (Live)
                                                                    </SelectItem>
                                                                )}
                                                                {teams.map(t => (
                                                                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Date</Label>
                                                        <Input
                                                            type="date"
                                                            value={match.match_date || ""}
                                                            onChange={(e) => updateMatch({ match_date: e.target.value })}
                                                            className="bg-card"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Time</Label>
                                                        <Input
                                                            type="time"
                                                            value={match.match_time || ""}
                                                            onChange={(e) => updateMatch({ match_time: e.target.value })}
                                                            className="bg-card"
                                                        />
                                                    </div>
                                                </div>

                                                {(match.dbId || match.matchId || (type === "matchNode" && !!data.matchId && idx === 0)) && (
                                                    <Button
                                                        asChild
                                                        variant="default"
                                                        size="sm"
                                                        className="w-full"
                                                    >
                                                        <Link href={`/dashboard/tournaments/${tournamentId}/matches/${match.dbId || match.matchId || (data.matchId as string)}`}>
                                                            MATCH CONSOLE
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        const next = [...((data.matches as MatchItem[]) || [])];
                                        next.push({ id: `m-${Date.now()}-${next.length + 1}`, placeholderA: "TBD", placeholderB: "TBD" });
                                        updateNodeData(id, { matches: next });
                                    }}
                                >
                                    Add Match to Node
                                </Button>
                            </div>
                        </div>
                    )}


                    {type === "teamListNode" && (
                        <div className="space-y-2 md:space-y-3">
                            <div className="space-y-2 md:space-y-3">
                                <div className="flex flex-col gap-1">
                                    <h4 className="text-[10px] font-black tracking-widest text-amber-500 flex items-center gap-2">
                                        <ExternalLink className="h-3 w-3" />
                                        Tournament Registrations
                                    </h4>
                                </div>
                                <div className="custom-scrollbar">
                                    <Registrations tournamentId={tournamentId} />
                                </div>
                            </div>

                            <div className="space-y-2 md:space-y-3 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black tracking-widest text-primary flex items-center gap-2">
                                        <Users className="h-3 w-3" />
                                        {t("participating_teams")}
                                    </h4>

                                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-[9px] font-black tracking-widest border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1" />
                                                {t("add_team_button") || "Add Team"}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[500px] rounded-lg p-0">
                                            <DialogHeader className="p-2 md:p-4 border-b ">
                                                <DialogTitle className="text-xl font-black tracking-tighter">{t("add_team")}</DialogTitle>
                                            </DialogHeader>
                                            <TeamForm
                                                tournamentId={tournamentId}
                                                tournamentCategoryId={activeCategoryId || undefined}
                                                isLimitReached={false}
                                                onSuccess={() => {
                                                    setIsAddDialogOpen(false);
                                                    if (activeCategoryId) {
                                                        fetchTeams(activeCategoryId);
                                                    }
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="custom-scrollbar max-h-[400px]">
                                    <Teams
                                        teams={teams}
                                        tournamentId={tournamentId}
                                        isPro={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto p-4 border-t bg-muted/10">
                <p className="text-[9px] text-muted-foreground font-bold leading-relaxed">
                    ID: {id}
                </p>
            </div>
        </aside>
    );
}
