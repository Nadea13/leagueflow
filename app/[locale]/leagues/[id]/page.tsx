import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Trophy } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { PublicMatchList } from "@/components/tournaments/public-match-list";
import { ShareButton } from "@/components/tournaments/share-button";
import { GroupStandings } from "@/components/tournaments/group-standings";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { Match } from "@/types/index";
import { calculateStandings } from "@/utils/standings";

export default async function PublicLeaguePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Tournament
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

    if (!tournament) {
        notFound();
    }

    // 2. Fetch Teams
    const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", id)
        .order("created_at", { ascending: true });

    // 3. Fetch Matches
    const { data: matches } = await supabase
        .from("matches")
        .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(name, logo_url),
        away_team:teams!matches_away_team_id_fkey(name, logo_url)
    `)
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("created_at", { ascending: true });

    // Calculate Standings
    const calculatedStandings = calculateStandings(teams || [], matches as Match[] || []);

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            {/* Navbar */}
            <nav className="border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                        <Trophy className="h-6 w-6 text-primary" />
                        <span>LeagueFlow</span>
                    </Link>
                    <div className="text-sm text-muted-foreground">
                        Public View
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-4xl">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{tournament.format}</Badge>
                            <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {tournament.status || 'draft'}
                            </Badge>
                        </div>
                    </div>
                    <ShareButton tournamentId={tournament.id} />
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="matches">Matches</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-8">
                        {/* 1. League Table (For 'league' OR 'league_ha') */}
                        {(tournament?.format === 'league' || tournament?.format === 'league_ha') && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>League Table</CardTitle>
                                    <CardDescription>Current standings and statistics.</CardDescription>
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
                                    <CardTitle>Group Standings</CardTitle>
                                    <CardDescription>Group stage rankings.</CardDescription>
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
                                    <CardTitle>Tournament Bracket</CardTitle>
                                    <CardDescription>Knockout stage progress.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TournamentBracket matches={matches as Match[] || []} />
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="matches">
                        <Card>
                            <CardHeader>
                                <CardTitle>Fixtures & Results</CardTitle>
                                <CardDescription>Match schedule and scores.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PublicMatchList matches={matches || []} tournamentId={id} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

            </main>
        </div>
    );
}
