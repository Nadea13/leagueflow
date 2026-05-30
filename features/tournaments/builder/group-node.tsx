"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { X, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { TournamentTeam } from "@/types";

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
    const updateNodeData = useBracketStore((state) => state.updateNodeData);
    const edges = useBracketStore((state) => state.edges);
    const nodes = useBracketStore((state) => state.nodes);
    const storeTeams = useBracketStore((state) => state.teams);

    const teams = Array.isArray(data.teams) ? data.teams : [];

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
                const sourceTeams = (sourceNode.data.teams as TournamentTeam[]) || storeTeams;
                const team = sourceTeams.find(t => String(t.id) === String(teamId));
                return team?.name || null;
            }
        }

        // Handle StandingNode/GroupNode propagation (rankings)
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

        return null;
    };

    return (
        <div
            className={cn(
                "relative w-[260px] border bg-card text-card-foreground transition-all cursor-pointer rounded-sm",
                selected
                    ? "border-node-5"
                    : "border-border hover:border-node-5/50"
            )}
        >
            <div className="flex items-center p-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-node-5 rounded flex items-center justify-center">
                        <LayoutGrid className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-5">
                        {data.label}
                    </span>
                </div>
            </div>

            {/* Config inputs moved to sidebar */}

            <div className="flex flex-col divide-y divide-border bg-muted/5">
                {Math.max(0, data.teamCount || 0) === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-center text-muted-foreground">
                            Configure team count in sidebar
                        </p>
                    </div>
                ) : (
                    Array.from({ length: Math.max(0, data.teamCount || 0) }).map((_, index) => {
                        const liveTeam = getResolvedTeam(index);
                        const teamName = liveTeam || (typeof teams[index] === "string" ? teams[index] : "TBD");
                        const isResolved = !!liveTeam;

                        return (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 hover:bg-node-5/5 transition-colors group/slot cursor-default relative"
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
                                    className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-5 transition-all z-50"
                                    style={{ left: "-1px" }}
                                />
                                <div className="w-6 h-6 border rounded-full flex items-center justify-center bg-muted/50 group-hover/slot:border-node-5/50 group-hover/slot:bg-node-5/10 transition-colors text-muted-foreground group-hover/slot:text-node-5">
                                    <span className="text-[10px] font-black">{index + 1}</span>
                                </div>
                                <span
                                    className={cn(
                                        "text-[10px] font-bold tracking-tight truncate flex-1",
                                        teamName === "TBD" ? "text-muted-foreground" : "text-foreground"
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
                    })
                )}
            </div>

            {/* Bottom handles for Standing and Matches */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 translate-y-[1px]">
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="standing"
                    className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-emerald transition-all z-50 !static"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="group-matches"
                    className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-5 transition-all z-50 !static"
                />
            </div>
        </div>
    );
});

GroupNode.displayName = "GroupNode";
