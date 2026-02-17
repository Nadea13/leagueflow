import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Trophy } from "lucide-react";
import { Match, Team, Goal } from "@/types/index";
import { useTranslations } from "next-intl";

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
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("stats_participating_teams")}
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalTeams}</div>
                    <p className="text-xs text-muted-foreground">
                        {t("stats_teams_registered")}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("stats_matches")}
                    </CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedMatches} <span className="text-muted-foreground text-sm font-normal">/ {totalMatches}</span></div>
                    <p className="text-xs text-muted-foreground">
                        {t("stats_matches_played")}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("stats_total_goals")}
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalGoals}</div>
                    <p className="text-xs text-muted-foreground">
                        {t("stats_goals_scored")}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
