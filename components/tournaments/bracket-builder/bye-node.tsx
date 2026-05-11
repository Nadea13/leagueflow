"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";
import { useBracketStore } from "@/lib/stores/bracket-store";

export const ByeNode = memo(function ByeNode({
    id,
    data,
    selected,
}: NodeProps<Node<{ label: string; placeholder?: string }>>) {
    const deleteNode = useBracketStore((s) => s.deleteNode);
    const updateNodeData = useBracketStore((s) => s.updateNodeData);

    return (
        <div
            className={cn(
                "relative w-[260px] border bg-card text-card-foreground transition-all cursor-pointer",
                selected
                    ? "border-chart-5 ring-2 ring-chart-5/30"
                    : "border-border hover:border-chart-5/50"
            )}
        >
            {/* ── Right Handle (1 output: winner) ── */}
            <Handle
                type="source"
                position={Position.Right}
                id="winner"
                className="!w-4 !h-4 !bg-chart-5 !border-none !rounded-full hover:!bg-chart-5 hover:!scale-125 transition-all z-50"
                style={{ top: "50%", right: "-8px" }}
            />

            {/* ── Content ── */}
            <div className="flex justify-between items-center px-3 py-1.5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black tracking-widest text-chart-5 uppercase">
                        {data.label || "BYE"}
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

            <div className="flex flex-col divide-y divide-border">
                <SlotRow
                    handleId="slot"
                    label={data.placeholder || "TBD"}
                    position="top"
                    onDropTeam={(teamName) => updateNodeData(id, { placeholder: teamName })}
                    onClear={() => updateNodeData(id, { placeholder: "TBD" })}
                />
            </div>
        </div>
    );
});

function SlotRow({
    handleId: _handleId,
    label = "TBD",
    position,
    onDropTeam,
    onClear,
}: {
    handleId: string;
    label?: string;
    position: "top" | "bottom";
    onDropTeam?: (teamName: string) => void;
    onClear?: () => void;
}) {
    return (
        <div 
            className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-chart-5/5 group/slot cursor-default"
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
            <div className="w-5 h-5 border flex items-center justify-center bg-muted/50 group-hover/slot:border-chart-5/50 group-hover/slot:bg-chart-5/10 transition-colors">
                <span className="text-[10px] font-black text-muted-foreground group-hover/slot:text-chart-5">
                    {position === "top" ? "A" : "B"}
                </span>
            </div>
            <span className={cn(
                "text-[11px] font-black tracking-tight truncate flex-1",
                label === "TBD" ? "text-muted-foreground/50 italic" : "text-foreground"
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
