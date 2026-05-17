"use client";

import { Users, CalendarDays, Trophy } from "lucide-react";
import { Match, Team, Goal } from "@/types/index";
import { useTranslations } from "next-intl";
import { StatsCards } from "@/components/shared/stats-cards";

interface TournamentStatsProps {
    teams: Team[];
    matches: Match[];
    goals: Goal[];
}

export function TournamentStats({ teams, matches, goals }: TournamentStatsProps) {
    // Calculate stats
    const totalTeams = teams.length;
    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'finished').length;
    const totalGoals = goals.length;

    const t = useTranslations("Tournament");

    return (
        <StatsCards 
            items={[
                {
                    label: t("stats_participating_teams"),
                    value: totalTeams,
                    icon: Users,
                    description: t("stats_teams_registered")
                },
                {
                    label: t("stats_matches"),
                    value: `${completedMatches}/${totalMatches}`,
                    icon: CalendarDays,
                    description: t("stats_matches_played")
                },
                {
                    label: t("stats_total_goals"),
                    value: totalGoals,
                    icon: Trophy,
                    description: t("stats_goals_scored")
                }
            ]}
        />
    );
}
