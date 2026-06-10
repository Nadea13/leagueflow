"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bracket } from "@/features/tournaments/ranking/bracket";
import { Canvas } from "@/features/tournaments/builder/canvas";
import { Match, Goal, MatchEvent, Tournament, TournamentTeam } from "@/types/index";
import { useRouter } from "next/navigation";

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
    initialIsPro: _initialIsPro,
    id,
    userRole
}: TournamentContentProps) {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<(TournamentTeam & { team?: { user_id: string | null } })[]>(initialTeams);
    const [_goals, setGoals] = useState<Goal[]>(initialGoals);
    const [_matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
    const [_mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

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
                .select("*, players(display_name)")
                .in("match_id", matchIds);

            if (data) {
                const events = (data as (MatchEvent & { players?: { display_name: string } | null })[]).map((e) => ({
                    ...e,
                    player_name: e.players?.display_name || "Unknown",
                }));
                setMatchEvents(events);
            }
        };

        if (matches.length > 0) {
            fetchEvents();
        }
    }, [matches, supabase]);

    // Fetch all players from all teams for stats
    const [_allPlayersForStats, setAllPlayersForStats] = useState<{ id: string; name: string; team_id: string; teamName?: string; teamLogoUrl?: string | null }[]>([]);
    useEffect(() => {
        const fetchAllPlayers = async () => {
            const globalTeamIds = teams.map(t => t.team_id).filter(Boolean);
            if (globalTeamIds.length === 0) return;

            const { data } = await supabase
                .from("player_sports")
                .select(`
                    team_id,
                    player_id,
                    deleted_at,
                    player:player_id!inner (
                        id,
                        display_name,
                        deleted_at
                    )
                `)
                .in("team_id", globalTeamIds)
                .is("deleted_at", null)
                .is("player.deleted_at", null);

            if (data) {
                const playersWithTeam = (data as unknown as {
                    team_id: string;
                    player_id: string;
                    player: { id: string; display_name: string } | { id: string; display_name: string }[] | null;
                }[]).map((ps) => {
                    const playerData = Array.isArray(ps.player) ? ps.player[0] : ps.player;
                    const tournamentTeam = teams.find(t => t.team_id === ps.team_id);
                    return {
                        id: playerData?.id || ps.player_id,
                        name: playerData?.display_name || "Unknown",
                        team_id: tournamentTeam?.id || ps.team_id,
                        teamName: tournamentTeam?.name,
                        teamLogoUrl: tournamentTeam?.logo_url,
                    };
                });
                setAllPlayersForStats(playersWithTeam);
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
