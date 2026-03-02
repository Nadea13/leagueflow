"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, Copy, ExternalLink, Calendar, List, Trophy, GitBranch, Award, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddTeamForm } from "@/components/tournaments/add-team-form";
import { FixtureGenerator } from "@/components/tournaments/fixture-generator";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { TeamList } from "@/components/tournaments/team-list";
import { GroupStandings } from "@/components/tournaments/group-standings";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { GroupManager } from "@/components/tournaments/group-manager";
import { Match, Team, Goal, MatchEvent } from "@/types/index";
import { ShareButton } from "@/components/tournaments/share-button";
import { TopScorersTable } from "@/components/tournaments/top-scorers-table";
import { calculateStandings } from "@/utils/standings";
import { SettingsTab } from "@/components/tournaments/settings-tab";
import { FixturesManager } from "@/components/tournaments/fixtures-manager";
import { FixturesCalendar } from "@/components/tournaments/fixtures-calendar";
import { NextRoundButton } from "@/components/tournaments/next-round-button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { TournamentStats } from "@/components/tournaments/tournament-stats";
import { PlayerStatsTable } from "@/components/tournaments/player-stats-table";
import { BannedPlayersCard } from "@/components/tournaments/banned-players-card";
import { AnnouncementsCard } from "@/components/tournaments/announcements-card";
import { FinancialSummary } from "@/components/tournaments/financial-summary";
import { calculatePlayerStats, getBannedPlayers } from "@/utils/player-stats";

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
    const tSettings = useTranslations("Settings");
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<Team[]>(initialTeams);
    const [goals, setGoals] = useState<Goal[]>(initialGoals);
    const [fixtureView, setFixtureView] = useState<'list' | 'calendar'>('list');
    const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);

    // Update state when props change (server revalidation)
    useEffect(() => {
        setTournament(initialTournament);
        setMatches(initialMatches);
        setTeams(initialTeams);
        setGoals(initialGoals);
    }, [initialTournament, initialMatches, initialTeams, initialGoals]);

    // Fetch match events for player stats
    useEffect(() => {
        const fetchEvents = async () => {
            const matchIds = matches.map(m => m.id);
            if (matchIds.length === 0) {
                setMatchEvents([]);
                return;
            }

            const { data } = await supabase
                .from("match_events")
                .select("*, players(name)")
                .in("match_id", matchIds);

            if (data) {
                const events = data.map((e: any) => ({
                    ...e,
                    player_name: e.players?.name || "Unknown",
                }));
                setMatchEvents(events);
            }
        };

        if (matches.length > 0) {
            fetchEvents();
        }
    }, [matches]);

    // Fetch all players from all teams for stats
    const [allPlayersForStats, setAllPlayersForStats] = useState<{ id: string; name: string; team_id: string; teamName?: string; teamLogoUrl?: string | null }[]>([]);
    useEffect(() => {
        const fetchAllPlayers = async () => {
            const teamIds = teams.map(t => t.id);
            if (teamIds.length === 0) return;

            const { data } = await supabase
                .from("players")
                .select("id, name, team_id")
                .in("team_id", teamIds);

            if (data) {
                const playersWithTeam = data.map((p: any) => {
                    const team = teams.find(t => t.id === p.team_id);
                    return {
                        ...p,
                        teamName: team?.name,
                        teamLogoUrl: team?.logo_url,
                    };
                });
                setAllPlayersForStats(playersWithTeam);
            }
        };

        fetchAllPlayers();
    }, [teams]);

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
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, router, supabase]);

    // Derived State
    const hasFixtures = matches.length > 0;

    // Calculate Standings
    const calculatedStandings = calculateStandings(teams, matches);

    // Player stats
    const playerStats = calculatePlayerStats(matchEvents, allPlayersForStats, null);
    const bannedPlayers = getBannedPlayers(matchEvents, allPlayersForStats, null);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="shrink-0" asChild>
                    <Link href="/dashboard">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-4 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{tournament?.name}</h1>
                    <Badge variant="outline" className="capitalize">{tournament?.format}</Badge>
                    <Badge className={cn(
                        "capitalize",
                        tournament?.status === 'active' && "bg-green-600 hover:bg-green-700",
                        tournament?.status === 'completed' && "bg-gray-500 hover:bg-gray-600",
                        (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black"
                    )}>
                        {tSettings(tournament?.status || 'draft')}
                    </Badge>
                </div>
                <ShareButton tournamentId={id} />
            </div>

            {/* Stats Overview */}
            <TournamentStats teams={teams} matches={matches} goals={goals} />

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
                <TabsContent value="overview" className="space-y-6">
                    {/* 1. League Table (For 'league' AND 'league_ha') */}
                    {(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" />{t("standings")}</CardTitle>
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
                                <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" />{t("group_standings")}</CardTitle>
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
                                <CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" />{t("bracket")}</CardTitle>
                                <CardDescription>{t("bracket_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent className="hidden md:block w-[calc(100vw)] overflow-x-auto">
                                <TournamentBracket matches={matches} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. Announcements */}
                    <AnnouncementsCard
                        tournamentId={id}
                        isEditable={userRole === 'admin' || userRole === 'editor'}
                    />

                    {/* 5. Top Scorers */}
                    {isPro && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Award className="h-4 w-4" />{t("top_scorers")}</CardTitle>
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
                                    <span className="flex items-center gap-2"><Award className="h-4 w-4" />{t("top_scorers")}</span>
                                    <Badge variant="outline">{t("upsell_pro_feature")}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>{t("upsell_pro_required")}</p>
                                    <Button variant="link" asChild className="mt-2">
                                        <Link href="/dashboard/billing">{t("upsell_view_plans")}</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 6. Player Stats */}
                    {isPro && playerStats.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Player Statistics</CardTitle>
                                <CardDescription>Goals, assists, and disciplinary records</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PlayerStatsTable stats={playerStats} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 7. Financial Summary - Only for Pro */}
                    {isPro && (
                        <FinancialSummary tournamentId={id} />
                    )}

                    {/* 8. Banned Players Alert */}
                    <BannedPlayersCard bannedPlayers={bannedPlayers} />
                </TabsContent>

                {/* Teams Tab */}
                <TabsContent value="teams" className="space-y-6">
                    <div className="flex flex-col gap-4 p-6 border rounded-none bg-card shadow-sm">
                        <h3 className="font-semibold leading-none tracking-tight">{t("add_team")}</h3>
                        <AddTeamForm
                            tournamentId={id}
                            isLimitReached={
                                !isPro && (teams?.length || 0) >= 8
                            }
                        />

                        {/* Public Registration Link - Only for Pro */}
                        {isPro && (
                            <>
                                <div className="border-t my-2 pt-2" />
                                <div className="flex flex-col gap-2">
                                    <Label>{t("public_link")}</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                readOnly
                                                value={typeof window !== 'undefined' ? `${window.location.origin}/register/${id}` : `/register/${id}`}
                                                className="bg-muted/50 font-mono text-sm"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                const url = `${window.location.origin}/register/${id}`;
                                                navigator.clipboard.writeText(url);
                                                toast({ title: tCommon("copied"), description: tCommon("copied_desc") });
                                            }}
                                            title={tCommon("copy_link")}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            asChild
                                            title={tCommon("open_link")}
                                        >
                                            <a href={`/register/${id}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Group Manager (Only for Group formats) */}
                    {tournament?.format?.includes("group") && (
                        <GroupManager teams={teams} tournamentId={id} />
                    )}

                    <div className="space-y-4 border rounded-none p-6 bg-card shadow-sm">
                        <h3 className="font-semibold leading-none tracking-tight">{t("participating_teams")} ({teams?.length || 0})</h3>
                        <TeamList teams={teams} tournamentId={id} isPro={isPro} />
                    </div>
                </TabsContent>

                {/* Fixtures Tab */}
                <TabsContent value="fixtures" className="space-y-6">
                    <div className="flex flex-col gap-6 p-6 border rounded-none bg-card shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-semibold leading-none tracking-tight">{t("match_schedule")}</h3>
                                <p className="text-sm text-muted-foreground">{t("manage_fixtures")}</p>
                            </div>
                            <div className="flex flex-col md:flex-row w-full md:w-auto items-stretch md:items-center gap-2">
                                {/* View Toggle */}
                                <div className="flex border rounded-none w-full md:w-auto">
                                    <Button
                                        variant={fixtureView === 'list' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="rounded-r-none h-8 flex-1 md:flex-none"
                                        onClick={() => setFixtureView('list')}
                                    >
                                        <List className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={fixtureView === 'calendar' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="rounded-l-none h-8 flex-1 md:flex-none"
                                        onClick={() => setFixtureView('calendar')}
                                    >
                                        <Calendar className="h-4 w-4" />
                                    </Button>
                                </div>
                                {!hasFixtures && (
                                    <FixtureGenerator tournamentId={id} hasFixtures={hasFixtures} className="w-full md:w-auto" />
                                )}
                            </div>
                        </div>

                        {/* Fixtures View */}
                        {fixtureView === 'list' ? (
                            <FixturesManager
                                teams={teams}
                                matches={matches}
                                tournamentId={id}
                                goals={goals}
                                isPro={isPro}
                            />
                        ) : (
                            <FixturesCalendar matches={matches} />
                        )}

                        {/* Hide Next Round Button for League formats */}
                        {!(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                            <NextRoundButton
                                tournamentId={id}
                                matches={matches}
                                format={tournament?.format || 'league'}
                            />
                        )}
                    </div>
                </TabsContent>

                {/* Settings Tab */}
                {userRole === 'admin' && (
                    <TabsContent value="settings" className="space-y-6">
                        <SettingsTab tournament={tournament} hasFixtures={hasFixtures} userPlan={userPlan} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
