import { createAdminClient } from "@/lib/supabase/server";
import { MatchConsolePage } from "@/features/sports/football/match-console-page";
import { MatchEvent } from "@/types";
import { PublicFooter } from "@/components/layout/public-footer";
import { getPlans } from "@/actions/common/plans";

export default async function PublicMatchConsole(props: {
    params: Promise<{ locale: string, id: string, matchId: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id, matchId } = await props.params;
    const resolvedParams = await props.searchParams;
    const fromTab = typeof resolvedParams.from === 'string' ? resolvedParams.from : 'fixtures';

    // 0. Fetch Plans for Footer
    const [
        { data: managerPlans },
        { data: organizerPlans }
    ] = await Promise.all([
        getPlans({ role: 'manager' }),
        getPlans({ role: 'organizer' })
    ]);

    const safeManagerPlans = managerPlans || [];
    const safeOrganizerPlans = organizerPlans || [];

    // We use admin client to bypass RLS for public view, standard practice in this repo
    const supabase = createAdminClient();

    // Fetch the match
    const { data: rawMatch, error: matchError } = await supabase
        .from('matches')
        .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, logo_img),
            away_team:teams!matches_away_team_id_fkey(id, name, logo_img)
        `)
        .eq('id', matchId)
        .eq('tournament_id', id)
        .single();

    if (matchError || !rawMatch) {
        return <div className="p-8 text-red-500">Error fetching match: {JSON.stringify(matchError, null, 2)}</div>;
    }

    const match = {
        ...rawMatch,
        home_team: rawMatch.home_team ? {
            id: rawMatch.home_team.id,
            name: String(rawMatch.home_team.name || 'Unknown Team'),
            logo_url: rawMatch.home_team.logo_img ? String(rawMatch.home_team.logo_img) : null
        } : null,
        away_team: rawMatch.away_team ? {
            id: rawMatch.away_team.id,
            name: String(rawMatch.away_team.name || 'Unknown Team'),
            logo_url: rawMatch.away_team.logo_img ? String(rawMatch.away_team.logo_img) : null
        } : null,
    };

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
        player_name: Array.isArray(e.player) ? (e.player[0] as { name: string })?.name : (e.player as unknown as { name: string } | null)?.name ?? null,
        player: undefined
    }));

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1">
                <MatchConsolePage
                    match={match}
                    tournamentId={id}
                    tournamentName={tournament?.name}
                    readOnly={true}
                    initialEvents={formattedEvents as MatchEvent[]}
                    backUrl={`/${id}?tab=${fromTab}`}
                />
            </div>
            <PublicFooter managerPlans={safeManagerPlans} organizerPlans={safeOrganizerPlans} />
        </div>
    );
}
