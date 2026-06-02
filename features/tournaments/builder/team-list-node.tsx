import React, { memo } from 'react';
import Image from 'next/image';
import { Handle, Position } from '@xyflow/react';
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
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

export const TeamListNode = memo(({ data, selected }: TeamListNodeProps) => {
    const { teams: storeTeams } = useBracketStore();

    // Filter to only show approved/paid teams (null status = legacy team, treat as approved)
    // Filter to only show approved/paid teams (null status = legacy team, treat as approved)
    const paidTeams = (storeTeams as TournamentTeam[]).filter((team: TournamentTeam) => {
        const ps = team.payment_status;
        const rs = team.registration_status;
        // Legacy teams with no status set — treat as approved
        if (!ps && !rs) return true;
        return String(ps || '').toLowerCase() === 'paid' ||
            String(rs || '').toLowerCase() === 'approved';
    });

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div
            className={cn(
                "relative w-[280px] border bg-card text-card-foreground transition-all rounded-sm",
                selected
                    ? "border-node-3 ring-node-3/30"
                    : "border-border hover:border-node-3/50"
            )}
        >
            {/* Header */}
            <div className="flex items-center p-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-node-3 rounded flex items-center justify-center">
                        <Users className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-3">
                        {data.label}
                    </span>
                </div>
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
                        <div key={team.id} className="group relative flex items-center gap-3 p-2 hover:bg-node-3/5 transition-colors">
                            {team.logo_url ? (
                                <Image
                                    src={team.logo_url}
                                    alt={team.name}
                                    width={24}
                                    height={24}
                                    className="h-6 w-6 rounded-full object-cover border border-border transition-colors group-hover:border-node-3/50"
                                />
                            ) : (
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border transition-colors group-hover:border-node-3/50 group-hover:bg-node-3/10 overflow-hidden">
                                    <span className="text-[9px] font-black text-muted-foreground group-hover:text-node-3 transition-colors">
                                        {getInitials(team.name)}
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="text-[10px] font-bold tracking-tight truncate text-foreground">
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
                                className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-3 transition-all z-50"
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
