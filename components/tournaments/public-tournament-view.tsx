"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Users, Calendar, Goal as GoalIcon, ArrowLeft, GitBranch, Award } from "lucide-react";
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
import { Match, MatchEvent, Team, Goal } from "@/types";
import { calculateStandings } from "@/utils/standings";
import { createClient } from "@/utils/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

import { TournamentStats } from "@/components/tournaments/tournament-stats";
import { PlayerStatsTable } from "@/components/tournaments/player-stats-table";
import { BannedPlayersCard } from "@/components/tournaments/banned-players-card";
import { TopScorersTable } from "@/components/tournaments/top-scorers-table";
import { calculatePlayerStats, getBannedPlayers } from "@/utils/player-stats";

interface PublicTournamentViewProps {
    tournament: any;
    initialTeams: Team[];
    initialMatches: Match[];
    initialEvents: MatchEvent[];
    initialGoals: Goal[];
    initialPlayers: any[];
}

export function PublicTournamentView({
    tournament: initialTournament,
    initialTeams,
    initialMatches,
    initialEvents,
    initialGoals,
    initialPlayers
}: PublicTournamentViewProps) {
    const t = useTranslations("PublicView");
    const tTournament = useTranslations("Tournament");
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [events, setEvents] = useState<MatchEvent[]>(initialEvents);
    const [tournament, setTournament] = useState(initialTournament);
    const [goals, setGoals] = useState<Goal[]>(initialGoals || []);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const allPlayersForStats = useMemo(() => {
        return (initialPlayers || []).map(p => ({
            ...p,
            teamName: initialTeams.find(t => t.id === p.team_id)?.name,
            teamLogoUrl: initialTeams.find(t => t.id === p.team_id)?.logo_url
        }));
    }, [initialPlayers, initialTeams]);

    const playerStats = useMemo(() => {
        return calculatePlayerStats(events, allPlayersForStats, null);
    }, [allPlayersForStats, events]);

    const bannedPlayers = useMemo(() => {
        return getBannedPlayers(events, allPlayersForStats, null);
    }, [allPlayersForStats, events]);

    const standings = useMemo(() => {
        return calculateStandings(initialTeams, matches);
    }, [initialTeams, matches]);

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

    useEffect(() => {
        const supabase = createClient();

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

        const matchChannel = supabase
            .channel(`public-matches-${initialTournament.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'matches',
                filter: `tournament_id=eq.${initialTournament.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMatches(prev => [...prev, payload.new as Match]);
                } else if (payload.eventType === 'UPDATE') {
                    setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                } else if (payload.eventType === 'DELETE') {
                    setMatches(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe();

        const eventChannel = supabase
            .channel(`public-events-${initialTournament.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'match_events'
            }, (payload) => {
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
    }, [initialTournament.id, matches.length, matches]);

    return (
        <main className="container mx-auto px-2 md:px-0 py-6 max-w-6xl">
            {/* Unified Header Block - Pro Sports Style */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6 border-b-4 border-secondary/20 pb-4 md:pb-6 mb-4 md:mb-6 relative group">
                <div className="flex items-start gap-3 md:gap-6 w-full">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="rounded-none h-8 w-8 md:h-10 md:w-10 shrink-0 border border-white/10 bg-white/5 hover:bg-secondary hover:text-black transition-all shadow-xl shadow-black/40"
                    >
                        <Link href="/">
                            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </Link>
                    </Button>

                    <div className="flex flex-col flex-1 gap-1 md:gap-2 min-w-0">
                        {/* Metadata Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className="rounded-none font-black italic text-[10px] border-none bg-secondary/10 text-secondary uppercase tracking-widest">
                                {tournament?.format?.replace('_', ' ')}
                            </Badge>

                            <span className="text-[10px] font-black tracking-widest text-muted-foreground italic px-2 border-l border-white/10 uppercase">
                                {initialTeams.length} {tTournament("teams")}
                            </span>

                            <Badge className={cn(
                                "font-black italic border-none px-3 py-1 shadow-lg text-[10px] h-5 uppercase tracking-widest",
                                tournament?.status === 'active' && "bg-green-600 hover:bg-green-700 shadow-green-900/20",
                                tournament?.status === 'completed' && "bg-gray-500 hover:bg-gray-600 shadow-gray-900/20",
                                (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-900/10"
                            )}>
                                {tTournament(tournament?.status || 'draft')}
                            </Badge>

                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 border-none font-black italic uppercase tracking-tighter bg-white/5 text-muted-foreground/60">
                                {t("beta")}
                            </Badge>
                        </div>

                        {/* Title Section */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <h1 className="text-3xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.85] text-foreground drop-shadow-2xl">
                                {tournament?.name}
                            </h1>
                        </div>
                    </div>

                    <div className="md:hidden shrink-0 pt-1 flex items-center gap-2 md:gap-3">
                        <ShareButton tournamentId={tournament.id} />
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 md:gap-3 self-end md:self-start pt-2 md:pt-0">
                    <PrintButton />
                    <ShareButton tournamentId={tournament.id} />
                </div>
            </div>

            <div className="hidden md:block mb-6">
                <TournamentStats
                    matches={matches}
                    teams={initialTeams}
                    goals={goals}
                />
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="flex p-1 bg-muted/20 rounded-none gap-1 border border-border h-auto w-full md:w-max print:hidden backdrop-blur-sm">
                    <TabsTrigger
                        value="overview"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 text-[10px] font-black uppercase italic transition-all rounded-none border-none data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground data-[state=active]:shadow-[0_0_20px_rgba(0,196,154,0.4)] text-muted-foreground hover:text-secondary hover:bg-white/5"
                    >
                        <Trophy className="h-3.5 w-3.5" />
                        {t("overview")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="matches"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 text-[10px] font-black uppercase italic transition-all rounded-none border-none data-[state=active]:!bg-secondary data-[state=active]:!text-secondary-foreground data-[state=active]:shadow-[0_0_20px_rgba(0,196,154,0.4)] text-muted-foreground hover:text-secondary hover:bg-white/5"
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        {t("matches")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                        {(tournament.format === 'league' || tournament.format === 'league_ha') && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Trophy className="h-5 w-5 text-secondary" />
                                        {t("league_table")}
                                    </h2>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("league_table_desc")}</p>
                                </div>
                                <Card className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/2 transition-colors shadow-xl shadow-black/20">
                                    <div className="absolute top-0 left-0 z-30 w-1 h-full bg-secondary" />
                                    <CardContent className="p-0 z-0">
                                        <StandingsTable standings={standings} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {tournament.format === 'group_knockout' && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Trophy className="h-5 w-5 text-secondary" />
                                        {t("group_standings")}
                                    </h2>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("group_standings_desc")}</p>
                                </div>
                                <Card className="bg-background border rounded-none relative overflow-hidden group transition-colors shadow-xl shadow-black/20">
                                    <div className="absolute top-0 left-0 z-30 w-1 h-full bg-secondary" />
                                    <CardContent className="p-0 z-0">
                                        <GroupStandings teams={initialTeams} matches={matches} isPublic={true} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {(tournament.format === 'knockout' || tournament.format === 'group_knockout') && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <GitBranch className="h-5 w-5 text-secondary" />
                                        {t("bracket")}
                                    </h2>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("bracket_desc")}</p>
                                </div>
                                <div className="relative z-10 overflow-x-auto pb-4">
                                    <TournamentBracket matches={matches} isPublic={true} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-white/5">
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                    <Award className="h-5 w-5 text-secondary" />
                                    {t("top_scorers")}
                                </h2>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("top_scorers_desc")}</p>
                            </div>
                            <Card className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/2 transition-colors shadow-xl shadow-black/20">
                                <div className="absolute top-0 left-0 z-30 w-1 h-full bg-secondary" />
                                <CardContent className="p-0 z-0">
                                    <TopScorersTable goals={goals} teams={initialTeams} />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Users className="h-5 w-5 text-secondary" />
                                        {t("player_stats")}
                                    </h2>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("player_stats_desc")}</p>
                                </div>
                                <Card className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/2 transition-colors shadow-xl shadow-black/20">
                                    <div className="absolute top-0 left-0 z-30 w-1 h-full bg-secondary" />
                                    <CardContent className="p-0 z-0">
                                        <div className="overflow-x-auto">
                                            <PlayerStatsTable stats={playerStats} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {bannedPlayers.length > 0 && (
                                <BannedPlayersCard bannedPlayers={bannedPlayers} />
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="matches">
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                <Calendar className="h-5 w-5 text-secondary" />
                                {t("fixtures_results")}
                            </h2>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("fixtures_results_desc")}</p>
                        </div>
                        <PublicMatchList matches={matches} tournamentId={tournament.id} events={events} />
                    </div>
                </TabsContent>
            </Tabs>
        </main>
    );
}
