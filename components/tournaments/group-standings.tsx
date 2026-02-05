"use client";

import { Match, Team } from "@/types/index";
import { StandingsTable } from "./standings-table";
import { calculateStandings } from "@/utils/standings";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";
import { useTranslations } from "next-intl";

interface GroupStandingsProps {
    teams: Team[];
    matches: Match[];
}

export function GroupStandings({ teams, matches }: GroupStandingsProps) {
    // 1. Group teams by group_name
    const teamsByGroup = teams.reduce((acc, team) => {
        const group = team.group_name || "Unassigned";
        if (!acc[group]) acc[group] = [];
        acc[group].push(team);
        return acc;
    }, {} as Record<string, Team[]>);

    // Sort group names (A, B, C...)
    const sortedGroups = Object.keys(teamsByGroup).sort();

    const t = useTranslations("GroupStandings");

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <ExportToImageButton targetId="group-standings-canvas" filename="group_standings" label={t("export") || "Export Groups"} />
            </div>
            <div id="group-standings-canvas" className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-1">
                {sortedGroups.map((group) => {
                    const groupTeams = teamsByGroup[group];
                    // Filter matches relevant to this group
                    const groupMatches = matches.filter(m => {
                        const groupTeamIds = new Set(groupTeams.map(t => t.id));
                        return m.stage === 'group' && (groupTeamIds.has(m.home_team_id || "") || groupTeamIds.has(m.away_team_id || ""));
                    });

                    // Calculate standings
                    const groupStandings = calculateStandings(groupTeams, groupMatches);

                    return (
                        <div key={group} className="space-y-3">
                            <h3 className="font-bold text-lg px-1">Group {group}</h3>
                            <StandingsTable standings={groupStandings} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
