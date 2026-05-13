"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Trash2, Users, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface GroupNodeData {
    label: string;
    teamCount: number;
    advancingCount: number;
    teams?: string[];
    [key: string]: unknown;
}

export const GroupNode = memo(({
    id,
    data,
    selected,
}: NodeProps<Node<GroupNodeData>>) => {
    const deleteNode = useBracketStore((state) => state.deleteNode);
    const updateNodeData = useBracketStore((state) => state.updateNodeData);
    const edges = useBracketStore((state) => state.edges);
    const nodes = useBracketStore((state) => state.nodes);
    
    const teams = Array.isArray(data.teams) ? data.teams : [];
    const advancingCount = Math.max(1, Math.min(8, data.advancingCount || 1));

    // Resolve live team for a specific slot index
    const getResolvedTeam = (index: number) => {
        const handleId = `team-in-${index}`;
        const edge = edges.find(e => e.target === id && e.targetHandle === handleId);
        if (!edge) return null;

        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return null;

        // Handle TeamListNode propagation
        if (sourceNode.type === 'teamListNode') {
            const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
            if (teamIdMatch) {
                const teamId = teamIdMatch[1];
                const sourceTeams = (sourceNode.data.teams as any[]) || [];
                const team = sourceTeams.find(t => t.id === teamId);
                return team?.name || null;
            }
        }

        // Handle StandingNode/GroupNode propagation (rankings)
        if (sourceNode.type === 'standingNode' || sourceNode.type === 'groupNode') {
            const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
            if (rankMatch) {
                const rankIndex = parseInt(rankMatch[1], 10);
                const rankings = (sourceNode.data as any).rankings as string[] || [];
                if (rankings[rankIndex]) return rankings[rankIndex];
                
                const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                return `${rankSuffix} Place (${sourceNode.data.label})`;
            }
        }
        
        // Handle ByeNode propagation
        if (sourceNode.type === 'byeNode') {
            return (sourceNode.data as any).placeholder as string;
        }

        return null;
    };

    return (
        <div
            className={cn(
                "relative w-[260px] border bg-card text-card-foreground transition-all cursor-pointer",
                selected
                    ? "border-violet-500 ring-2 ring-violet-500/30"
                    : "border-border hover:border-violet-500/50"
            )}
        >
            <div className="flex justify-between items-center px-3 py-1.5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-violet-500 rounded flex items-center justify-center">
                        <Users className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-violet-500">
                        {data.label || "GROUP STAGE"}
                    </span>
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

            {/* Config inputs moved to sidebar */}

            <div className="flex flex-col border-t divide-y divide-border bg-muted/5">
                {Array.from({ length: Math.max(0, data.teamCount || 0) }).map((_, index) => {
                    const liveTeam = getResolvedTeam(index);
                    const teamName = liveTeam || (typeof teams[index] === "string" ? teams[index] : "TBD");
                    const isResolved = !!liveTeam;

                    return (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-4 py-3 hover:bg-violet-500/5 transition-colors group/slot cursor-default relative"
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const team = event.dataTransfer.getData("application/reactflow-team");
                                if (!team) {
                                    return;
                                }

                                const nextTeams = [...teams];
                                while (nextTeams.length <= index) nextTeams.push("TBD");
                                nextTeams[index] = team;
                                updateNodeData(id, { teams: nextTeams });
                            }}
                        >
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`team-in-${index}`}
                                className="!w-4 !h-4 !bg-violet-500 !border-none !rounded-full hover:!scale-125 transition-all z-50"
                                style={{ left: "-8px" }}
                            />
                            <div className="w-5 h-5 border flex items-center justify-center bg-muted/50 group-hover/slot:border-violet-500/50 group-hover/slot:bg-violet-500/10 transition-colors text-muted-foreground group-hover/slot:text-violet-500">
                                <span className="text-[10px] font-black">{index + 1}</span>
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-black tracking-tight truncate flex-1",
                                    teamName === "TBD" ? "text-muted-foreground/50 italic" : "text-foreground"
                                )}
                            >
                                {teamName}
                            </span>
                            {teamName !== "TBD" && !isResolved && (
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        const nextTeams = [...teams];
                                        nextTeams[index] = "TBD";
                                        updateNodeData(id, { teams: nextTeams });
                                    }}
                                    className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/slot:opacity-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom handles for Standing and Matches */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 translate-y-[8px]">
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="standing"
                    className="!w-4 !h-4 !bg-emerald-500 !border-none !rounded-full hover:!scale-125 transition-all z-50 !static"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="group-matches"
                    className="!w-4 !h-4 !bg-violet-500 !border-none !rounded-full hover:!scale-125 transition-all z-50 !static"
                />
            </div>
        </div>
    );
});

GroupNode.displayName = "GroupNode";
