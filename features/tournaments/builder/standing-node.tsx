"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Trash2, ListOrdered, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Match, TournamentTeam } from "@/types";

interface CalculatedStanding {
    name: string;
    mp: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
    form: string[];
    nextMatch?: string;
}

export interface StandingNodeData {
    label: string;
    sourceGroupId?: string;
    teamCount?: number;
    teams?: string[];
    showPlayed?: boolean;
    showWin?: boolean;
    showDraw?: boolean;
    showLoss?: boolean;
    showGF?: boolean;
    showGA?: boolean;
    showGD?: boolean;
    showPts?: boolean;
    showForm?: boolean;
    showNextMatch?: boolean;
    [key: string]: unknown;
}

export const StandingNode = memo(({
    id,
    data,
    selected,
}: NodeProps<Node<StandingNodeData>>) => {
    const edges = useBracketStore((state) => state.edges);
    const nodes = useBracketStore((state) => state.nodes);
    const deleteNode = useBracketStore((state) => state.deleteNode);
    const updateNodeData = useBracketStore((state) => state.updateNodeData);
    const storeTeams = useBracketStore((state) => state.teams);
    const params = useParams();
    const tournamentId = params.id as string;
    const supabase = createClient();

    const [loading, setLoading] = React.useState(true);
    const [standings, setStandings] = React.useState<CalculatedStanding[]>([]);

    // Find the source group node if connected
    const sourceEdge = edges.find(e => e.target === id && e.targetHandle === 'in');
    const sourceGroupNode = sourceEdge ? nodes.find(n => n.id === sourceEdge.source) : null;

    const effectiveTeams = React.useMemo(() => {
        if (!sourceGroupNode || sourceGroupNode.type !== 'groupNode') {
            return (Array.isArray(data.teams) ? data.teams : []).filter(name => name && name !== "TBD");
        }

        const teamCount = (sourceGroupNode.data as { teamCount?: number }).teamCount || 0;
        const staticTeams = (sourceGroupNode.data as { teams?: string[] }).teams || [];

        const resolved = Array.from({ length: teamCount }).map((_, index) => {
            const handleId = `team-in-${index}`;
            const edge = edges.find(e => e.target === sourceGroupNode.id && e.targetHandle === handleId);
            
            if (!edge) return staticTeams[index] || "TBD";

            const sNode = nodes.find(n => n.id === edge.source);
            if (!sNode) return staticTeams[index] || "TBD";

            // Resolve from TeamListNode
            if (sNode.type === 'teamListNode') {
                const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                if (teamIdMatch) {
                    const teamId = teamIdMatch[1];
                    const sTeams = (sNode.data.teams as TournamentTeam[]) || storeTeams;
                    const team = sTeams.find(t => String(t.id) === String(teamId));
                    return team?.name || "TBD";
                }
            }

            // Resolve from Standing/Group (rankings)
            if (sNode.type === 'standingNode' || sNode.type === 'groupNode') {
                const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
                if (rankMatch) {
                    const rankIndex = parseInt(rankMatch[1], 10);
                    const rankings = (sNode.data as { rankings?: string[] }).rankings || [];
                    if (rankings[rankIndex]) return rankings[rankIndex];
                    const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                    return `${rankSuffix} Place (${sNode.data.label})`;
                }
            }


            return staticTeams[index] || `Team ${index + 1}`;
        });

        return resolved.filter(name => name && name !== "TBD");
    }, [sourceGroupNode, edges, nodes, data.teams, storeTeams]);

    const advancingCount = Number(data.advancingCount) || 0;

    const teamsJson = JSON.stringify(effectiveTeams);
    
    React.useEffect(() => {
        async function fetchAndCalculate() {
            if (!tournamentId || effectiveTeams.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch category id first
                const { data: categories, error: catError } = await supabase
                    .from('tournament_categories')
                    .select('id')
                    .eq('tournament_id', tournamentId);

                if (catError) throw catError;
                
                const categoryId = categories?.[0]?.id;
                if (!categoryId) {
                    setLoading(false);
                    return;
                }

                interface DBTeam {
                    name?: string | null;
                    team_id?: string | null;
                    team?: {
                        id: string;
                        name: string;
                    } | null;
                }

                interface DatabaseMatch extends Match {
                    placeholder_home?: string | null;
                    placeholder_away?: string | null;
                }

                // 2. Fetch all matches and tournament teams using category ID
                const [matchesRes, teamsRes] = await Promise.all([
                    supabase.from('matches').select('*').eq('tournament_category_id', categoryId),
                    supabase.from('tournament_teams').select('*, team:teams(id, name)').eq('tournament_category_id', categoryId)
                ]);

                if (matchesRes.error || teamsRes.error) throw matchesRes.error || teamsRes.error;

                const dbMatches = (matchesRes.data || []) as DatabaseMatch[];
                const dbTeams = (teamsRes.data || []) as unknown as DBTeam[];

                // 3. Map IDs to names for easier lookup
                const teamIdToName = new Map<string, string>();
                dbTeams.forEach((t) => {
                    const name = t.team?.name || t.name;
                    if (name && t.team_id) {
                        teamIdToName.set(t.team_id, name);
                    }
                });

                // 4. Initialize stats for all teams in this node
                const statsMap: Record<string, CalculatedStanding> = {};
                effectiveTeams.forEach(name => {
                    statsMap[name] = { 
                        name, 
                        mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] 
                    };
                });

                // 5. Calculate stats from matches
                dbMatches.forEach(m => {
                    const homeName = m.home_team_id ? teamIdToName.get(m.home_team_id) : m.placeholder_home || m.placeholder_a;
                    const awayName = m.away_team_id ? teamIdToName.get(m.away_team_id) : m.placeholder_away || m.placeholder_b;

                    if (!homeName || !awayName) return;

                    const h = statsMap[homeName];
                    const a = statsMap[awayName];

                    if (m.status === 'finished') {
                        if (h && a) {
                            const hScore = typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: number }).total) || 0 : Number(m.home_score) || 0;
                            const aScore = typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: number }).total) || 0 : Number(m.away_score) || 0;

                            h.mp++; a.mp++;
                            h.gf += hScore; h.ga += aScore;
                            a.gf += aScore; a.ga += hScore;

                            if (hScore > aScore) {
                                h.w++; h.pts += 3; h.form.push('W');
                                a.l++; a.form.push('L');
                            } else if (hScore < aScore) {
                                a.w++; a.pts += 3; a.form.push('W');
                                h.l++; h.form.push('L');
                            } else {
                                h.d++; h.pts += 1; h.form.push('D');
                                a.d++; a.pts += 1; a.form.push('D');
                            }
                        }
                    } else if (m.status === 'scheduled') {
                        // Keep track of the earliest next match
                        if (h && !h.nextMatch) h.nextMatch = awayName;
                        if (a && !a.nextMatch) a.nextMatch = homeName;
                    }
                });

                // 6. Finalize GD and Sort
                const result = Object.values(statsMap).map((s: CalculatedStanding) => ({
                    ...s,
                    gd: s.gf - s.ga,
                    form: s.form.slice(-5) // Last 5 matches
                })).sort((a, b) => {
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    if (b.gd !== a.gd) return b.gd - a.gd;
                    return b.gf - a.gf;
                });

                setStandings(result);
                
                // Sync to store for auto-propagation
                updateNodeData(id, { rankings: result.map(s => s.name) });
            } catch (err) {
                console.error("Error calculating standings:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAndCalculate();
    }, [tournamentId, teamsJson, id, effectiveTeams, supabase, updateNodeData]); 

    // Visibility defaults
    const showPlayed = data.showPlayed !== false;
    const showWin = data.showWin !== false;
    const showDraw = data.showDraw !== false;
    const showLoss = data.showLoss !== false;
    const showGF = !!data.showGF;
    const showGA = !!data.showGA;
    const showGD = data.showGD !== false;
    const showPts = data.showPts !== false;
    const showForm = !!data.showForm;
    const showNextMatch = !!data.showNextMatch;

    const displayStandings = React.useMemo(() => {
        if (standings.length > 0) return standings;
        return effectiveTeams.map(name => ({
            name,
            mp: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
            form: [],
        })) as CalculatedStanding[];
    }, [standings, effectiveTeams]);

    return (
        <div
            className={cn(
                "relative border bg-card text-card-foreground transition-all cursor-pointer min-w-[320px] rounded-sm",
                selected
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-border hover:border-emerald-500/50"
            )}
        >
            {/* Input Handle for connection to Group */}
            <Handle
                type="target"
                position={Position.Left}
                id="in"
                className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                style={{ left: "-1px" }}
            />

            <div className="flex justify-between items-center p-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <ListOrdered className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-primary">
                        {data.label}
                    </span>
                    {loading && effectiveTeams.length > 0 && (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                    )}
                </div>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        deleteNode(id);
                    }}
                    className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-[10px] border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border/50">
                            <th className="px-2 py-1.5 text-left font-black text-muted-foreground w-8">#</th>
                            <th className="-1.5 text-left font-black text-muted-foreground min-w-[100px]">TEAM</th>
                            {showPlayed && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">MP</th>}
                            {showWin && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">W</th>}
                            {showDraw && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">D</th>}
                            {showLoss && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">L</th>}
                            {showGF && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">GF</th>}
                            {showGA && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">GA</th>}
                            {showGD && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">GD</th>}
                            {showPts && <th className="px-2 py-1.5 text-center font-black text-foreground w-8">PTS</th>}
                            {showForm && <th className="px-2 py-1.5 text-center font-black text-muted-foreground w-16">FORM</th>}
                            {showNextMatch && <th className="px-2 py-1.5 text-left font-black text-muted-foreground w-20">NEXT</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {effectiveTeams.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-4 text-center text-muted-foreground">
                                    <p className="text-[10px] text-center text-muted-foreground">
                                        Connect to a group node to show standings
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            displayStandings.map((team, index) => {
                                const teamName = team.name;
                                const isPromoted = index < advancingCount;

                                return (
                                    <tr key={teamName} className="hover:bg-emerald-500/5 transition-colors group/row h-10">
                                        <td className="p-2 relative">
                                            <div className={cn(
                                                "w-6 h-6 flex items-center justify-center font-black rounded-full border",
                                                isPromoted ? "border-border text-muted-foreground" : "bg-muted/30 border-border text-muted-foreground"
                                            )}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "font-bold truncate max-w-[120px]",
                                                    teamName === "TBD" ? "text-muted-foreground/30 font-normal" : "text-foreground"
                                                )}>
                                                    {teamName}
                                                </span>
                                            </div>
                                        </td>
                                        {showPlayed && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.mp}</td>}
                                        {showWin && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.w}</td>}
                                        {showDraw && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.d}</td>}
                                        {showLoss && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.l}</td>}
                                        {showGF && <td className="px-1 py-1.5 text-center text-muted-foreground">{team.gf}</td>}
                                        {showGA && <td className="px-1 py-1.5 text-center text-muted-foreground">{team.ga}</td>}
                                        {showGD && <td className="px-1 py-1.5 text-center text-muted-foreground">{team.gd}</td>}
                                        {showPts && <td className="px-2 py-1.5 text-center font-black text-foreground">{team.pts}</td>}
                                        {showForm && (
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {Array.from({ length: 5 }).map((_, i) => {
                                                        const res = team.form[i];
                                                        return (
                                                            <div 
                                                                key={i} 
                                                                className={cn(
                                                                    "w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] font-black text-white transition-all",
                                                                    res === 'W' ? "bg-emerald-500" : 
                                                                    res === 'D' ? "bg-amber-500" : 
                                                                    res === 'L' ? "bg-destructive" : 
                                                                    "bg-muted-foreground/20 border border-muted-foreground/10"
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        )}
                                        {showNextMatch && (
                                            <td className="px-2 py-1.5 text-[9px] font-bold text-primary truncate max-w-[80px]">
                                                {team.nextMatch ? `${team.nextMatch}` : <span className="text-muted-foreground/40 font-normal">None</span>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Advancement Handles (Outside the table) */}
            <div className="absolute top-[68px] right-0 bottom-0 pointer-events-none">
                {displayStandings.map((_, index) => (
                    <div 
                        key={index} 
                        className="relative h-10 w-0 pointer-events-auto"
                    >
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`rank-${index}`}
                            className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                            style={{ right: "-1px", top: "20px" }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

StandingNode.displayName = "StandingNode";
