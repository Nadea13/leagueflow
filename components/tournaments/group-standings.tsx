"use client";

import { Match, Team } from "@/types/index";
import { StandingsTable } from "./standings-table";
import { calculateStandings } from "@/lib/standings";
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
        <div className="space-y-4 md:space-y-6">
            <div id="group-standings-canvas" className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
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
                        <div key={group} className="space-y-4 md:space-y-6">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-3 relative z-10">
                                    <span className="w-2 h-2 bg-secondary rounded-none shadow-[0_0_10px_rgba(0,196,154,0.4)]" />
                                    {t("group_header", { group })}
                                </h3>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground/60">Group Stage Standings</p>
                            </div>
                            
                            <div className="bg-background border border-border/10 rounded-none relative overflow-hidden transition-colors shadow-xl shadow-black/20">
                                <div className="absolute top-0 left-0 z-30 w-1 h-full bg-secondary" />
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
