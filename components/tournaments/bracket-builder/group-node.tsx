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
    const teams = Array.isArray(data.teams) ? data.teams : [];
    const advancingCount = Math.max(1, Math.min(8, data.advancingCount || 1));

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

            <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-muted-foreground">Group Name</Label>
                    <Input
                        value={data.label}
                        onChange={(event) => updateNodeData(id, { label: event.target.value })}
                        className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-violet-500"
                        placeholder="Group A"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-muted-foreground">Team Count</Label>
                        <Input
                            type="number"
                            value={data.teamCount}
                            onChange={(event) => updateNodeData(id, { teamCount: parseInt(event.target.value, 10) || 0 })}
                            className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-violet-500"
                            min={1}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-muted-foreground">Advancing</Label>
                        <Input
                            type="number"
                            value={data.advancingCount}
                            onChange={(event) => updateNodeData(id, { advancingCount: parseInt(event.target.value, 10) || 0 })}
                            className="h-8 text-xs font-bold bg-muted/30 border-violet-500/30 focus-visible:ring-violet-500"
                            min={1}
                            max={8}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col border-t divide-y divide-border bg-muted/5">
                {Array.from({ length: Math.max(0, data.teamCount || 0) }).map((_, index) => {
                    const teamName = typeof teams[index] === "string" ? teams[index] : "TBD";

                    return (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-violet-500/5 transition-colors group/slot cursor-default"
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
                            {teamName !== "TBD" && (
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

            <div className="flex flex-col border-t divide-y divide-border bg-muted/10">
                {Array.from({ length: advancingCount }).map((_, index) => (
                    <div key={index} className="relative flex justify-end items-center px-3 py-2 h-10">
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            {index === 0 ? "1st Place" : index === 1 ? "2nd Place" : `${index + 1}th Place`}
                            <ChevronRight className="h-3 w-3 text-violet-500" />
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`rank-${index}`}
                            className="!w-4 !h-4 !bg-violet-500 !border-none !rounded-full hover:!scale-125 transition-all z-50"
                            style={{ right: "-8px" }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

GroupNode.displayName = "GroupNode";
