import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Megaphone } from "lucide-react";
import { Announcements } from "@/features/tournaments/management/announcements";
import { cn } from "@/lib/utils";

export const AnnouncementNode = memo(({ data, selected }: NodeProps) => {
    const { tournamentId, readonly } = data as { tournamentId: string, readonly?: boolean };

    return (
        <div className={cn(
            "relative w-[320px] border bg-card text-card-foreground transition-all rounded-sm",
            selected
                ? "border-node-4 ring-2 ring-node-4/30"
                : "border-border hover:border-node-4/50"
        )}>
            {/* Header */}
            <div className="flex items-center p-2 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-node-4 rounded flex items-center justify-center">
                        <Megaphone className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-4">
                        Announcements
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
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
