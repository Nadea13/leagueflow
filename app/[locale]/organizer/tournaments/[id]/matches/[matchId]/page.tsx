import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/server";
import { MatchConsolePage } from "@/components/matches/match-console-page";
import { getUserSubscriptionPlan } from "@/app/[locale]/dashboard/actions";

export default async function AdminMatchConsole(props: {
    params: Promise<{ locale: string, id: string, matchId: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale, id, matchId } = await props.params;
    const resolvedParams = await props.searchParams;
    const fromTab = typeof resolvedParams.from === 'string' ? resolvedParams.from : 'fixtures';

    const supabase = createAdminClient();

    // Fetch the match details
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`
            *,
            home_team:tournament_teams!matches_home_team_id_fkey(id, name, logo_url),
            away_team:tournament_teams!matches_away_team_id_fkey(id, name, logo_url)
        `)
        .eq('id', matchId)
        .eq('tournament_id', id)
        .single();

    if (matchError || !match) {
        console.error("Match fetch error:", matchError, "Match ID:", matchId);
        return <div className="p-8 text-red-500">Error fetching match: {JSON.stringify(matchError, null, 2)}</div>;
    }

    // Fetch the tournament to check if Pro plan
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('plan')
        .eq('id', id)
        .single();
        
    // Fetch global user plan
    const userPlan = await getUserSubscriptionPlan();
    
    // Pro status is true if tournament has specific plan OR user has global plan
    const isPro = (tournament?.plan && tournament.plan !== 'free') || userPlan === 'monthly' || userPlan === 'yearly';

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
        player_name: (e.player as any)?.name || (Array.isArray(e.player) ? (e.player[0] as any)?.name : null),
        player: undefined
    }));

    return (
        <MatchConsolePage
            match={match}
            tournamentId={id}
            goals={[]}
            isPro={!!isPro}
            readOnly={false}
            initialEvents={formattedEvents as any}
            backUrl={`/organizer/tournaments/${id}?tab=${fromTab}`}
        />
    );
}
