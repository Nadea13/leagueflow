"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddTeamForm } from "@/components/tournaments/add-team-form";
import { FixtureGenerator } from "@/components/tournaments/fixture-generator";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { TeamList } from "@/components/tournaments/team-list";
import { GroupStandings } from "@/components/tournaments/group-standings";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { GroupManager } from "@/components/tournaments/group-manager";
import { Match, Team, Goal } from "@/types/index";
import { ShareButton } from "@/components/tournaments/share-button";
import { TopScorersTable } from "@/components/tournaments/top-scorers-table";
import { calculateStandings } from "@/utils/standings";
import { SettingsTab } from "@/components/tournaments/settings-tab";
import { FixturesManager } from "@/components/tournaments/fixtures-manager";
import { NextRoundButton } from "@/components/tournaments/next-round-button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface TournamentContentProps {
    tournament: any;
    initialMatches: Match[];
    initialTeams: Team[];
    initialGoals: Goal[];
    userPlan: string | undefined;
    isPro: boolean;
    id: string;
    userRole: 'admin' | 'editor' | 'viewer' | null;
}

export function TournamentContent({
    tournament: initialTournament,
    initialMatches,
    initialTeams,
    initialGoals,
    userPlan,
    isPro,
    id,
    userRole
}: TournamentContentProps) {
    const t = useTranslations("Tournament");
    const tCommon = useTranslations("Common");
    const router = useRouter();
    const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<Team[]>(initialTeams);
    const [goals, setGoals] = useState<Goal[]>(initialGoals);

    // Update state when props change (server revalidation)
    useEffect(() => {
        setTournament(initialTournament);
        setMatches(initialMatches);
        setTeams(initialTeams);
        setGoals(initialGoals);
    }, [initialTournament, initialMatches, initialTeams, initialGoals]);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`tournament-${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'matches',
                filter: `tournament_id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMatches(prev => [...prev, payload.new as Match]);
                } else if (payload.eventType === 'UPDATE') {
                    setMatches(prev => prev.map(m => m.id === payload.new.id ? payload.new as Match : m));
                } else if (payload.eventType === 'DELETE') {
                    setMatches(prev => prev.filter(m => m.id !== payload.old.id));
                }
                router.refresh(); // Refresh mainly for server actions/derived states if needed
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'teams',
                filter: `tournament_id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTeams(prev => [...prev, payload.new as Team]);
                } else if (payload.eventType === 'UPDATE') {
                    setTeams(prev => prev.map(t => t.id === payload.new.id ? payload.new as Team : t));
                } else if (payload.eventType === 'DELETE') {
                    setTeams(prev => prev.filter(t => t.id !== payload.old.id));
                }
                router.refresh();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournaments',
                filter: `id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setTournament(payload.new);
                }
                router.refresh();
            })
            // Goals subscription could be added here if needed for realtime top scorers
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, router, supabase]);

    // Derived State
    const hasFixtures = matches.length > 0;

    // Calculate Standings
    const calculatedStandings = calculateStandings(teams, matches);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="shrink-0" asChild>
                    <Link href="/dashboard">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">{tournament?.name}</h1>
                    <Badge variant="outline" className="capitalize">{tournament?.format}</Badge>
                    <Badge className={cn(
                        "capitalize",
                        tournament?.status === 'active' && "bg-green-600 hover:bg-green-700",
                        tournament?.status === 'completed' && "bg-gray-500 hover:bg-gray-600",
                        (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black"
                    )}>
                        {tournament?.status || 'draft'}
                    </Badge>
                    <ShareButton tournamentId={id} />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full md:w-fit h-auto flex flex-wrap justify-start bg-muted p-1">
                    <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
                    <TabsTrigger value="teams">{t("teams")} ({teams?.length || 0})</TabsTrigger>
                    <TabsTrigger value="fixtures">{t("fixtures")}</TabsTrigger>
                    {userRole === 'admin' && (
                        <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
                    )}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-8">
                    {/* 1. League Table (For 'league' AND 'league_ha') */}
                    {(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("standings")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StandingsTable standings={calculatedStandings} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. Group Standings (Only for 'group_knockout') */}
                    {tournament?.format === 'group_knockout' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("group_standings")}</CardTitle>
                                <CardDescription>{t("group_standings_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GroupStandings teams={teams} matches={matches} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. Knockout Bracket (For 'knockout' OR 'group_knockout') */}
                    {(tournament?.format === 'knockout' || tournament?.format === 'group_knockout') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("bracket")}</CardTitle>
                                <CardDescription>{t("bracket_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TournamentBracket matches={matches} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. Top Scorers - Only for Pro */}
                    {isPro && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("top_scorers")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TopScorersTable goals={goals} teams={teams} />
                            </CardContent>
                        </Card>
                    )}
                    {!isPro && (
                        <Card className="opacity-70">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    {t("top_scorers")}
                                    <Badge variant="outline">Pro Feature</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                    <p>Upgrade to Pro to view Top Scorers</p>
                                    <Button variant="link" asChild className="mt-2">
                                        <Link href="/dashboard/billing">View Plans</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Teams Tab */}
                <TabsContent value="teams" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teams")}</CardTitle>
                            <CardDescription>{t("manage_teams")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/50">
                                <h3 className="font-semibold text-sm">{t("add_team")}</h3>
                                <AddTeamForm
                                    tournamentId={id}
                                    isLimitReached={
                                        // If isPro is true (which now includes shared tournaments), no limit.
                                        // Otherwise check the free plan limit.
                                        !isPro && (teams?.length || 0) >= 8
                                    }
                                />
                            </div>

                            {/* Group Manager (Only for Group formats) */}
                            {tournament?.format?.includes("group") && (
                                <GroupManager teams={teams} tournamentId={id} />
                            )}

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm">{t("participating_teams")} ({teams?.length || 0})</h3>
                                <TeamList teams={teams} tournamentId={id} isPro={isPro} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Fixtures Tab */}
                <TabsContent value="fixtures" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 space-y-0">
                            <div className="space-y-1">
                                <CardTitle>{t("match_schedule")}</CardTitle>
                                <CardDescription>{t("manage_fixtures")}</CardDescription>
                            </div>
                            <div className="w-full md:w-auto">
                                <FixtureGenerator tournamentId={id} hasFixtures={hasFixtures} className="w-full md:w-auto" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Fixtures List */}
                            <FixturesManager
                                teams={teams}
                                matches={matches}
                                tournamentId={id}
                                goals={goals}
                                isPro={isPro}
                            />

                            {/* Hide Next Round Button for League formats */}
                            {!(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                                <NextRoundButton
                                    tournamentId={id}
                                    matches={matches}
                                    format={tournament?.format || 'league'}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                {userRole === 'admin' && (
                    <TabsContent value="settings">
                        <SettingsTab tournament={tournament} hasFixtures={hasFixtures} userPlan={userPlan} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
