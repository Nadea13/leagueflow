
import { createAdminClient } from "@/lib/supabase/server";
import { MatchConsolePage } from "@/features/matches/match-console-page";
import { MatchEvent } from "@/types";

export default async function AdminMatchConsole(props: {
    params: Promise<{ locale: string, id: string, matchId: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale: _locale, id, matchId } = await props.params;
    const resolvedParams = await props.searchParams;
    const fromTab = typeof resolvedParams.from === 'string' ? resolvedParams.from : 'fixtures';

    const supabase = createAdminClient();

    // Fetch the match details
    const { data: rawMatch, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

    if (matchError || !rawMatch) {
        console.error("Match fetch error:", matchError, "Match ID:", matchId);
        return <div className="p-8 text-red-500">Error fetching match: {JSON.stringify(matchError, null, 2)}</div>;
    }

    // Fetch home and away teams manually to bypass missing/stale foreign key schema cache issues
    let home_team = null;
    let away_team = null;

    if (rawMatch.home_team_id) {
        const { data: ht } = await supabase
            .from('tournament_teams')
            .select('id, team:teams(name, logo_img)')
            .eq('id', rawMatch.home_team_id)
            .maybeSingle();
        if (ht) {
            home_team = {
                id: ht.id,
                name: (ht.team as any)?.name || 'Unknown Team',
                logo_url: (ht.team as any)?.logo_img || null
            };
        }
    }

    if (rawMatch.away_team_id) {
        const { data: at } = await supabase
            .from('tournament_teams')
            .select('id, team:teams(name, logo_img)')
            .eq('id', rawMatch.away_team_id)
            .maybeSingle();
        if (at) {
            away_team = {
                id: at.id,
                name: (at.team as any)?.name || 'Unknown Team',
                logo_url: (at.team as any)?.logo_img || null
            };
        }
    }

    const match = {
        ...rawMatch,
        home_team,
        away_team
    };

    // Fetch the tournament
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', id)
        .single();

    // Fetch initial events
    const { data: events } = await supabase
        .from('match_events')
        .select(`
            id, match_id, team_id, player_id, event_type, minute, extra_info, created_at,
            player:players(name)
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

    // Transformer for events
    const formattedEvents = (events || []).map(e => ({
        ...e,
        player_name: (e.player as unknown as { name: string } | null)?.name || (Array.isArray(e.player) ? (e.player[0] as unknown as { name: string } | null)?.name : undefined),
        player: undefined
    }));

    const categoryId = typeof resolvedParams.category === 'string' ? resolvedParams.category : rawMatch.tournament_category_id;
    const backUrl = categoryId 
        ? `/dashboard/tournaments/${id}?category=${categoryId}`
        : `/dashboard/tournaments/${id}?tab=${fromTab}`;

    return (
        <MatchConsolePage
            match={match}
            tournamentId={id}
            readOnly={false}
            initialEvents={formattedEvents as MatchEvent[]}
            backUrl={backUrl}
        />
    );
}
