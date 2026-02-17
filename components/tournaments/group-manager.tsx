"use client";

import { Team } from "@/types/index";
import { assignTeamGroup } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";


import { useTranslations } from "next-intl";

interface GroupManagerProps {
    teams: Team[];
    tournamentId: string;
}

export function GroupManager({ teams, tournamentId }: GroupManagerProps) {
    const t = useTranslations("Group");

    if (!teams || teams.length === 0) return null;

    return (
        <div className="space-y-4 border rounded-xl p-6 mt-6 bg-background shadow-sm">
            <h3 className="font-semibold leading-none tracking-tight">{t("group_assignment")}</h3>
            <p className="text-sm text-muted-foreground">
                {t("group_assignment_desc")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teams.map((team) => (
                    <GroupItem key={team.id} team={team} tournamentId={tournamentId} />
                ))}
            </div>
        </div>
    );
}

function GroupItem({ team, tournamentId }: { team: Team; tournamentId: string }) {
    const t = useTranslations("Group");
    const tCommon = useTranslations("Common");
    const [loading, setLoading] = useState(false);

    const handleGroupChange = async (value: string) => {
        setLoading(true);
        const groupName = value === "none" ? null : value;
        try {
            const result = await assignTeamGroup(team.id, groupName, tournamentId);
            if (!result.success) {
                console.error(result.error);
                alert(`${tCommon("error")}: ${result.error}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <span className="font-medium truncate max-w-[150px]" title={team.name}>
                {team.name}
            </span>
            <div className="flex items-center gap-2">
                {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                <Select
                    defaultValue={team.group_name || "none"}
                    onValueChange={handleGroupChange}
                    disabled={loading}
                >
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue placeholder={t("group")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{tCommon("none") || "None"}</SelectItem>
                        {["A", "B", "C", "D", "E", "F", "G", "H"].map((g) => (
                            <SelectItem key={g} value={g}>
                                {t("group")} {g}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
