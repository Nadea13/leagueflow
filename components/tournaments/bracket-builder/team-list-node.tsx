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
    
    // Filter paid teams if status exists, otherwise show all
    // Based on user request, we look for 'paid' status. 
    const paidTeams = storeTeams.filter((team: any) => {
        const registration = Array.isArray(team.registrations) ? team.registrations[0] : team.registrations;
        if (!registration) return true;
        return registration.payment_status === 'PAID';
    });

    return (
        <div
            className={cn(
                "relative w-[280px] border bg-card text-card-foreground transition-all",
                selected 
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
            )}
        >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase text-primary">
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
                    <div className="p-8 text-center">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">
                            No paid teams found
                        </span>
                    </div>
                ) : (
                    paidTeams.map((team) => (
                        <div key={team.id} className="group relative flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                            {team.logo_url ? (
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
                                <span className="text-xs font-black tracking-tight truncate uppercase">
                                    {team.name}
                                </span>
                                {team.group_name && (
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Group {team.group_name}
                                    </span>
                                )}
                            </div>

                            {/* Handle for each team */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`team-${team.id}`}
                                className="!w-4 !h-4 !bg-primary !border-none !rounded-full hover:!bg-primary hover:!scale-125 transition-all z-50"
                                style={{ right: "-16px", top: "50%", transform: "translateY(-50%)" }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

TeamListNode.displayName = 'TeamListNode';
