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

export function Teams({ teams, tournamentId, isPro, showGroupSelector = false, organizerId }: TeamsProps) {
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
        <div className="grid gap-4">
            {teams.map((team) => (
                <TeamItem
                    key={team.id}
                    team={team}
                    tournamentId={tournamentId}
                    isPro={isPro}
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
    isPro,
    showGroupSelector,
    isReadOnly
}: {
    team: TournamentTeam & { team?: { user_id: string | null } };
    tournamentId: string;
    isPro: boolean;
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
        <div className="group bg-card border relative overflow-hidden transition-all hover:border-primary">
            <RosterDialog 
                team={{ ...team, managed_by_manager: isReadOnly }} 
                tournamentId={tournamentId} 
                readOnly={isReadOnly}
                trigger={
                    <div className="p-2 md:p-3 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer">
                        <div className="h-10 w-10 flex items-center justify-center shrink-0 overflow-hidden border relative transition-all group-hover:border-primary">
                            {team.logo_url ? (
                                <img
                                    src={team.logo_url}
                                    alt={team.name}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <span className="text-sm font-black text-primary">
                                    {team.name.substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>

                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center flex-wrap gap-3 mb-1">
                                <h3 className="text-xl font-black tracking-tighter text-foreground leading-none group-hover:text-primary transition-colors truncate">
                                    {team.name}
                                </h3>

                                {isReadOnly && (
                                    <Badge variant="outline" className="rounded-none border-muted-foreground/20 text-muted-foreground/40 text-[9px] font-black tracking-widest px-2 py-0.5">
                                        {t("managed_by_manager")}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {showGroupSelector && !isReadOnly ? (
                                    <div className="flex items-center gap-2">
                                        {isGroupLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                        <Select
                                            defaultValue={team.group_name || "none"}
                                            onValueChange={handleGroupChange}
                                            disabled={isGroupLoading}
                                        >
                                            <SelectTrigger className="text-[10px] font-black tracking-widest focus:ring-0">
                                                <SelectValue placeholder={tGroup("group")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none border-border">
                                                <SelectItem value="none" className="text-[10px] font-bold">{tCommon("none")}</SelectItem>
                                                {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((g) => (
                                                    <SelectItem key={g} value={g} className="text-[10px] font-black">
                                                        {tGroup("group")} {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : team.group_name ? (
                                    <Badge className="rounded-none bg-primary/10 text-primary border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                                        {tGroup("group")} {team.group_name}
                                    </Badge>
                                ) : (
                                    <span className="text-[10px] font-bold text-muted-foreground/40 tracking-widest">{t("participating_team")}</span>
                                )}
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
