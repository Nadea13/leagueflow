import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Megaphone, Trash2 } from "lucide-react";
import { Announcements } from "@/features/tournaments/management/announcements";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { cn } from "@/lib/utils";

export const AnnouncementNode = memo(({ id, data, selected }: NodeProps) => {
    const { tournamentId, readonly } = data as { tournamentId: string, readonly?: boolean };
    const { deleteNode } = useBracketStore();

    return (
        <div className={cn(
            "relative w-[300px] border bg-card text-card-foreground transition-all",
            selected
                ? "border-amber-500 ring-2 ring-amber-500/30"
                : "border-border hover:border-amber-500/50"
        )}>
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b bg-amber-500/5">
                <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-amber-500" />
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase text-amber-500">
                        Announcements
                    </span>
                </div>
                {!readonly && (
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
                )}
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-background/30">
                <Announcements
                    tournamentId={tournamentId}
                    isEditable={!readonly}
                    isCompact={true}
                    mode="list"
                />
            </div>
        </div>
    );
});

AnnouncementNode.displayName = "AnnouncementNode";
