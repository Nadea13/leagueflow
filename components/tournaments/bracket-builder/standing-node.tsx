"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Trash2, Trophy, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const deleteNode = useBracketStore((state) => state.deleteNode);
    const teams = Array.isArray(data.teams) ? data.teams : [];
    const teamCount = data.teamCount || 0;

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
    const advancingCount = Number(data.advancingCount) || 0;

    return (
        <div
            className={cn(
                "relative border bg-card text-card-foreground transition-all cursor-pointer min-w-[320px]",
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
                className="!w-4 !h-4 !bg-emerald-500 !border-none !rounded-full hover:!scale-125 transition-all z-50"
                style={{ left: "-8px" }}
            />

            <div className="flex justify-between items-center px-3 py-1.5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
                        <ListOrdered className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-emerald-500 uppercase">
                        {data.label || "STANDINGS"}
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

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-[10px] border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border/50">
                            <th className="px-2 py-1.5 text-left font-black text-muted-foreground w-8">#</th>
                            <th className="px-2 py-1.5 text-left font-black text-muted-foreground min-w-[100px]">TEAM</th>
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
                        {teamCount === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground italic">
                                    Connect to a group node to show standings
                                </td>
                            </tr>
                        ) : (
                            Array.from({ length: teamCount }).map((_, index) => {
                                const teamName = typeof teams[index] === "string" ? teams[index] : "TBD";
                                const isPromoted = index < advancingCount;

                                return (
                                    <tr key={index} className="hover:bg-emerald-500/5 transition-colors group/row h-10">
                                        <td className="px-2 py-1.5 relative">
                                            <div className={cn(
                                                "w-5 h-5 flex items-center justify-center font-black rounded-sm border",
                                                isPromoted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-muted/30 border-border text-muted-foreground"
                                            )}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "font-bold truncate max-w-[120px]",
                                                    teamName === "TBD" ? "text-muted-foreground/30 italic font-normal" : "text-foreground"
                                                )}>
                                                    {teamName}
                                                </span>
                                                {index === 0 && teamName !== "TBD" && <Trophy className="h-2.5 w-2.5 text-yellow-500 shrink-0" />}
                                            </div>
                                        </td>
                                        {showPlayed && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">0</td>}
                                        {showWin && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">0</td>}
                                        {showDraw && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">0</td>}
                                        {showLoss && <td className="px-1 py-1.5 text-center text-muted-foreground font-medium">0</td>}
                                        {showGF && <td className="px-1 py-1.5 text-center text-muted-foreground">0</td>}
                                        {showGA && <td className="px-1 py-1.5 text-center text-muted-foreground">0</td>}
                                        {showGD && <td className="px-1 py-1.5 text-center text-muted-foreground">0</td>}
                                        {showPts && <td className="px-2 py-1.5 text-center font-black text-foreground">0</td>}
                                        {showForm && (
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex justify-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <div key={i} className="w-2 h-2 rounded-full bg-muted/50" />
                                                    ))}
                                                </div>
                                            </td>
                                        )}
                                        {showNextMatch && (
                                            <td className="px-2 py-1.5 text-muted-foreground/40 italic">
                                                None
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
                {Array.from({ length: advancingCount }).map((_, index) => (
                    <div 
                        key={index} 
                        className="relative h-10 w-0 pointer-events-auto"
                    >
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`rank-${index}`}
                            className="!w-4 !h-4 !bg-violet-500 !border-none !rounded-full hover:!scale-125 transition-all z-50"
                            style={{ right: "-8px", top: "20px" }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

StandingNode.displayName = "StandingNode";
