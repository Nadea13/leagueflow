"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";
import { MatchNodeData, useBracketStore } from "@/lib/stores/bracket-store";

type MatchNodeType = Node<MatchNodeData, "matchNode">;

export const MatchNode = memo(function MatchNode({
    id,
    data,
    selected,
}: NodeProps<MatchNodeType>) {
    const deleteNode = useBracketStore((s) => s.deleteNode);
    const updateNodeData = useBracketStore((s) => s.updateNodeData);
    const matches = Array.isArray(data.matches) ? data.matches : [];

    return (
        <div
            className={cn(
                "relative w-[260px] border bg-card text-card-foreground transition-all cursor-pointer",
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
                className="!w-4 !h-4 !bg-violet-500 !border-none !rounded-full hover:!scale-125 transition-all z-50"
                style={{ top: "-8px" }}
            />

            {/* ── Header ── */}
            <div className="flex justify-between items-center px-3 py-1.5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest text-primary uppercase">
                        {matches.length > 1 ? "ROUND" : "MATCH"}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[120px]">
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
                    <div className="px-3 py-4 text-center text-[10px] text-muted-foreground italic">
                        No matches in this round
                    </div>
                ) : (
                    matches.map((match, index) => (
                        <div key={match.id || index} className="relative py-3 space-y-1">
                            {/* Match Number Indicator (only if > 1 matches) */}
                            {matches.length > 1 && (
                                <div className="px-3">
                                    <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">
                                        Match #{index + 1}
                                    </span>
                                </div>
                            )}

                            {/* Target Handles */}
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`slot-a-${index}`}
                                className="!w-3 !h-3 !bg-primary !border-none !rounded-full hover:!scale-125 transition-all z-50"
                                style={{ top: matches.length > 1 ? "45%" : "25%", left: "-6px" }}
                            />
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`slot-b-${index}`}
                                className="!w-3 !h-3 !bg-primary !border-none !rounded-full hover:!scale-125 transition-all z-50"
                                style={{ top: matches.length > 1 ? "85%" : "75%", left: "-6px" }}
                            />

                            {/* Source Handle (Winner) */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`winner-${index}`}
                                className="!w-3 !h-3 !bg-primary !border-none !rounded-full hover:!scale-125 transition-all z-50"
                                style={{ top: matches.length > 1 ? "65%" : "50%", right: "-6px" }}
                            />

                            <div className="pl-0">
                                <SlotRow
                                    label={match.placeholderA}
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
                                    label={match.placeholderB}
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
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div> 
    );
});

function SlotRow({
    label,
    position,
    onDropTeam,
    onClear,
}: {
    label: string;
    position: "top" | "bottom";
    onDropTeam?: (teamName: string) => void;
    onClear?: () => void;
}) {
    return (
        <div 
            className="flex items-center gap-2 px-3 py-1 transition-colors hover:bg-primary/5 group/slot cursor-default"
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
                label === "TBD" ? "text-muted-foreground/50 italic font-medium" : "text-foreground"
            )}>
                {label}
            </span>
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
