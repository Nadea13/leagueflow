"use client";

import React from "react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Users, Trophy, Zap, Trash2, ListOrdered, Calendar, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { TournamentTeam } from "@/types";
import { useParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function NodeSettings() {
    const { nodes, edges, updateNodeData, deleteNode } = useBracketStore();
    const params = useParams();
    const tournamentId = params.id as string;
    const selectedNode = nodes.find((node) => node.selected);
    const supabase = createClient();

    const [teams, setTeams] = React.useState<TournamentTeam[]>([]);

    React.useEffect(() => {
        async function fetchTeams() {
            if (!tournamentId) return;
            const { data } = await supabase
                .from("tournament_teams")
                .select("*")
                .eq("tournament_id", tournamentId)
                .order("name");
            if (data) setTeams(data);
        }
        fetchTeams();
    }, [tournamentId]);

    if (!selectedNode) {
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
                const rankings = (sourceNode.data as any).rankings as string[] || [];
                return rankings[rankIndex] || `${rankIndex + 1}st Place (${sourceNode.data.label})`;
            }
        }
        
        // Handle ByeNode propagation
        if (sourceNode.type === 'byeNode') {
            return (sourceNode.data as any).placeholder as string;
        }

        return null;
    };

    return (
        <aside className="w-[512px] border-l bg-card flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-right">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black tracking-widest text-foreground">
                        Node Settings
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNode(id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-4 space-y-6">
                {/* ── Header based on type ── */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-sm border">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        type === 'groupNode' ? 'bg-violet-500' :
                        type === 'matchNode' ? 'bg-primary' : 
                        type === 'standingNode' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>
                        {type === 'groupNode' ? <Users className="h-4 w-4 text-white" /> :
                         type === 'matchNode' ? <Trophy className="h-4 w-4 text-white" /> :
                         type === 'standingNode' ? <ListOrdered className="h-4 w-4 text-white" /> :
                         <Zap className="h-4 w-4 text-white" />}
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
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                            Label
                        </Label>
                        <Input
                            value={data.label as string}
                            onChange={(e) => updateNodeData(id, { label: e.target.value })}
                            className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-primary"
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
                                {((data.matches as any[]) || [])
                                    .slice()
                                    .sort((a, b) => {
                                        const dateA = a.match_date || "9999-12-31";
                                        const timeA = a.match_time || "23:59";
                                        const dateB = b.match_date || "9999-12-31";
                                        const timeB = b.match_time || "23:59";
                                        if (dateA !== dateB) return dateA.localeCompare(dateB);
                                        return timeA.localeCompare(timeB);
                                    })
                                    .map((match, idx, sortedArr) => {
                                        const updateMatch = (updates: any) => {
                                            const originalMatches = [...((data.matches as any[]) || [])];
                                            const matchIdx = originalMatches.findIndex(m => m.id === match.id);
                                            if (matchIdx !== -1) {
                                                originalMatches[matchIdx] = { ...originalMatches[matchIdx], ...updates };
                                                updateNodeData(id, { matches: originalMatches });
                                            }
                                        };

                                        return (
                                            <div key={match.id || idx} className="p-2 bg-muted/30 border rounded-sm space-y-2 relative group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-muted-foreground">Match #{idx + 1}</span>
                                                    {((data.matches as any[]).length > 1) && (
                                                        <button
                                                            onClick={() => {
                                                                const originalMatches = [...((data.matches as any[]) || [])];
                                                                const filtered = originalMatches.filter(m => m.id !== match.id);
                                                                updateNodeData(id, { matches: filtered });
                                                            }}
                                                            className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-muted-foreground">Team A</Label>
                                                        <Select
                                                            value={match.placeholderA}
                                                            onValueChange={(val) => updateMatch({ placeholderA: val })}
                                                        >
                                                            <SelectTrigger className={`h-7 text-[10px] bg-background ${getResolvedTeam(id, `slot-a-${idx}`) ? "text-violet-600 font-black border-violet-200" : ""}`}>
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
                                                        <Label className="text-[9px] font-bold text-muted-foreground">Team B</Label>
                                                        <Select
                                                            value={match.placeholderB}
                                                            onValueChange={(val) => updateMatch({ placeholderB: val })}
                                                        >
                                                            <SelectTrigger className={`h-7 text-[10px] bg-background ${getResolvedTeam(id, `slot-b-${idx}`) ? "text-violet-600 font-black border-violet-200" : ""}`}>
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
                                                        <Label className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="h-2 w-2" /> Date
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={match.match_date || ""}
                                                            onChange={(e) => updateMatch({ match_date: e.target.value })}
                                                            className="h-7 text-[10px] bg-background px-2"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-2 w-2" /> Time
                                                        </Label>
                                                        <Input
                                                            type="time"
                                                            value={match.match_time || ""}
                                                            onChange={(e) => updateMatch({ match_time: e.target.value })}
                                                            className="h-7 text-[10px] bg-background px-2"
                                                        />
                                                    </div>
                                                </div>

                                                {(match.dbId || match.matchId || (type === "matchNode" && data.matchId && idx === 0)) && (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-7 text-[9px] font-black tracking-widest gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-none"
                                                    >
                                                        <Link href={`/organizer/tournaments/${tournamentId}/matches/${match.dbId || match.matchId || data.matchId}`}>
                                                            <ExternalLink className="h-2.5 w-2.5" />
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
                                    className="w-full h-8 text-[10px] font-black tracking-wider gap-2 border-dashed"
                                    onClick={() => {
                                        const next = [...((data.matches as any[]) || [])];
                                        next.push({ id: `m-${Date.now()}-${next.length + 1}`, placeholderA: "TBD", placeholderB: "TBD" });
                                        updateNodeData(id, { matches: next });
                                    }}
                                >
                                    + Add Match to Node
                                </Button>
                            </div>
                        </div>
                    )}

                    {type === "byeNode" && (
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                Team Placeholder
                            </Label>
                            <Input
                                value={getResolvedTeam(id, "team-in") || data.placeholder as string}
                                onChange={(e) => updateNodeData(id, { placeholder: e.target.value })}
                                disabled={!!getResolvedTeam(id, "team-in")}
                                className={`h-8 text-xs font-bold bg-muted/30 focus-visible:ring-amber-500 ${getResolvedTeam(id, "team-in") ? "text-violet-600 border-violet-200 opacity-100" : ""}`}
                            />
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
