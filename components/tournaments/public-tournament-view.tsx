"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Users, Calendar, Goal, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { PublicMatchList } from "@/components/tournaments/public-match-list";
import { GroupStandings } from "@/components/tournaments/group-standings";
import { TournamentBracket } from "@/components/tournaments/tournament-bracket";
import { ShareButton } from "@/components/tournaments/share-button";
import { PrintButton } from "@/components/tournaments/print-button";
import { Match, MatchEvent, Team } from "@/types";
import { calculateStandings } from "@/utils/standings";
import { createClient } from "@/utils/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";

interface PublicTournamentViewProps {
    tournament: any;
    initialTeams: Team[];
    initialMatches: Match[];
    initialEvents: MatchEvent[];
}

export function PublicTournamentView({ 
    tournament: initialTournament, 
    initialTeams, 
    initialMatches, 
    initialEvents 
}: PublicTournamentViewProps) {
    const t = useTranslations("PublicView");
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [events, setEvents] = useState<MatchEvent[]>(initialEvents);
    const [tournament, setTournament] = useState(initialTournament);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentTab = searchParams.get('tab') || 'overview';

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'overview') {
            params.delete('tab');
        } else {
            params.set('tab', value);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // 1. Realtime Subscriptions
    useEffect(() => {
        const supabase = createClient();
        
        // Subscribe to Tournament updates
        const tourneyChannel = supabase
            .channel(`public-tournament-${initialTournament.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'tournaments', 
                filter: `id=eq.${initialTournament.id}` 
            }, (payload) => {
                setTournament(payload.new);
            })
            .subscribe();

        // Subscribe to Match updates
        const matchChannel = supabase
            .channel(`public-matches-${initialTournament.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'matches', 
                filter: `tournament_id=eq.${initialTournament.id}` 
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Note: Inserted matches won't have the joined team data immediately.
                    // However, public tournament matches are usually created beforehand by admin.
                    // If a match is added live, we might want to refetch or just wait.
                    // For now, let's keep it simple.
                    setMatches(prev => [...prev, payload.new as Match]);
                } else if (payload.eventType === 'UPDATE') {
                    setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                } else if (payload.eventType === 'DELETE') {
                    setMatches(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe();

        // Subscribe to Match Events (for live scores)
        const eventChannel = supabase
            .channel(`public-events-${initialTournament.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'match_events'
                // Filter by tournament_id if it existed, but it doesn't. 
                // We'd need to filter by match_id in matchIds.
                // Supabase allows many filters or we can just subscribe to all for this tournament's matches.
            }, (payload) => {
                // We'll only care about events for matches in our list
                const matchIds = matches.map(m => m.id);
                if (payload.new && !matchIds.includes((payload.new as any).match_id)) return;
                if (payload.old && !matchIds.includes((payload.old as any).match_id)) return;

                if (payload.eventType === 'INSERT') {
                    setEvents(prev => [payload.new as MatchEvent, ...prev]);
                } else if (payload.eventType === 'DELETE') {
                    setEvents(prev => prev.filter(e => e.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    setEvents(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(tourneyChannel);
            supabase.removeChannel(matchChannel);
            supabase.removeChannel(eventChannel);
        };
    }, [initialTournament.id, matches.length]);

    // 2. Computed Standings
    const standings = useMemo(() => {
        return calculateStandings(initialTeams, matches);
    }, [initialTeams, matches]);

    const completedMatches = matches.filter(m => m.status === 'finished').length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0);

    return (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-6">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="shrink-0 border-white/5 bg-white/5 hover:bg-white/10 hover:border-secondary/50 rounded-none transition-all group" 
                        asChild
                    >
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{tournament.format}</Badge>
                            <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {tournament.status || 'draft'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <PrintButton />
                    <ShareButton tournamentId={tournament.id} />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-2xl font-bold">{initialTeams.length || 0}</p>
                            <p className="text-xs text-muted-foreground">{t("teams")}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-2xl font-bold">{completedMatches}</p>
                            <p className="text-xs text-muted-foreground">{t("matches_played")}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                        <Goal className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-2xl font-bold">{totalGoals}</p>
                            <p className="text-xs text-muted-foreground">{t("total_goals")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 print:hidden">
                    <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
                    <TabsTrigger value="matches">{t("matches")}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                    {tournament.description && (
                        <Card className="border-none bg-white/5 rounded-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary/80">{t("about_tournament") || "About Tournament"}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div 
                                    className="prose prose-invert prose-sm max-w-none text-muted-foreground font-medium"
                                    dangerouslySetInnerHTML={{ __html: tournament.description }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {(tournament.format === 'league' || tournament.format === 'league_ha') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("league_table")}</CardTitle>
                                <CardDescription>{t("league_table_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StandingsTable standings={standings} />
                            </CardContent>
                        </Card>
                    )}

                    {tournament.format === 'group_knockout' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("group_standings")}</CardTitle>
                                <CardDescription>{t("group_standings_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GroupStandings teams={initialTeams} matches={matches} isPublic={true} />
                            </CardContent>
                        </Card>
                    )}

                    {(tournament.format === 'knockout' || tournament.format === 'group_knockout') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("bracket")}</CardTitle>
                                <CardDescription>{t("bracket_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TournamentBracket matches={matches} isPublic={true} />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="matches">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("fixtures_results")}</CardTitle>
                            <CardDescription>{t("fixtures_results_desc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PublicMatchList matches={matches} tournamentId={tournament.id} events={events} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    );
}
