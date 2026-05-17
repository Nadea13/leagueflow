"use client";

import { Match, Team } from "@/types/index";
import { cn } from "@/lib/utils";
import { Standings as StandingsTable } from "./standings";
import { calculateStandings } from "@/lib/standings";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface StandingsGroupsProps {
    teams: Team[];
    matches: Match[];
    isPublic?: boolean;
    columns?: 1 | 2;
}

export function StandingsGroups({ teams, matches, isPublic: _isPublic = false, columns = 2 }: StandingsGroupsProps) {
    // 1. Group teams by group_name
    const teamsByGroup = teams.reduce((acc, team) => {
        const group = team.group_name || "Unassigned";
        if (!acc[group]) acc[group] = [];
        acc[group].push(team);
        return acc;
    }, {} as Record<string, Team[]>);

    // Sort group names (A, B, C...) and exclude Unassigned
    const sortedGroups = Object.keys(teamsByGroup).filter(g => g !== "Unassigned").sort();

    const t = useTranslations("Tournament");

    if (sortedGroups.length === 0) {
        return (
            <EmptyState
                icon={Trophy}
                title={t("group_standings")}
                description={t("group_standings_empty") || "No groups have been defined for this tournament yet. Assign teams to groups to see standings."}
                className="py-12"
            />
        );
    }

    return (
        <div className="space-y-2 md:space-y-3">
            <div id="group-standings-canvas" className={cn(
                "grid grid-cols-1 gap-2 md:gap-3",
                columns === 2 && "xl:grid-cols-2"
            )}>
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
                        <div key={group} className="space-y-2 md:space-y-3">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3 relative z-10">
                                    <span className="w-2 h-2 bg-primary rounded-none" />
                                    {t("group_header", { group })}
                                </h3>
                            </div>

                            <div className="bg-card border rounded-none relative overflow-hidden transition-colors">
                                <div className="p-0">
                                    <StandingsTable standings={groupStandings} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
