"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { ListOrdered, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Match, TournamentTeam } from "@/types";

export interface CalculatedVolleyballStanding {
    name: string;
    mp: number;
    w: number;
    l: number;
    sw: number; // Sets won
    sl: number; // Sets lost
    sd: number; // Set difference
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
    showLoss?: boolean;
    showSW?: boolean;
    showSL?: boolean;
    showSD?: boolean;
    showPts?: boolean;
    showForm?: boolean;
    showNextMatch?: boolean;
    [key: string]: unknown;
}

export const VolleyballStandingNode = memo(({
    id,
    data,
    selected,
}: NodeProps<Node<StandingNodeData>>) => {
    const edges = useBracketStore((state) => state.edges);
    const nodes = useBracketStore((state) => state.nodes);
    const updateNodeData = useBracketStore((state) => state.updateNodeData);
    const storeTeams = useBracketStore((state) => state.teams);
    const params = useParams();
    const tournamentId = params.id as string;
    const supabase = createClient();

    const [loading, setLoading] = React.useState(true);
    const [standings, setStandings] = React.useState<CalculatedVolleyballStanding[]>([]);

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

            if (sNode.type === 'teamListNode') {
                const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                if (teamIdMatch) {
                    const teamId = teamIdMatch[1];
                    const sTeams = (sNode.data.teams as TournamentTeam[]) || storeTeams;
                    const team = sTeams.find(t => String(t.id) === String(teamId));
                    return team?.name || "TBD";
                }
            }

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

        return resolved.filter(name => name);
    }, [sourceGroupNode, edges, nodes, data.teams, storeTeams]);

    const activeCategoryId = useBracketStore((state) => state.activeCategoryId);
    const advancingCount = Number(data.advancingCount) || 0;
    const teamsJson = JSON.stringify(effectiveTeams);

    React.useEffect(() => {
        async function fetchAndCalculate() {
            if (!tournamentId || effectiveTeams.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const categoryId = activeCategoryId;
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

                const [matchesRes, teamsRes] = await Promise.all([
                    supabase.from('matches').select('*').eq('tournament_category_id', categoryId).is('deleted_at', null),
                    supabase.from('tournament_teams').select('*, team:teams(id, name)').eq('tournament_category_id', categoryId).is('deleted_at', null)
                ]);

                if (matchesRes.error || teamsRes.error) throw matchesRes.error || teamsRes.error;

                const dbMatches = (matchesRes.data || []) as DatabaseMatch[];
                const dbTeams = (teamsRes.data || []) as unknown as DBTeam[];

                const teamIdToName = new Map<string, string>();
                dbTeams.forEach((t) => {
                    const name = t.team?.name || t.name;
                    if (name && t.team_id) {
                        teamIdToName.set(t.team_id, name);
                    }
                });

                const statsMap: Record<string, CalculatedVolleyballStanding> = {};
                effectiveTeams.forEach((name, index) => {
                    const key = name === "TBD" ? `TBD-${index}` : name;
                    statsMap[key] = {
                        name,
                        mp: 0, w: 0, l: 0, sw: 0, sl: 0, sd: 0, pts: 0, form: []
                    };
                });

                dbMatches.forEach(m => {
                    const homeName = m.home_team_id ? teamIdToName.get(m.home_team_id) : m.placeholder_home || m.placeholder_a;
                    const awayName = m.away_team_id ? teamIdToName.get(m.away_team_id) : m.placeholder_away || m.placeholder_b;

                    if (!homeName || !awayName) return;

                    const h = statsMap[homeName];
                    const a = statsMap[awayName];

                    if (m.status === 'finished' || m.status === 'live') {
                        if (h && a) {
                            const hScore = typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: number }).total) || 0 : Number(m.home_score) || 0;
                            const aScore = typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: number }).total) || 0 : Number(m.away_score) || 0;

                            h.mp++; a.mp++;
                            h.sw += hScore; h.sl += aScore;
                            a.sw += aScore; a.sl += hScore;

                            if (hScore > aScore) {
                                h.w++; a.l++;
                                h.form.push('W'); a.form.push('L');
                                const diff = hScore - aScore;
                                if (diff >= 2) {
                                    h.pts += 3;
                                } else {
                                    h.pts += 2;
                                    a.pts += 1;
                                }
                            } else if (aScore > hScore) {
                                a.w++; h.l++;
                                a.form.push('W'); h.form.push('L');
                                const diff = aScore - hScore;
                                if (diff >= 2) {
                                    a.pts += 3;
                                    } else {
                                    a.pts += 2;
                                    h.pts += 1;
                                }
                            }
                        }
                    } else if (m.status === 'scheduled') {
                        if (h && !h.nextMatch) h.nextMatch = awayName;
                        if (a && !a.nextMatch) a.nextMatch = homeName;
                    }
                });

                const result = Object.values(statsMap).map((s: CalculatedVolleyballStanding) => ({
                    ...s,
                    sd: s.sw - s.sl,
                    form: s.form.slice(-5)
                })).sort((a, b) => {
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    if (b.w !== a.w) return b.w - a.w;
                    if (b.sd !== a.sd) return b.sd - a.sd;
                    return b.sw - a.sw;
                });

                setStandings(result);
                updateNodeData(id, { rankings: result.map(s => s.name) }, true);
            } catch (err) {
                console.error("Error calculating volleyball standings:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAndCalculate();
    }, [tournamentId, teamsJson, id, effectiveTeams, supabase, updateNodeData, activeCategoryId]);

    const showPlayed = data.showPlayed !== false;
    const showWin = data.showWin !== false;
    const showLoss = data.showLoss !== false;
    const showSW = data.showSW !== false;
    const showSL = data.showSL !== false;
    const showSD = data.showSD !== false;
    const showPts = data.showPts !== false;
    const showForm = !!data.showForm;
    const showNextMatch = !!data.showNextMatch;

    const displayStandings = React.useMemo(() => {
        if (standings.length > 0) return standings;
        return effectiveTeams.map(name => ({
            name,
            mp: 0, w: 0, l: 0, sw: 0, sl: 0, sd: 0, pts: 0, form: [],
        })) as CalculatedVolleyballStanding[];
    }, [standings, effectiveTeams]);

    return (
        <div
            className={cn(
                "relative border bg-card text-card-foreground transition-all cursor-pointer min-w-[320px] rounded-sm",
                selected
                    ? "border-node-1 ring-2 ring-node-1/30"
                    : "border-border hover:border-node-1/50"
            )}
        >
            <Handle
                type="target"
                position={Position.Left}
                id="in"
                className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-1 transition-all z-50"
                style={{ left: "-1px" }}
            />

            <div className="flex items-center p-2 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-node-1 rounded flex items-center justify-center">
                        <ListOrdered className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-1">
                        {data.label}
                    </span>
                    {loading && effectiveTeams.length > 0 && (
                        <Loader2 className="h-3 w-3 animate-spin text-node-1" />
                    )}
                </div>
            </div>

            <div className="custom-scrollbar">
                <table className="w-full text-[10px] border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="px-2 py-1.5 text-left font-black text-muted-foreground w-8">#</th>
                            <th className="py-1.5 text-left font-black text-muted-foreground min-w-[100px]">TEAM</th>
                            {showPlayed && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">MP</th>}
                            {showWin && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">W</th>}
                            {showLoss && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">L</th>}
                            {showSW && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">SW</th>}
                            {showSL && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">SL</th>}
                            {showSD && <th className="px-1 py-1.5 text-center font-black text-muted-foreground w-6">SD</th>}
                            {showPts && <th className="px-2 py-1.5 text-center font-black text-foreground w-8">PTS</th>}
                            {showForm && <th className="px-2 py-1.5 text-center font-black text-muted-foreground w-16">FORM</th>}
                            {showNextMatch && <th className="px-2 py-1.5 text-left font-black text-muted-foreground w-20">NEXT</th>}
                            <th className="p-0 w-0"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {effectiveTeams.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="py-4 text-center text-muted-foreground">
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
                                    <tr key={`${teamName}-${index}`} className="hover:bg-node-1/5 transition-colors group/row h-10 relative">
                                        <td className="p-2 relative">
                                            <div className={cn(
                                                "w-6 h-6 flex items-center justify-center font-black rounded-full border transition-colors group-hover/row:border-node-1/50 group-hover/row:bg-node-1/10 group-hover/row:text-node-1",
                                                isPromoted ? "border-border text-muted-foreground" : "bg-muted/30 border-border text-muted-foreground"
                                            )}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "font-bold truncate",
                                                    teamName === "TBD" ? "text-muted-foreground font-bold" : "text-foreground"
                                                )}>
                                                    {teamName}
                                                </span>
                                            </div>
                                        </td>
                                        {showPlayed && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.mp}</td>}
                                        {showWin && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.w}</td>}
                                        {showLoss && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">{team.l}</td>}
                                        {showSW && <td className="px-1 py-1.5 text-center text-muted-foreground">{team.sw}</td>}
                                        {showSL && <td className="px-1 py-1.5 text-center text-muted-foreground">{team.sl}</td>}
                                        {showSD && <td className="px-1 py-1.5 text-center text-muted-foreground">{team.sd}</td>}
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
                                                                    res === 'W' ? "bg-primary" :
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
                                            <td className="px-2 py-1.5 text-[10px] font-bold text-node-1 truncate max-w-[80px]">
                                                {team.nextMatch ? `${team.nextMatch}` : <span className="text-muted-foreground/40 font-normal">None</span>}
                                            </td>
                                        )}
                                        <td className="p-0 w-0 relative">
                                            {isPromoted && (
                                                <Handle
                                                    type="source"
                                                    position={Position.Right}
                                                    id={`rank-${index}`}
                                                    className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-1 transition-all z-50"
                                                    style={{ right: "-4px", top: "50%", transform: "translateY(-50%)" }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex justify-center translate-y-[1px]">
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="group-matches"
                    className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-5 transition-all z-50"
                />
            </div>
        </div>
    );
});

VolleyballStandingNode.displayName = "VolleyballStandingNode";
