"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Copy, ExternalLink, Calendar, Trophy, GitBranch, Award, ArrowLeft, Settings, Users, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Tab } from "@/components/ui/tab";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamForm } from "@/features/tournaments/teams/team-form";
import { Standings } from "@/features/tournaments/ranking/standings";
import { Teams } from "@/features/tournaments/teams/team-list";
import { StandingsGroups } from "@/features/tournaments/ranking/standings-groups";
import { Bracket } from "@/features/tournaments/ranking/bracket";
import { Canvas } from "@/features/tournaments/builder/canvas";
import { Match, Goal, MatchEvent, Tournament, Player, TournamentTeam } from "@/types/index";
import { ShareButton } from "@/features/tournaments/shared/share-button";
import { TopScorers } from "@/features/tournaments/ranking/top-scorers";
import { calculateStandings } from "@/lib/standings";
import { TournamentSettings } from "@/features/tournaments/settings/tournament-settings";
import { MatchManager } from "@/features/tournaments/matches/match-manager";

import { ProgressionLogic } from "@/features/tournaments/matches/progression-logic";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TournamentStats } from "@/features/tournaments/shared/overview-stats";
import { PlayerStats } from "@/features/tournaments/ranking/player-stats";
import { BannedPlayers } from "@/features/tournaments/ranking/banned-players";
import { Announcements } from "@/features/tournaments/management/announcements";
import { Registrations } from "@/features/tournaments/management/registrations";
import { calculatePlayerStats, getBannedPlayers } from "@/lib/player-stats";
import { RegistrationSettings } from "@/features/tournaments/settings/registration-settings";

interface TournamentContentProps {
    tournament: Tournament;
    initialMatches: Match[];
    initialTeams: (TournamentTeam & { team?: { user_id: string | null } })[];
    initialGoals: Goal[];
    userPlan: string | undefined;
    initialIsPro: boolean;
    id: string;
    userRole: 'admin' | 'editor' | 'viewer' | null;
}

export function TournamentContent({
    tournament: initialTournament,
    initialMatches,
    initialTeams,
    initialGoals,
    userPlan,
    initialIsPro: _initialIsPro,
    id,
    userRole
}: TournamentContentProps) {
    const t = useTranslations("Tournament");
    const tCommon = useTranslations("Common");
    const tSettings = useTranslations("Settings");
    const tSports = useTranslations("Sports");
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { toast } = useToast();
    const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<(TournamentTeam & { team?: { user_id: string | null } })[]>(initialTeams);
    const [goals, setGoals] = useState<Goal[]>(initialGoals);
    const [teamSubTab, setTeamSubTab] = useState<'list' | 'add'>('list');
    const [fixtureSubTab, setFixtureSubTab] = useState<'schedule' | 'standings'>('schedule');
    const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

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

    // Update state when props change (server revalidation)
    useEffect(() => {
        setTimeout(() => {
            setTournament(initialTournament);
            setMatches(initialMatches);
            setTeams(initialTeams);
            setGoals(initialGoals);
        }, 0);
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
                const events = (data as (MatchEvent & { players: { name: string } | null })[]).map((e) => ({
                    ...e,
                    player_name: e.players?.name || "Unknown",
                }));
                setMatchEvents(events);
            }
        };

        if (matches.length > 0) {
            fetchEvents();
        }
    }, [matches, supabase]);

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
                const playersWithTeam = (data as Player[]).map((p) => {
                    const team = teams.find(t => t.id === p.team_id);
                    return {
                        ...p,
                        teamName: team?.name,
                        teamLogoUrl: team?.logo_url,
                    };
                });
                setAllPlayersForStats(playersWithTeam as unknown as { id: string; name: string; team_id: string; teamName?: string; teamLogoUrl?: string | null }[]);
            }
        };

        fetchAllPlayers();
    }, [teams, supabase]);

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
                table: 'tournament_teams',
                filter: `tournament_id=eq.${id}`
            }, () => {
                // Rely on router.refresh() to update the filtered teams list from the server
                router.refresh();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tournaments',
                filter: `id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setTournament(payload.new as Tournament);
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
    const isPro = true; // Always true as per user request to remove locks

    // Calculate Standings
    const calculatedStandings = calculateStandings(teams, matches);
    const isLeague = tournament?.format === 'league' || tournament?.format === 'league_ha';
    const hasStandings = isLeague ? teams.length > 0 : teams.some(t => t.group_name);

    // Player stats
    const playerStats = calculatePlayerStats(matchEvents, allPlayersForStats, null);
    const bannedPlayers = getBannedPlayers(matchEvents, allPlayersForStats, null);

    const registrationUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/register/${id}`
        : `/register/${id}`;

    const copyRegistrationLink = () => {
        navigator.clipboard.writeText(registrationUrl);
        toast({
            title: tCommon("copied"),
            description: tCommon("copied_desc"),
            className: "rounded-none border-primary font-bold"
        });
    };

    return (
        <div className="h-full w-full overflow-hidden">
            {(tournament?.format === 'knockout' || tournament?.format === 'group_knockout') && (
                <div className="h-full relative z-10">
                    {(userRole === 'admin' || userRole === 'editor') ? (
                        <Canvas
                            tournamentId={id}
                            tournamentName={tournament.name}
                            initialCanvasData={tournament.canvas_data ?? null}
                            isCompact={false}
                            tournament={tournament}
                            hasFixtures={hasFixtures}
                            teams={teams}
                            matches={matches}
                        />
                    ) : (
                        <Bracket
                            matches={matches}
                            canvasData={tournament.canvas_data}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
