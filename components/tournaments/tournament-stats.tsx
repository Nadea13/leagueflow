"use client";

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
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="rounded-none bg-card border border-border/40 relative overflow-hidden transition-all hover:border-secondary/50 group shadow-lg">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 md:px-6 py-4 md:py-5 relative z-10">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-secondary transition-colors">
                        {t("stats_participating_teams")}
                    </CardTitle>
                    <Users className="h-4 w-4 text-secondary/40 group-hover:text-secondary transition-colors shrink-0" />
                </CardHeader>
                <CardContent className="relative z-10 px-4 md:px-6 pt-0 md:pt-0 pb-6">
                    <div className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">{totalTeams}</div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/40 mt-2 flex items-center gap-1.5">
                        <span className="w-3 h-[1px] bg-secondary/20" />
                        {t("stats_teams_registered")}
                    </p>
                </CardContent>
            </Card>

            <Card className="rounded-none bg-card border border-border/40 relative overflow-hidden transition-all hover:border-secondary/50 group shadow-lg">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 md:px-6 py-4 md:py-5 relative z-10">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-secondary transition-colors">
                        {t("stats_matches")}
                    </CardTitle>
                    <CalendarDays className="h-4 w-4 text-secondary/40 group-hover:text-secondary transition-colors shrink-0" />
                </CardHeader>
                <CardContent className="relative z-10 px-4 md:px-6 pt-0 md:pt-0 pb-6">
                    <div className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                        {completedMatches} <span className="text-muted-foreground text-xs md:text-base font-black opacity-30 mt-auto pb-1 md:pb-2">/ {totalMatches}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/40 mt-2 flex items-center gap-1.5">
                        <span className="w-3 h-[1px] bg-secondary/20" />
                        {t("stats_matches_played")}
                    </p>
                </CardContent>
            </Card>

            <Card className="rounded-none bg-card border border-border/40 relative overflow-hidden transition-all hover:border-secondary/50 group shadow-lg">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 md:px-6 py-4 md:py-5 relative z-10">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-secondary transition-colors">
                        {t("stats_total_goals")}
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-secondary/40 group-hover:text-secondary transition-colors shrink-0" />
                </CardHeader>
                <CardContent className="relative z-10 px-4 md:px-6 pt-0 md:pt-0 pb-6">
                    <div className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">{totalGoals}</div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/40 mt-2 flex items-center gap-1.5">
                        <span className="w-3 h-[1px] bg-secondary/20" />
                        {t("stats_goals_scored")}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
