import { notFound } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { MatchEvent } from "@/types/index";
import { ConsolePage as FootballConsolePage } from "@/features/sports/football/console-page";
import { VolleyballConsolePage } from "@/features/sports/volleyball/console-page";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export default async function MatchConsoleReadOnlyPage(props: {
    params: Promise<{ locale: string; id: string; matchId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale: _locale, id, matchId } = await props.params;
    const resolvedParams = await props.searchParams;
    const fromTab = typeof resolvedParams.from === 'string' ? resolvedParams.from : 'matches';

    const supabase = createAdminClient();
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    // Fetch match
    const { data: rawMatch, error: matchError } = await supabase
        .from("matches")
        .select('*')
        .eq("id", matchId)
        .single();

    if (matchError || !rawMatch) {
        notFound();
    }

    // Fetch home and away teams manually to bypass missing/stale foreign key schema cache issues
    let home_team = null;
    let away_team = null;

    if (rawMatch.home_team_id) {
        const { data: ht } = await supabase
            .from('teams')
            .select('id, name, logo_img, description, contact_name, contact_phone')
            .eq('id', rawMatch.home_team_id)
            .maybeSingle();
        if (ht) {
            home_team = {
                id: ht.id,
                name: String(ht.name || 'Unknown Team'),
                logo_url: ht.logo_img ? String(ht.logo_img) : null,
                description: ht.description || null,
                contact_name: ht.contact_name || null,
                contact_phone: ht.contact_phone || null
            };
        } else {
            const { data: tt } = await supabase
                .from('tournament_teams')
                .select('id, name, logo_url, description, contact_name, contact_phone')
                .eq('id', rawMatch.home_team_id)
                .maybeSingle();
            if (tt) {
                home_team = {
                    id: tt.id,
                    name: String(tt.name || 'Unknown Team'),
                    logo_url: tt.logo_url ? String(tt.logo_url) : null,
                    description: tt.description || null,
                    contact_name: tt.contact_name || null,
                    contact_phone: tt.contact_phone || null
                };
            }
        }
    }

    if (rawMatch.away_team_id) {
        const { data: at } = await supabase
            .from('teams')
            .select('id, name, logo_img, description, contact_name, contact_phone')
            .eq('id', rawMatch.away_team_id)
            .maybeSingle();
        if (at) {
            away_team = {
                id: at.id,
                name: String(at.name || 'Unknown Team'),
                logo_url: at.logo_img ? String(at.logo_img) : null,
                description: at.description || null,
                contact_name: at.contact_name || null,
                contact_phone: at.contact_phone || null
            };
        } else {
            const { data: tt } = await supabase
                .from('tournament_teams')
                .select('id, name, logo_url, description, contact_name, contact_phone')
                .eq('id', rawMatch.away_team_id)
                .maybeSingle();
            if (tt) {
                away_team = {
                    id: tt.id,
                    name: String(tt.name || 'Unknown Team'),
                    logo_url: tt.logo_url ? String(tt.logo_url) : null,
                    description: tt.description || null,
                    contact_name: tt.contact_name || null,
                    contact_phone: tt.contact_phone || null
                };
            }
        }
    }

    const match = {
        ...rawMatch,
        home_team,
        away_team
    };

    // Fetch tournament and sports
    const { data: tournament } = await supabase
        .from('tournaments')
        .select('name, sports(sport_name)')
        .eq('id', id)
        .single();

    const sportName = (tournament?.sports as unknown as { sport_name: string } | null)?.sport_name?.toLowerCase();

    // Fetch events
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
    const backParams = new URLSearchParams();
    if (categoryId) backParams.set('category', categoryId);
    if (fromTab) backParams.set('tab', fromTab);
    const backUrl = backParams.toString()
        ? `/tournaments/${id}?${backParams.toString()}`
        : `/tournaments/${id}`;

    // Fetch category rules_config if available
    let maxSets = 3;
    let rulesConfig: Record<string, unknown> | null = null;
    if (rawMatch.tournament_category_id) {
        const { data: categoryData } = await supabase
            .from('tournament_categories')
            .select('rules_config')
            .eq('id', rawMatch.tournament_category_id)
            .maybeSingle();

        if (categoryData?.rules_config && typeof categoryData.rules_config === 'object') {
            rulesConfig = categoryData.rules_config as Record<string, unknown>;
            const rules = rulesConfig as { max_sets?: number };
            if (rules.max_sets) {
                maxSets = Number(rules.max_sets);
            }
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-background overflow-x-hidden print:pt-0">
            {/* Navbar */}
            <PublicNavbar user={user} />

            <main className="flex-1 pt-18 lg:pt-20 container max-w-7xl mx-auto px-2 md:px-0 pb-8">
                {sportName === 'volleyball' ? (
                    <VolleyballConsolePage
                        match={match}
                        tournamentId={id}
                        tournamentName={tournament?.name || undefined}
                        readOnly={true}
                        initialEvents={formattedEvents as MatchEvent[]}
                        backUrl={backUrl}
                        maxSets={maxSets}
                        rulesConfig={rulesConfig}
                    />
                ) : (
                    <FootballConsolePage
                        match={match}
                        tournamentId={id}
                        tournamentName={tournament?.name || undefined}
                        readOnly={true}
                        initialEvents={formattedEvents as MatchEvent[]}
                        backUrl={backUrl}
                        rulesConfig={rulesConfig}
                    />
                )}
            </main>
            <PublicFooter />
        </div>
    );
}
