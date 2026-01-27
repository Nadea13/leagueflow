import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddTeamForm } from "@/components/tournaments/add-team-form";
import { FixtureGenerator } from "@/components/tournaments/fixture-generator";
import { MatchCard } from "@/components/tournaments/match-card";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { TeamList } from "@/components/tournaments/team-list";
import { GroupStandings } from "@/components/tournaments/group-standings";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { GroupManager } from "@/components/tournaments/group-manager";
import { Match } from "@/types/index";
import { getMembers } from "@/app/[locale]/dashboard/tournaments/[id]/member-actions";
import { ShareButton } from "@/components/tournaments/share-button";
import { TopScorersTable } from "@/components/tournaments/top-scorers-table";
import { getTranslations } from "next-intl/server";
import { calculateStandings } from "@/utils/standings";
import { SettingsTab } from "@/components/tournaments/settings-tab";
import { FixturesManager } from "@/components/tournaments/fixtures-manager";
import { NextRoundButton } from "@/components/tournaments/next-round-button";


export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const t = await getTranslations("Tournament");
    const tCommon = await getTranslations("Common");

    const supabase = await createClient();

    // Fetch tournament details
    const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

    if (tournamentError || !tournament) {
        notFound();
        console.error(tournamentError);
    }

    // Fetch teams
    const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", id)
        .order("created_at", { ascending: true });

    // Fetch match count to check if fixtures exist
    const { data: matches } = await supabase
        .from("matches")
        .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(name, logo_url),
            away_team:teams!matches_away_team_id_fkey(name, logo_url)
        `)
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("match_index", { ascending: true }) // Ensure bracket order
        .order("created_at", { ascending: true });

    // Fetch goals for Top Scorers
    let tournamentGoals: any[] = [];
    if (matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        const { data: goalsData } = await supabase
            .from("goals")
            .select("*")
            .in("match_id", matchIds);
        tournamentGoals = goalsData || [];
    }

    // Calculate Standings (Client-side / Server-side logic)
    const calculatedStandings = calculateStandings(teams || [], matches as Match[] || []);

    const hasFixtures = matches ? matches.length > 0 : false;

    // Fetch members
    const membersRes = await getMembers(id);
    const members = membersRes?.success ? membersRes.data : [];

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link
                    href="/dashboard"
                    className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> {tCommon("back_to_dashboard")}
                </Link>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">{tournament?.name}</h1>
                    <Badge variant="outline" className="capitalize">{tournament?.format}</Badge>
                    <Badge variant={tournament?.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {tournament?.status || 'draft'}
                    </Badge>
                    <ShareButton tournamentId={id} />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
                    <TabsTrigger value="teams">{t("teams")} ({teams?.length || 0})</TabsTrigger>
                    <TabsTrigger value="fixtures">{t("fixtures")}</TabsTrigger>
                    <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
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
                                <GroupStandings teams={teams || []} matches={matches || []} />
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
                                <TournamentBracket matches={matches as Match[] || []} />
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. Top Scorers */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("top_scorers")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TopScorersTable goals={tournamentGoals} teams={teams || []} />
                        </CardContent>
                    </Card>
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
                                <AddTeamForm tournamentId={id} />
                            </div>

                            {/* Group Manager (Only for Group formats) */}
                            {tournament?.format?.includes("group") && (
                                <GroupManager teams={teams || []} tournamentId={id} />
                            )}

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm">{t("participating_teams")} ({teams?.length || 0})</h3>
                                <TeamList teams={teams || []} tournamentId={id} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Fixtures Tab */}
                <TabsContent value="fixtures" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("match_schedule")}</CardTitle>
                            <CardDescription>{t("manage_fixtures")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Generator Button */}
                            <div className="mb-6">
                                <FixtureGenerator tournamentId={id} hasFixtures={hasFixtures} />
                            </div>

                            {/* Fixtures List */}
                            <FixturesManager
                                teams={teams || []}
                                matches={matches as Match[] || []}
                                tournamentId={id}
                                goals={tournamentGoals}
                            />

                            {/* Hide Next Round Button for League formats */}
                            {!(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                                <NextRoundButton
                                    tournamentId={id}
                                    matches={matches as Match[] || []}
                                    format={tournament?.format || 'league'}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <SettingsTab tournament={tournament} hasFixtures={hasFixtures} members={members || []} />
                </TabsContent>
            </Tabs>
        </div>
    );
}