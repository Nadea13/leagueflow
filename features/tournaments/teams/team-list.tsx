"use client";

import { useState } from "react";
import Image from "next/image";
import { EmptyState } from "@/components/shared/empty-state";

import { assignTeamGroup } from "@/actions/organizer/tournaments/general";
import { TournamentTeam } from "@/types/index";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { RosterDialog } from "./roster-manager";
import { Badge } from "@/components/ui/badge";


interface TeamsProps {
    teams: (TournamentTeam & { team?: { user_id: string | null } })[];
    tournamentId: string;
    isPro: boolean;
    showGroupSelector?: boolean;
    organizerId?: string;
}

export function Teams({ teams, tournamentId, showGroupSelector = false, organizerId }: TeamsProps) {
    const t = useTranslations("Team");

    if (!teams || teams.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title={t("no_teams")}
                description={t("no_teams_desc")}
                className="py-12"
            />
        );
    }

    return (
        <div className="flex flex-col border border-border bg-card divide-y divide-border overflow-hidden">
            {teams.map((team) => (
                <TeamItem
                    key={team.id}
                    team={team}
                    tournamentId={tournamentId}
                    showGroupSelector={showGroupSelector}
                    isReadOnly={!!((team.user_id || team.team?.user_id) && (team.user_id !== organizerId && team.team?.user_id !== organizerId))}
                />
            ))}
        </div>
    );
}

function TeamItem({
    team,
    tournamentId,
    showGroupSelector,
    isReadOnly
}: {
    team: TournamentTeam & { team?: { user_id: string | null } };
    tournamentId: string;
    showGroupSelector: boolean;
    isReadOnly: boolean;
}) {
    const t = useTranslations("Team");
    const tGroup = useTranslations("Group");
    const tCommon = useTranslations("Common");
    const [isGroupLoading, setIsGroupLoading] = useState(false);

    const handleGroupChange = async (value: string) => {
        setIsGroupLoading(true);
        try {
            await assignTeamGroup(team.id, value === "none" ? null : value, tournamentId);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGroupLoading(false);
        }
    };

    return (
        <div className="group relative transition-all">
            <RosterDialog
                team={{ ...team, managed_by_manager: isReadOnly }}
                tournamentId={tournamentId}
                readOnly={isReadOnly}
                trigger={
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
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

                        <div className="flex justify-between items-center w-full min-w-0">
                            <div className="flex flex-col overflow-hidden">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-xs font-black tracking-tight truncate uppercase">
                                        {team.name}
                                    </span>
                                    {isReadOnly && (
                                        <Badge variant="outline" className="rounded-none border-muted-foreground/20 text-muted-foreground/40 text-[8px] font-black tracking-widest px-1.5 py-0">
                                            {t("managed_by_manager")}
                                        </Badge>
                                    )}
                                </div>
                                {team.group_name && !showGroupSelector && (
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {tGroup("group")} {team.group_name}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                                {showGroupSelector && !isReadOnly ? (
                                    <div className="flex items-center gap-2">
                                        {isGroupLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                        <Select
                                            defaultValue={team.group_name || "none"}
                                            onValueChange={handleGroupChange}
                                            disabled={isGroupLoading}
                                        >
                                            <SelectTrigger className="h-7 text-[9px] font-black tracking-widest focus:ring-0 uppercase">
                                                <SelectValue placeholder={tGroup("group")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none border-border">
                                                <SelectItem value="none" className="text-[9px] font-bold uppercase">{tCommon("none")}</SelectItem>
                                                {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((g) => (
                                                    <SelectItem key={g} value={g} className="text-[9px] font-black uppercase">
                                                        {tGroup("group")} {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : team.group_name ? (
                                    <Badge className="rounded-none bg-primary/10 text-primary border-none text-[8px] font-black tracking-widest px-1.5 py-0.5 uppercase">
                                        {tGroup("group")} {team.group_name}
                                    </Badge>
                                ) : (
                                    <span className="text-[9px] font-bold text-muted-foreground/40 tracking-widest uppercase">{t("participating_team")}</span>
                                )}
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    );
}

