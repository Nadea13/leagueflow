"use client";

import { useTranslations } from "next-intl";
import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Link } from "@/i18n/routing";
import { ArrowRight, Users, FileText, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BecomeOrganizerButton } from "@/components/dashboard/become-organizer-button";


import { Tournament, Team } from "@/types/index";

interface DashboardUIProps {
    tournaments: (Tournament & { role?: string; tournament_teams?: { count: number }[] })[];
    teams: (Team & { tournament?: { name: string } | null })[];
    userPlan: string;
    isOrganizer?: boolean;
    metrics: {
        totalTeams: number;
        assignedTeams: number;
        pendingRegistrations: number;
    };
    forcedMode?: 'organizer' | 'team';
}

export function DashboardUI({ tournaments, teams, userPlan, metrics, isOrganizer, forcedMode }: DashboardUIProps) {
    const t = useTranslations("Dashboard");
    const tCommon = useTranslations("Common");
    const tTeam = useTranslations("Team");
    const [mode, setMode] = useState<'organizer' | 'team'>(forcedMode || 'team');

    useEffect(() => {
        if (forcedMode) {
            const timer = setTimeout(() => {
                setMode(forcedMode);
            }, 0);
            return () => clearTimeout(timer);
        }

        const timer = setTimeout(() => {
            const savedMode = localStorage.getItem('dashboard-mode') as 'organizer' | 'team';

            if (savedMode === 'organizer' && !isOrganizer) {
                setMode('team');
                localStorage.setItem('dashboard-mode', 'team');
            } else if (savedMode) {
                setMode(savedMode);
            }
        }, 0);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'dashboard-mode') {
                const newMode = e.newValue as 'organizer' | 'team';
                if (newMode === 'organizer' && !isOrganizer) {
                    setMode('team');
                    localStorage.setItem('dashboard-mode', 'team');
                } else {
                    setMode(newMode);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [isOrganizer, forcedMode]);

    const isPro = userPlan !== 'free';
    const recentTournaments = tournaments.slice(0, 3);
    const hasTournaments = tournaments.length > 0;

    // Stats for organizer
    const ownedTournaments = tournaments.filter((t) => t.role === 'owner');
    const totalTournaments = ownedTournaments.length;
    const activeTournaments = ownedTournaments.filter((t) => t.status === 'active').length;
    const completedTournaments = ownedTournaments.filter((t) => t.status === 'completed').length;

    if (mode === 'team') {
        return (
            <div className="flex flex-col gap-4 md:gap-6">
                <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-4 md:pb-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">
                            {tTeam("dashboard")}
                        </h1>
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                            {tTeam("dashboard_desc")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreateTeamDialog />
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-3 md:gap-6 md:grid-cols-3">
                    <Card className="border border-border bg-card shadow-none py-2 md:py-6 overflow-hidden relative group transition-all hover:border-secondary/50">
                        <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                        <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                            <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                                {t("total_teams")}
                            </CardTitle>
                            <Users className="h-4 w-4 text-secondary opacity-80 shrink-0 hidden sm:block" />
                        </CardHeader>
                        <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                            <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">{metrics.totalTeams}</div>
                            <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                                <span className="w-2 h-[1px] bg-secondary/40" />
                                {t("all_time_teams")}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border border-border bg-card shadow-none py-2 md:py-6 overflow-hidden relative group transition-all hover:border-primary/50">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                        <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                            <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                                {t("assigned_teams")}
                            </CardTitle>
                            <Trophy className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                        </CardHeader>
                        <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                            <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">{metrics.assignedTeams}</div>
                            <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                                <span className="w-2 h-[1px] bg-primary/40" />
                                {t("assigned_desc")}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border border-border bg-card shadow-none py-2 md:py-6 overflow-hidden relative group transition-all hover:border-orange-500/50">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/60" />
                        <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-orange-500/5 rotate-12 transition-transform group-hover:scale-110" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                            <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                                {t("pending_registrations")}
                            </CardTitle>
                            <FileText className="h-4 w-4 text-orange-500/80 opacity-80 shrink-0 hidden sm:block" />
                        </CardHeader>
                        <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                            <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">{metrics.pendingRegistrations}</div>
                            <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                                <span className="w-2 h-[1px] bg-orange-500/40" />
                                {t("pending_desc")}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4 md:space-y-6">
                    {(!teams || teams.length === 0) ? (
                        <EmptyState
                            type="team"
                            isPro={isPro}
                            tournaments={tournaments.map(t => ({ id: t.id, name: t.name }))}
                        />
                    ) : (
                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {teams.slice(0, 3).map((team) => (
                                <Link key={team.id} href={`/${(mode as string) === 'organizer' ? 'organizer/teams' : 'manager/my-teams'}/${team.id}`} className="block h-full group">
                                    <Card className="flex flex-col h-full bg-card border border-border transition-all hover:border-secondary/50 overflow-hidden relative shadow-lg cursor-pointer">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                                        <CardHeader className="pt-4 md:pt-6 relative z-10">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                                                    <Avatar className="h-14 w-14 rounded-none border border-border group-hover:border-secondary/30 transition-all shrink-0 p-1 bg-muted/30">
                                                        <AvatarImage src={team.logo_url ?? undefined} alt={team.name} className="object-contain" />
                                                        <AvatarFallback className="rounded-none bg-secondary/5 text-secondary font-black italic">{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="grid gap-1">
                                                        <CardTitle className="text-lg font-black leading-none tracking-tight uppercase italic group-hover:text-secondary transition-colors truncate">
                                                            {team.name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2">
                                                            {team.tournament ? (
                                                                <Badge variant="outline" className="w-fit text-[9px] px-2 py-0.5 border border-secondary/20 bg-secondary/5 text-secondary font-black uppercase italic rounded-none shrink-0">
                                                                    {tCommon("active")}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="w-fit text-[9px] px-2 py-0.5 border-none font-black uppercase italic rounded-none shrink-0 opacity-70">
                                                                    {tTeam("unassigned_badge")}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-4 md:pb-6 text-sm relative z-10">
                                            <div className="grid gap-4">
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/80 bg-muted/20 p-2 border-l-2 border-secondary/30">
                                                    <Trophy className="h-3.5 w-3.5 text-secondary shadow-[0_0_10px_rgba(0,196,154,0.3)]" />
                                                    <span className="truncate uppercase tracking-tight">
                                                        {team.tournament ? team.tournament.name : tTeam("unassigned_badge")}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 italic leading-relaxed">
                                                    {team.description || tTeam("no_description")}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                            {teams.length > 3 && (
                                <Link
                                    href={`/${(mode as string) === 'organizer' ? 'organizer' : 'manager'}/my-teams`}
                                    className="flex flex-col items-center justify-center gap-6 p-6 h-full min-h-[200px] bg-muted/5 hover:bg-secondary/5 transition-all text-muted-foreground hover:text-secondary group border border-dashed border-border hover:border-secondary/50 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary/0 group-hover:bg-secondary/40 transition-all" />
                                    <div className="h-16 w-16 rounded-none bg-background flex items-center justify-center border border-border group-hover:border-secondary group-hover:shadow-[0_0_20px_rgba(0,196,154,0.2)] transition-all rotate-12 group-hover:rotate-0">
                                        <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold uppercase tracking-[0.2em] text-xs">{tCommon("view_all")}</p>
                                        <p className="text-[9px] uppercase font-bold opacity-50">{teams.length} {t("total_teams")}</p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    )}

                    {!isOrganizer && (
                        <div className="mt-8">
                            <BecomeOrganizerButton />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-4 md:pb-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">{t("title")}</h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("welcome")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTournamentDialog isPro={isPro} />
                </div>
            </div>

            <StatsOverview
                totalTournaments={totalTournaments}
                activeTournaments={activeTournaments}
                completedTournaments={completedTournaments}
            />

            {!hasTournaments ? (
                <EmptyState isPro={isPro} />
            ) : (
                <div>
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center justify-between border-b-4 border-secondary/20 pb-4 md:pb-6">
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase italic leading-none">{t("my_tournaments")}</h2>
                        </div>
                        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {recentTournaments.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} userPlan={userPlan} />
                            ))}
                            {tournaments.length > 3 && (
                                <Link
                                    href={`/${(mode as string) === 'organizer' ? 'organizer' : 'manager'}/tournaments`}
                                    className="flex flex-col items-center justify-center gap-6 p-6 h-full min-h-[200px] bg-muted/5 hover:bg-secondary/5 transition-all text-muted-foreground hover:text-secondary group border border-dashed border-border hover:border-secondary/50 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary/0 group-hover:bg-secondary/40 transition-all" />
                                    <div className="h-16 w-16 rounded-none bg-background flex items-center justify-center border border-border group-hover:border-secondary group-hover:shadow-[0_0_20px_rgba(0,196,154,0.2)] transition-all rotate-12 group-hover:rotate-0">
                                        <ArrowRight className="h-7 w-7 transition-transform -rotate-12 group-hover:rotate-0" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold uppercase tracking-[0.2em] text-xs">{tCommon("view_all")}</p>
                                        <p className="text-[9px] uppercase font-bold opacity-50">{tournaments.length} {t("my_tournaments")}</p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
