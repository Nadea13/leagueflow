"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Users, Calendar, ArrowLeft, GitBranch, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tab } from "@/components/ui/tab";
import { Standings } from "@/components/tournaments/ranking/standings";
import { PublicMatches } from "@/components/tournaments/public/public-matches-list";
import { StandingsGroups } from "@/components/tournaments/ranking/standings-groups";
import { Bracket } from "@/components/tournaments/ranking/bracket";
import { ShareButton } from "@/components/tournaments/shared/share-button";
import { PrintButton } from "@/components/tournaments/shared/print-button";
import { Match, MatchEvent, Team, Goal, Tournament, Player } from "@/types";
import { calculateStandings } from "@/lib/standings";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

import { TournamentStats } from "@/components/tournaments/shared/overview-stats";
import { PlayerStats } from "@/components/tournaments/ranking/player-stats";
import { BannedPlayers } from "@/components/tournaments/ranking/banned-players";
import { TopScorers } from "@/components/tournaments/ranking/top-scorers";
import { calculatePlayerStats, getBannedPlayers } from "@/lib/player-stats";

interface PublicTournamentShellProps {
    tournament: Tournament;
    initialTeams: Team[];
    initialMatches: Match[];
    initialEvents: MatchEvent[];
    initialGoals: Goal[];
    initialPlayers: Player[];
}

export function PublicTournamentShell({
    tournament: initialTournament,
    initialTeams,
    initialMatches,
    initialEvents,
    initialGoals,
    initialPlayers
}: PublicTournamentShellProps) {
    const t = useTranslations("PublicView");
    const tTournament = useTranslations("Tournament");
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [events, setEvents] = useState<MatchEvent[]>(initialEvents);
    const [tournament, setTournament] = useState(initialTournament);
    const goals = initialGoals || [];
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
                setTournament(payload.new as Tournament);
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
                if (payload.new && !matchIds.includes((payload.new as MatchEvent).match_id)) return;
                if (payload.old && !matchIds.includes((payload.old as MatchEvent).match_id)) return;

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
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="flex items-start gap-3 md:gap-6 w-full">
                    <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="bg-background/50 backdrop-blur-sm rounded-none h-8 w-8 md:h-10 md:w-10 shrink-0 border-border/10 hover:border-primary/30 text-muted-foreground/40 hover:text-primary transition-all"
                    >
                        <Link href="/">
                            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </Link>
                    </Button>

                    <div className="flex flex-col flex-1 gap-1 md:gap-2 min-w-0">
                        {/* Metadata Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className="rounded-none font-black text-[10px] border-none bg-primary/10 text-primary tracking-widest">
                                {tournament?.format?.replace('_', ' ')}
                            </Badge>

                            <span className="text-[10px] font-black tracking-widest text-muted-foreground px-2 border-l border-foreground/10">
                                {initialTeams.length} {tTournament("teams")}
                            </span>

                            <Badge className={cn(
                                "font-black border-none px-3 py-1 shadow-lg text-[10px] h-5 tracking-widest",
                                tournament?.status === 'active' && "bg-green-600 hover:bg-green-700 shadow-green-900/20",
                                tournament?.status === 'completed' && "bg-gray-500 hover:bg-gray-600 shadow-gray-900/20",
                                (!tournament?.status || tournament?.status === 'draft') && "bg-yellow-500 hover:bg-yellow-600 text-black shadow-yellow-900/10"
                            )}>
                                {tTournament(tournament?.status || 'draft')}
                            </Badge>

                        </div>

                        {/* Title Section */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <h1 className="text-2xl md:text-5xl font-black tracking-tighter leading-[0.85] text-foreground drop-shadow-2xl">
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

            {/* Public Navigation */}
            <Tab
                value={currentTab}
                onChange={handleTabChange}
                className="w-full md:w-max mb-6"
                itemClassName="flex-1 md:flex-none"
                options={[
                    { value: 'overview', label: t("overview"), icon: Trophy },
                    { value: 'matches', label: t("matches"), icon: Calendar },
                    { value: 'statistics', label: t("statistics"), icon: Award },
                ]}
            />

            {currentTab === 'overview' && (
                <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                        {(tournament.format === 'league' || tournament.format === 'league_ha') && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Trophy className="h-5 w-5 text-primary" />
                                        {t("league_table")}
                                    </h2>
                                </div>
                                <Standings standings={standings} />
                            </div>
                        )}

                        {tournament.format === 'group_knockout' && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Trophy className="h-5 w-5 text-primary" />
                                        {t("group_standings")}
                                    </h2>
                                </div>
                                <StandingsGroups teams={initialTeams} matches={matches} isPublic={true} />
                            </div>
                        )}

                        {(tournament.format === 'knockout' || tournament.format === 'group_knockout') && (
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <GitBranch className="h-5 w-5 text-primary" />
                                        {t("bracket")}
                                    </h2>
                                    <p className="text-[10px] font-bold text-muted-foreground/60">{t("bracket_desc")}</p>
                                </div>
                                <div className="relative z-10 overflow-x-auto pb-4">
                                    <Bracket matches={matches} isPublic={true} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {currentTab === 'statistics' && (
                <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                    <Award className="h-5 w-5 text-primary" />
                                    {t("top_scorers")}
                                </h2>
                                <p className="text-[10px] font-bold text-muted-foreground/60">{t("top_scorers_desc")}</p>
                            </div>
                            <TopScorers goals={goals} teams={initialTeams} />
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-4 md:space-y-6">
                                <div className="flex flex-col gap-1">
                                    <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                        <Users className="h-5 w-5 text-primary" />
                                        {t("player_stats")}
                                    </h2>
                                    <p className="text-[10px] font-bold text-muted-foreground/60">{t("player_stats_desc")}</p>
                                </div>
                                <PlayerStats stats={playerStats} />
                            </div>

                            {bannedPlayers.length > 0 && (
                                <BannedPlayers bannedPlayers={bannedPlayers} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentTab === 'matches' && (
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            {t("fixtures_results")}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground/60">{t("fixtures_results_desc")}</p>
                    </div>
                    <PublicMatches matches={matches} tournamentId={tournament.id} events={events} teams={initialTeams} />
                </div>
            )}
        </main>
    );
}
