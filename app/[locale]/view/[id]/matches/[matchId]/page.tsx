import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/server";
import { MatchConsolePage } from "@/components/matches/match-console-page";

export default async function PublicMatchConsole(props: {
    params: Promise<{ locale: string, id: string, matchId: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale, id, matchId } = await props.params;
    const resolvedParams = await props.searchParams;
    const fromTab = typeof resolvedParams.from === 'string' ? resolvedParams.from : 'fixtures';

    // We use admin client to bypass RLS for public view, standard practice in this repo
    const supabase = createAdminClient();

    // Fetch the match
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
        return <div className="p-8 text-red-500">Error fetching match: {JSON.stringify(matchError, null, 2)}</div>;
    }

    // Fetch tournament and checking payments for Pro plan
    const { data: tournament } = await supabase
        .from('tournaments')
        .select(`
            name,
            plan, 
            user_id,
            payments(plan, status)
        `)
        .eq('id', id)
        .single();
        
    let isPro = false;
    if (tournament) {
        // Check tournament specific payments
        const isTournamentPro = (tournament as any).payments?.some((p: any) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament'));
        if (isTournamentPro) {
            isPro = true;
        } else if (tournament.user_id) {
            // Check tournament owner's global plan
            const { data: globalPayment } = await supabase
                .from('payments')
                .select('plan, status')
                .eq('user_id', tournament.user_id)
                .in('plan', ['monthly', 'yearly'])
                .eq('status', 'success')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (globalPayment) {
                isPro = true;
            }
        }
    }

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
            tournamentName={tournament?.name}
            goals={[]}
            isPro={!!isPro}
            readOnly={true}
            initialEvents={formattedEvents as any}
            backUrl={`/view/${id}?tab=${fromTab}`}
        />
    );
}
