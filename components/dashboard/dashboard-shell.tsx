"use client";

import { useTranslations } from "next-intl";
import { TournamentCreate } from "@/components/tournaments/management/create-tournament-form";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { StatsCards } from "@/components/shared/stats-cards";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Link } from "@/i18n/routing";
import { ArrowRight, Users, FileText, Trophy, Activity, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BecomeOrganizerButton } from "@/components/dashboard/become-organizer-button";


import { Tournament, Team } from "@/types/index";

interface DashboardShellProps {
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

export function DashboardShell({ tournaments, teams, userPlan, metrics, isOrganizer, forcedMode }: DashboardShellProps) {
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
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase leading-none">
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

                <StatsCards
                    items={[
                        {
                            label: t("total_teams"),
                            value: metrics.totalTeams,
                            icon: Users,
                            color: "secondary",
                            description: t("all_time_teams")
                        },
                        {
                            label: t("assigned_teams"),
                            value: metrics.assignedTeams,
                            icon: Trophy,
                            color: "primary",
                            description: t("assigned_desc")
                        },
                        {
                            label: t("pending_registrations"),
                            value: metrics.pendingRegistrations,
                            icon: FileText,
                            color: "orange-500",
                            description: t("pending_desc")
                        }
                    ]}
                />

                <div className="space-y-4 md:space-y-6">
                    {(!teams || teams.length === 0) ? (
                        <EmptyState
                            icon={Users}
                            title={tTeam("no_teams_yet")}
                            description={tTeam("my_teams_desc")}
                            action={<CreateTeamDialog />}
                        />
                    ) : (
                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {teams.slice(0, 3).map((team) => (
                                <DashboardCard
                                    key={team.id}
                                    type="team"
                                    data={team}
                                    mode={mode}
                                />
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
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase leading-none">{t("title")}</h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("welcome")}
                    </p>
                </div>
                <div className="flex items-center">
                    <TournamentCreate isPro={userPlan !== 'free'} />
                </div>
            </div>

            <StatsCards
                items={[
                    {
                        label: t("total_tournaments"),
                        value: totalTournaments,
                        icon: Trophy,
                        color: "secondary",
                        description: t("all_time")
                    },
                    {
                        label: t("active_now"),
                        value: activeTournaments,
                        icon: Activity,
                        color: "primary",
                        description: t("currently_running")
                    },
                    {
                        label: t("completed"),
                        value: completedTournaments,
                        icon: CheckCircle,
                        color: "secondary",
                        description: t("successfully_finished")
                    }
                ]}
            />

            {!hasTournaments ? (
                <EmptyState
                    action={<TournamentCreate isPro={userPlan !== 'free'} />}
                />
            ) : (
                <div>
                    <div className="space-y-4 md:space-y-6">
                        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {recentTournaments.map((tournament) => (
                                <DashboardCard
                                    key={tournament.id}
                                    type="tournament"
                                    data={tournament}
                                    userPlan={userPlan}
                                />
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
