"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";
import { MatchNodeData, useBracketStore } from "@/lib/stores/bracket-store";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Match, TournamentTeam } from "@/types";

type MatchNodeType = Node<MatchNodeData, "matchNode">;

export const MatchNode = memo(function MatchNode({
    id,
    data,
    selected,
}: NodeProps<MatchNodeType>) {
    const deleteNode = useBracketStore((s) => s.deleteNode);
    const updateNodeData = useBracketStore((s) => s.updateNodeData);
    const edges = useBracketStore((s) => s.edges);
    const nodes = useBracketStore((s) => s.nodes);
    const storeTeams = useBracketStore((s) => s.teams);
    const params = useParams();
    const tournamentId = params.id as string;
    const supabase = createClient();

    const [dbMatches, setDbMatches] = useState<Match[]>([]);
    const matches = Array.isArray(data.matches) ? data.matches : [];

    useEffect(() => {
        if (!tournamentId) return;

        async function fetchScores() {
            const { data: results } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .eq('node_id', id);
            
            if (results) {
                setDbMatches(results);
            }
        }

        fetchScores();
        // Set up a small interval or subscription for "realtime" feel
        const interval = setInterval(fetchScores, 10000); // 10s refresh
        return () => clearInterval(interval);
    }, [id, tournamentId, supabase]);

    return (
        <div
            className={cn(
                "relative w-[260px] border bg-card text-card-foreground transition-all cursor-pointer rounded-sm",
                selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
            )}
        >
            {/* Top Target Handle for Group Connection */}
            <Handle
                type="target"
                position={Position.Top}
                id="group-in"
                className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                style={{ top: "-1px" }}
            />

            {/* ── Header ── */}
            <div className="flex justify-between items-center p-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <span className="text-background text-xs font-bold">VS</span>
                    </div>
                    <span className="text-xs font-black tracking-wide text-primary">
                        {matches.length > 1 ? "Round" : "Match"}
                    </span>
                    <span className="text-xs font-black tracking-wide text-muted-foreground">
                        {data.label}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(id);
                    }}
                    className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            {/* ── Match List ── */}
            <div className="flex flex-col divide-y divide-border">
                {matches.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-center text-muted-foreground">
                            No matches in this round
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                    {matches
                        .slice()
                        .sort((a, b) => {
                            const dateA = a.match_date || "9999-12-31";
                            const timeA = a.match_time || "23:59";
                            const dateB = b.match_date || "9999-12-31";
                            const timeB = b.match_time || "23:59";
                            if (dateA !== dateB) return dateA.localeCompare(dateB);
                            return timeA.localeCompare(timeB);
                        })
                        .map((match, index) => {
                            // Resolve live teams from edges
                            const getResolvedTeam = (slot: 'a' | 'b') => {
                                const handleId = `slot-${slot}-${index}`;
                                const edge = edges.find(e => e.target === id && e.targetHandle === handleId);
                                if (!edge) return null;

                                const sourceNode = nodes.find(n => n.id === edge.source);
                                if (!sourceNode) return null;

                                // Handle TeamListNode propagation
                                if (sourceNode.type === 'teamListNode') {
                                    const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                                    if (teamIdMatch) {
                                        const teamId = teamIdMatch[1];
                                        const sourceTeams = (sourceNode.data.teams as TournamentTeam[]) || storeTeams;
                                        const team = sourceTeams.find(t => String(t.id) === String(teamId));
                                        return team?.name || null;
                                    }
                                }

                                // Handle StandingNode/GroupNode propagation
                                if (sourceNode.type === 'standingNode' || sourceNode.type === 'groupNode') {
                                    const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
                                    if (rankMatch) {
                                        const rankIndex = parseInt(rankMatch[1], 10);
                                        const rankings = (sourceNode.data as { rankings?: string[] }).rankings || [];
                                        if (rankings[rankIndex]) return rankings[rankIndex];
                                        
                                        const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                                        return `${rankSuffix} Place (${sourceNode.data.label})`;
                                    }
                                }


                                // Handle MatchNode propagation (Winner)
                                if (sourceNode.type === 'matchNode') {
                                    const winnerMatch = edge.sourceHandle?.match(/winner-(\d+)/);
                                    if (winnerMatch) {
                                        const winnerIndex = parseInt(winnerMatch[1], 10);
                                        return `Winner (Match ${winnerIndex + 1})`;
                                    }
                                }

                                return null;
                            };

                            const liveTeamA = getResolvedTeam('a');
                            const liveTeamB = getResolvedTeam('b');

                            return (
                                <div key={match.id || index} className="relative py-3 space-y-1">
                                    {/* Match Number Indicator (only if > 1 matches) */}
                                    {matches.length > 1 && (
                                        <div className="px-3">
                                            <span className="text-[9px] font-black text-primary/60 tracking-tighter">
                                                Match #{index + 1}
                                            </span>
                                        </div>
                                    )}

                                    {/* Handles for Slot A */}
                                    <Handle
                                        type="target"
                                        position={Position.Left}
                                        id={`slot-a-${index}`}
                                        className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                                        style={{ top: matches.length > 1 ? "45%" : "25%", left: "-1px" }}
                                    />

                                    {/* Handles for Slot B */}
                                    <Handle
                                        type="target"
                                        position={Position.Left}
                                        id={`slot-b-${index}`}
                                        className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                                        style={{ top: matches.length > 1 ? "85%" : "75%", left: "-1px" }}
                                    />

                                    {/* Source Handle (Winner) */}
                                    <Handle
                                        type="source"
                                        position={Position.Right}
                                        id={`winner-${index}`}
                                        className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                                        style={{ top: matches.length > 1 ? "65%" : "50%", right: "-1px" }}
                                    />

                                    <div className="pl-0">
                                        {(() => {
                                            const dbMatch = dbMatches.find(m => 
                                                m.id === match.dbId || 
                                                (m.placeholder_a === (liveTeamA || match.placeholderA) && m.placeholder_b === (liveTeamB || match.placeholderB))
                                            );
                                            
                                            return (
                                                <>
                                                    <SlotRow
                                                        label={liveTeamA || match.placeholderA}
                                                        isResolved={!!liveTeamA}
                                                        score={dbMatch?.home_score}
                                                        isWinner={dbMatch?.status === 'finished' && (dbMatch.home_score || 0) > (dbMatch.away_score || 0)}
                                                        status={dbMatch?.status}
                                                        position="top"
                                                        onDropTeam={(teamName) => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderA: teamName };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                        onClear={() => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderA: "TBD" };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                    />
                                                    <SlotRow
                                                        label={liveTeamB || match.placeholderB}
                                                        isResolved={!!liveTeamB}
                                                        score={dbMatch?.away_score}
                                                        isWinner={dbMatch?.status === 'finished' && (dbMatch.away_score || 0) > (dbMatch.home_score || 0)}
                                                        status={dbMatch?.status}
                                                        position="bottom"
                                                        onDropTeam={(teamName) => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderB: teamName };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                        onClear={() => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderB: "TBD" };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                    />
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

function SlotRow({
    label,
    score,
    isWinner,
    status,
    isResolved,
    position,
    onDropTeam,
    onClear,
}: {
    label: string;
    score?: number | null;
    isWinner?: boolean;
    status?: string;
    isResolved?: boolean;
    position: "top" | "bottom";
    onDropTeam?: (teamName: string) => void;
    onClear?: () => void;
}) {
    return (
        <div 
            className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-primary/5 group/slot cursor-default"
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
                e.preventDefault();
                const teamName = e.dataTransfer.getData("application/reactflow-team");
                if (teamName && onDropTeam) {
                    onDropTeam(teamName);
                }
            }}
        >
            <div className="w-4 h-4 border flex items-center justify-center bg-muted/50 group-hover/slot:border-primary/50 group-hover/slot:bg-primary/10 transition-colors">
                <span className="text-[9px] font-black text-muted-foreground group-hover/slot:text-primary">
                    {position === "top" ? "H" : "A"}
                </span>
            </div>
            <span className={cn(
                "text-[10px] font-bold tracking-tight truncate flex-1",
                label === "TBD" ? "text-muted-foreground/50 italic font-medium" : 
                isWinner ? "text-emerald-600" : 
                isResolved ? "text-foreground" : "text-foreground"
            )}>
                {label}
            </span>
            {(score !== undefined && score !== null && status !== 'scheduled') && (
                <div className={cn(
                    "w-6 h-6 flex items-center justify-center font-black text-[11px] rounded border",
                    isWinner ? "bg-emerald-500 text-white border-emerald-600" : "bg-muted border-border text-muted-foreground"
                )}>
                    {score}
                </div>
            )}
            {label !== "TBD" && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear?.();
                    }}
                    className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/slot:opacity-100"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}
