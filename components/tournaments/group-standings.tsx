"use client";

import { Match, Team } from "@/types/index";
import { StandingsTable } from "./standings-table";
import { calculateStandings } from "@/utils/standings";
import { useTranslations } from "next-intl";

interface GroupStandingsProps {
    teams: Team[];
    matches: Match[];
    isPublic?: boolean;
}

export function GroupStandings({ teams, matches, isPublic = false }: GroupStandingsProps) {
    // 1. Group teams by group_name
    const teamsByGroup = teams.reduce((acc, team) => {
        const group = team.group_name || "Unassigned";
        if (!acc[group]) acc[group] = [];
        acc[group].push(team);
        return acc;
    }, {} as Record<string, Team[]>);

    // Sort group names (A, B, C...)
    const sortedGroups = Object.keys(teamsByGroup).sort();

    const t = useTranslations("Tournament");

    return (
        <div className="space-y-4">
            <div id="group-standings-canvas" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                        <div key={group} className="flex flex-col gap-4 p-4 md:p-6 bg-card border border-border/40 relative overflow-hidden shadow-lg group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                            <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 relative z-10">
                                <span className="w-1.5 h-1.5 bg-secondary rounded-none shadow-[0_0_8px_rgba(0,196,154,0.6)]" />
                                {t("group_header", { group })}
                            </h3>
                            <div className="relative z-10">
                                <StandingsTable standings={groupStandings} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
