"use client";

import { Team } from "@/types/index";
import { updateTeam } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";


interface GroupManagerProps {
    teams: Team[];
    tournamentId: string;
}

export function GroupManager({ teams, tournamentId }: GroupManagerProps) {
    if (!teams || teams.length === 0) return null;

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30 mt-6">
            <h3 className="font-semibold text-lg">Group Assignment</h3>
            <p className="text-sm text-muted-foreground">
                Assign teams to groups before generating fixtures.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                    <GroupItem key={team.id} team={team} tournamentId={tournamentId} />
                ))}
            </div>
        </div>
    );
}

function GroupItem({ team, tournamentId }: { team: Team; tournamentId: string }) {
    const [loading, setLoading] = useState(false);

    const handleGroupChange = async (value: string) => {
        setLoading(true);
        const groupName = value === "none" ? null : value;
        try {
            const formData = new FormData();
            formData.append("name", team.name); // Required by action
            if (groupName) formData.append("group_name", groupName);

            const result = await updateTeam(team.id, formData, tournamentId);
            if (!result.success) {
                console.error(result.error);
                alert("Failed to update group: " + result.error);
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
                        <SelectValue placeholder="Group" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {["A", "B", "C", "D", "E", "F", "G", "H"].map((g) => (
                            <SelectItem key={g} value={g}>
                                Group {g}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
