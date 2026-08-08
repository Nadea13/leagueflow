import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Match, MatchEvent, Goal, Player, SportType } from "@/types/index";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { PublicTournamentShell } from "@/features/tournaments/public/public-tournament-shell";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();
    const { data: tournament } = await supabase.from("tournaments").select("name, status").eq("id", id).is("deleted_at", null).single();
    if (!tournament) return { title: "Tournament Not Found" };
    return {
        title: `${tournament.name} | Live Standings & Results`,
        description: `Follow ${tournament.name} live. View standings, fixtures, results, and bracket in real-time.`,
        openGraph: {
            title: `${tournament.name} | League Flow`,
            description: `Live standings and results for ${tournament.name}.`,
        },
    };
}

export default async function PublicViewPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ category_id?: string }>;
}) {
    const { id } = await params;
    const { category_id } = await searchParams;
    const t = await getTranslations("PublicView");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch Tournament
    const { data: tournamentData } = await supabase
        .from("tournaments")
        .select(`
            *,
            sports:sport_id(sport_name)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single();

    if (!tournamentData) {
        notFound();
    }

    // Get tournament categories
    const { data: categories } = await supabase
        .from("tournament_categories")
        .select(`
            *,
            age_categories:age_category_id(category_name)
        `)
        .eq("tournament_id", id)
        .is("deleted_at", null);

    // Fetch announcements
    const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .eq("tournament_id", id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

    const announcements = announcementsData || [];

    const category = categories?.find(c => String(c.id) === category_id) || (categories && categories.length > 0 ? categories[0] : null);
    if (!category) {
        const tournament = {
            ...tournamentData,
            format: 'knockout',
            max_teams: 8,
            advancing_teams: 2,
            canvas_data: null,
            user_id: tournamentData.organizer_id,
            sport: (tournamentData.sports?.sport_name?.toLowerCase() || 'football') as SportType,
            plan: 'free'
        };

        return (
            <div className="flex flex-col min-h-screen bg-background overflow-x-hidden print:pt-0">
                {/* Navbar */}
                <PublicNavbar user={user} />

                <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
                    {/* Subtle Brand Ambient Light */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-primary/10 rounded-full blur-[90px] pointer-events-none" />

                    <div className="max-w-md w-full bg-background/50 border border-slate-200 dark:border-foreground/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 text-center space-y-6 transition-all duration-300 hover:shadow-primary/5 hover:border-primary/20 relative z-10">
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                            <Trophy className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                                {t("not_active")}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight text-sm leading-relaxed">
                                {t.rich("not_active_desc", {
                                    name: tournament.name,
                                    span: (chunks) => <span className="text-primary font-bold">{chunks}</span>
                                })}
                            </p>
                        </div>
                        
                        <div className="pt-2">
                            <Button asChild variant="outline" className="w-full sm:w-auto font-semibold">
                                <Link href="/">
                                    {t("back_to_home")}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </main>

                <PublicFooter />
            </div>
        );
    }

    const categoryId = category ? category.id : null;
    const canvasData = category ? category.canvas_data : null;
    const maxTeams = category ? category.max_teams : 8;

    const tournament = {
        ...tournamentData,
        format: 'knockout',
        max_teams: maxTeams,
        advancing_teams: 2,
        canvas_data: canvasData,
        user_id: tournamentData.organizer_id,
        sport: (tournamentData.sports?.sport_name?.toLowerCase() || 'football') as SportType,
        plan: 'free',
        registration_fee: category?.registration_fee ?? 0
    };

    // 2. Fetch Tournament Participation
    const teamsResult = categoryId 
        ? await supabase
            .from("tournament_teams")
            .select("*, team:teams(*)")
            .eq("tournament_category_id", categoryId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
        : { data: [] };

    // Fetch Tournament Sponsors
    const sponsorsResult = await supabase
        .from("tournament_sponsors")
        .select("*")
        .eq("tournament_id", id)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

    const sponsors = sponsorsResult.data || [];

    const teams = ((teamsResult.data || []) as unknown as ({
        id: string;
        team_id: string;
        created_at: string;
        team: {
            name?: string;
            logo_img?: string | null;
            description?: string | null;
            contact_name?: string | null;
            contact_phone?: string | null;
            user_id?: string | null;
        } | null;
    } & Record<string, unknown>)[]).map((t) => {
        const teamObj = t.team || {};
        return {
            ...t,
            name: teamObj.name || "Unknown Team",
            logo_url: teamObj.logo_img || null,
            description: teamObj.description || null,
            contact_name: teamObj.contact_name || null,
            contact_phone: teamObj.contact_phone || null,
            sport: 'football' as SportType,
            user_id: teamObj.user_id || null,
            created_at: t.created_at
        };
    });

    // 3. Fetch Matches
    const matchesResult = categoryId
        ? await supabase
            .from("matches")
            .select(`
                *,
                home_team:teams!matches_home_team_id_fkey(name, logo_img),
                away_team:teams!matches_away_team_id_fkey(name, logo_img)
            `)
            .eq("tournament_category_id", categoryId)
            .order("round", { ascending: true })
            .order("created_at", { ascending: true })
        : { data: [] };

    const matches = ((matchesResult.data || []) as unknown as ({
        id: string;
        home_team_id: string | null;
        away_team_id: string | null;
        home_team: { name: string; logo_img: string | null } | null;
        away_team: { name: string; logo_img: string | null } | null;
        home_score: { total: number } | null;
        away_score: { total: number } | null;
    } & Record<string, unknown>)[]).map((m) => ({
        ...m,
        home_team: m.home_team ? { id: m.home_team_id, name: m.home_team.name, logo_url: m.home_team.logo_img } : null,
        away_team: m.away_team ? { id: m.away_team_id, name: m.away_team.name, logo_url: m.away_team.logo_img } : null,
        home_score: typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: number }).total) || 0 : Number(m.home_score) || 0,
        away_score: typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: number }).total) || 0 : Number(m.away_score) || 0
    }));

    // 4. Fetch Match Events (Admin Client to bypass RLS for public view)
    const adminSupa = createAdminClient();
    const matchIds = matches.map(m => m.id);

    const { data: allEventsResult } = await adminSupa
        .from("match_events")
        .select(`
            *,
            players (
                display_name
            )
        `)
        .in("match_id", matchIds)
        .order("minute", { ascending: true });

    const allEvents = (allEventsResult as unknown as (MatchEvent & { players?: { display_name: string } | null })[])?.map((event) => ({
        ...event,
        player_name: event.players?.display_name || "Unknown"
    })) || [];

    // 5. Fetch Goals for Stats (Admin Client)
    let initialGoals: Goal[] = [];
    if (categoryId && matchIds.length > 0) {
        const { data: eventsData } = await adminSupa
            .from("match_events")
            .select("*, player:players(display_name)")
            .in("match_id", matchIds)
            .eq("event_type", "goal");

        initialGoals = ((eventsData || []) as unknown as {
            id: string;
            match_id: string;
            team_id: string;
            player?: { display_name: string } | null;
            minute?: number | null;
            created_at: string;
        }[]).map((e) => ({
            id: e.id,
            match_id: e.match_id,
            team_id: e.team_id,
            player_name: e.player?.display_name || "Unknown Player",
            goal_time: e.minute ? `${e.minute}'` : undefined,
            created_at: e.created_at
        }));
    }

    // 6. Fetch Players for Stats (Admin Client)
    let initialPlayers: { id: string; name: string; team_id: string }[] = [];
    if (teams && teams.length > 0) {
        const globalTeamIds = teams.map(t => t.team_id).filter(Boolean);
        const { data: psData } = await adminSupa
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

        if (psData) {
            initialPlayers = (psData as unknown as {
                team_id: string;
                player_id: string;
                player?: { id: string; display_name: string } | null;
            }[]).map((ps) => {
                const tournamentTeam = teams.find(t => t.team_id === ps.team_id);
                return {
                    id: ps.player?.id || ps.player_id,
                    name: ps.player?.display_name || "Unknown",
                    team_id: tournamentTeam?.id || ps.team_id
                };
            });
        }
    }



    return (
        <div className="flex flex-col min-h-screen bg-background overflow-x-hidden print:pt-0">
            {/* Navbar */}
            <PublicNavbar user={user} />

            <main className="flex-1">
                <PublicTournamentShell
                    tournament={tournament}
                    initialTeams={teams || []}
                    initialMatches={matches as Match[] || []}
                    initialEvents={allEvents as MatchEvent[]}
                    initialGoals={initialGoals}
                    initialPlayers={initialPlayers as Player[]}
                    categories={categories?.map(c => ({
                        id: String(c.id),
                        name: `${c.age_categories?.category_name || "General"} (${c.gender_type})`
                    })) || []}
                    selectedCategoryId={category.id ? String(category.id) : undefined}
                    announcements={announcements}
                    sponsors={sponsors}
                />
            </main>

            <PublicFooter />
        </div>
    );
}
