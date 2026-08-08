import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchEvent } from "@/types/index";
import { ConsolePage as FootballConsolePage } from "@/features/sports/football/console-page";
import { VolleyballConsolePage } from "@/features/sports/volleyball/console-page";
import { PublicFooter } from "@/components/layout/public-footer";

export default async function MatchConsoleReadOnlyPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string; matchId: string }>;
    searchParams: Promise<{ fromTab?: string }>;
}) {
    const { id, matchId } = await params;
    const { fromTab = 'matches' } = await searchParams;
    const supabase = await createClient();

    // Fetch match
    const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`
            *,
            team1:team1_id ( id, name, logo_url ),
            team2:team2_id ( id, name, logo_url )
        `)
        .eq("id", matchId)
        .single();

    if (matchError || !matchData) {
        notFound();
    }

    const match = {
        ...matchData,
        team1_name: matchData.team1?.name || matchData.placeholder_team1 || 'TBD',
        team2_name: matchData.team2?.name || matchData.placeholder_team2 || 'TBD',
        team1_logo: matchData.team1?.logo_url,
        team2_logo: matchData.team2?.logo_url,
    };

    // Fetch tournament and sports
    const { data: tournament } = await supabase
        .from('tournaments')
        .select(`
            name,
            sports(sport_name)
        `)
        .eq('id', id)
        .single();

    const sportName = (tournament?.sports as unknown as { sport_name: string } | null)?.sport_name?.toLowerCase();

    // Fetch events
    const { data: events } = await supabase
        .from('match_events')
        .select(`
            *,
            player:player_id ( name )
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

    // Transformer for events
    const formattedEvents = (events || []).map(e => ({
        ...e,
        player_name: Array.isArray(e.player) ? (e.player[0] as { name: string })?.name : (e.player as unknown as { name: string } | null)?.name ?? null,
        player: undefined
    }));

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1">
                {sportName === 'volleyball' ? (
                    <VolleyballConsolePage
                        match={match}
                        tournamentId={id}
                        tournamentName={tournament?.name}
                        readOnly={true}
                        initialEvents={formattedEvents as MatchEvent[]}
                        backUrl={`/tournaments/${id}?tab=${fromTab}`}
                    />
                ) : (
                    <FootballConsolePage
                        match={match}
                        tournamentId={id}
                        tournamentName={tournament?.name}
                        readOnly={true}
                        initialEvents={formattedEvents as MatchEvent[]}
                        backUrl={`/tournaments/${id}?tab=${fromTab}`}
                    />
                )}
            </div>
            <PublicFooter />
        </div>
    );
}
