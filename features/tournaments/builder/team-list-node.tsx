import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from "@/lib/utils";
import { Users, Trash2 } from "lucide-react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { TournamentTeam } from "@/types";

interface TeamListNodeProps {
    id: string;
    data: {
        label?: string;
        teams: TournamentTeam[];
    };
    selected?: boolean;
}

export const TeamListNode = memo(({ id, data, selected }: TeamListNodeProps) => {
    const { teams: storeTeams, deleteNode } = useBracketStore();

    // Filter to only show approved/paid teams (null status = legacy team, treat as approved)
    const paidTeams = (storeTeams as TournamentTeam[]).filter((team: TournamentTeam) => {
        const ps = team.payment_status;
        const rs = team.registration_status;
        // Legacy teams with no status set — treat as approved
        if (!ps && !rs) return true;
        return String(ps || '').toLowerCase() === 'paid' ||
            String(rs || '').toLowerCase() === 'approved';
    });

    return (
        <div
            className={cn(
                "relative w-[280px] border bg-card text-card-foreground transition-all rounded-sm",
                selected
                    ? "border-primary ring-primary/30"
                    : "border-border hover:border-primary/50"
            )}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <Users className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-primary">
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

            {/* Teams List */}
            <div className="flex flex-col divide-y divide-border">
                {paidTeams.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-center text-muted-foreground">
                            No teams found
                        </p>
                    </div>
                ) : (
                    paidTeams.map((team) => (
                        <div key={team.id} className="group relative flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                            {team.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={team.logo_url}
                                    alt={team.name}
                                    className="h-6 w-6 rounded-full object-cover border border-border"
                                />
                            ) : (
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                </div>
                            )}
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-black tracking-tight truncate">
                                    {team.name}
                                </span>
                                {team.group_name && (
                                    <span className="text-[9px] font-bold text-muted-foreground tracking-widest">
                                        Group {team.group_name}
                                    </span>
                                )}
                            </div>

                            {/* Handle for each team */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`team-${team.id}`}
                                className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-primary transition-all z-50"
                                style={{ right: "-4px", top: "50%", transform: "translateY(-50%)" }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

TeamListNode.displayName = 'TeamListNode';
