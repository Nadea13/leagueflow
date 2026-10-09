import React, { memo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Handle, Position } from '@xyflow/react';
import { cn } from "@/lib/utils";
import { Users, Plus } from "lucide-react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { TournamentTeam } from "@/types";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { AddTournamentTeamDialog } from "@/features/dialogs";

interface TeamListNodeProps {
    id: string;
    data: {
        label?: string;
        teams: TournamentTeam[];
    };
    selected?: boolean;
}

export const TeamListNode = memo(({ id, data, selected }: TeamListNodeProps) => {
    const { teams: storeTeams, activeCategoryId, fetchTeams, setActiveNodeId, selectNode } = useBracketStore();
    const params = useParams();
    const tournamentId = params?.id as string;
    const locale = useLocale();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Realtime sync: auto-poll tournament teams for status updates
    useEffect(() => {
        if (!activeCategoryId) return;
        
        fetchTeams(activeCategoryId);

        const interval = setInterval(() => {
            fetchTeams(activeCategoryId);
        }, 3000);

        const handleFocus = () => {
            fetchTeams(activeCategoryId);
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [activeCategoryId, fetchTeams]);

    // Filter to only show confirmed/approved teams for the active category
    const paidTeams = (storeTeams as TournamentTeam[]).filter((team: TournamentTeam & { tournament_category_id?: string | null }) => {
        // If activeCategoryId is set and team has category id, ensure they match
        if (activeCategoryId && team.tournament_category_id && String(team.tournament_category_id) !== String(activeCategoryId)) {
            return false;
        }

        if ((team as any).deleted_at) {
            return false;
        }

        const rs = String(team.registration_status || '').toLowerCase();
        const ps = String(team.payment_status || '').toLowerCase();

        // Must NOT be pending or rejected
        if (rs === 'rejected' || ps === 'rejected' || rs === 'pending') {
            return false;
        }

        // Must be approved / confirmed
        return rs === 'approved' || rs === 'confirmed' || ps === 'paid';
    });

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const handleOpenAddTeam = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveNodeId(id);
        selectNode(id);
        setIsAddDialogOpen(true);
    };

    return (
        <div
            className={cn(
                "relative w-[320px] border bg-card text-card-foreground transition-all rounded-sm shadow-md",
                selected
                    ? "border-node-3"
                    : "border-node-3/50 hover:border-node-3"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-node-3/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-node-3/10 rounded flex items-center justify-center">
                        <Users className="h-4 w-4 text-node-3" />
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-3">
                        {data.label}
                    </span>
                </div>
                {tournamentId && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="w-6 h-6 p-0 bg-node-3/10 hover:bg-node-3/20 rounded flex items-center justify-center text-node-3 transition-colors"
                        onClick={handleOpenAddTeam}
                        title={locale === "th" ? "เพิ่มทีม" : "Add Team"}
                    >
                        <Plus className="h-4 w-4 text-node-3" />
                    </Button>
                )}
            </div>

            {/* Teams List */}
            <div className="flex flex-col divide-y divide-border">
                {paidTeams.length === 0 ? (
                    <div className="p-4 text-center flex flex-col items-center gap-2">
                        <p className="text-[10px] text-center text-muted-foreground">
                            {locale === "th" ? "ยังไม่มีทีมในรุ่นนี้" : "No teams found"}
                        </p>
                        {tournamentId && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[11px] gap-1 px-2 border-node-3/40 text-node-3 hover:bg-node-3/10"
                                onClick={handleOpenAddTeam}
                            >
                                <Plus className="h-4 w-4" />
                                {locale === "th" ? "เพิ่มทีม" : "Add Team"}
                            </Button>
                        )}
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
                                className="!w-2 !h-2 !bg-card !border !border-node-3/50 !rounded-full hover:!bg-node-3 transition-all z-50"
                                style={{ right: "-4px", top: "50%", transform: "translateY(-50%)" }}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Add Team Dialog */}
            {tournamentId && (
                <AddTournamentTeamDialog
                    tournamentId={tournamentId}
                    tournamentCategoryId={activeCategoryId || undefined}
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                    trigger={null}
                    onSuccess={() => {
                        if (activeCategoryId) {
                            fetchTeams(activeCategoryId);
                        }
                    }}
                />
            )}
        </div>
    );
});

TeamListNode.displayName = 'TeamListNode';
