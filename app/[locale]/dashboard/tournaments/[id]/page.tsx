import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Match, Goal, TournamentTeam } from "@/types/index";
import { CategorySetup } from "@/features/tournaments/management/category-setup";
import { Trophy } from "lucide-react";
import { TournamentContent } from "@/features/tournaments/tournament-content";
import { getUserRole } from "@/actions/tournaments/staff";
import { getUserSubscriptionPlan } from "@/actions/common/user";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const [tournamentResult, userPlan, roleRes] = await Promise.all([
        supabase.from("tournaments").select(`
            id, name, description, status, start_date, end_date, organizer_id, created_at, sport_id,
            is_registration_open, bank_name, bank_account_name, bank_account_number,
            document_deadline, logo_img, cover_img, location_name, google_map_url,
            sports:sport_id(sport_name)
        `).eq("id", id).single(),
        getUserSubscriptionPlan(),
        getUserRole(id)
    ]);

    const tournamentData = tournamentResult.data;
    if (tournamentResult.error || !tournamentData) {
        notFound();
    }

    const userRole = roleRes.success && roleRes.data ? roleRes.data.role : null;

    // Fetch tournament categories
    const { data: categories } = await supabase
        .from("tournament_categories")
        .select("*")
        .eq("tournament_id", id);

    const category = categories && categories.length > 0 ? categories[0] : null;
    if (!category) {
        if (userRole === "admin" || userRole === "editor") {
            const { data: ageCategories } = await supabase
                .from("age_categories")
                .select("id, category_name")
                .is("deleted_at", null)
                .order("id", { ascending: true });

            return (
                <CategorySetup
                    tournamentId={id}
                    ageCategories={ageCategories || []}
                    tournamentName={tournamentData.name}
                />
            );
        } else {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Trophy className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Tournament Not Initialized</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                        The organizer has not set up the tournament category yet. Please check back later.
                    </p>
                </div>
            );
        }
    }


    const categoryId = category ? category.id : null;
    const canvasData = category ? category.canvas_data : null;
    const maxTeams = category ? category.max_teams : 8;

    const sportsObj = tournamentData.sports as unknown as { sport_name: string } | { sport_name: string }[] | null;
    const sportsList = Array.isArray(sportsObj) ? sportsObj : (sportsObj ? [sportsObj] : []);
    const sportName = (sportsList[0]?.sport_name?.toLowerCase() || 'football') as 'football';

    const tournament = {
        ...tournamentData,
        format: 'knockout', // Fallback format since it's removed from tournaments table
        max_teams: maxTeams,
        advancing_teams: 2, // Default fallback
        canvas_data: canvasData,
        user_id: tournamentData.organizer_id,
        sport: sportName,
        plan: 'free' as 'free' | 'tournament' | 'monthly' | 'yearly',
        registration_fee: category ? category.registration_fee : 0
    };

    // Fetch related data (Teams, Matches, Goals) parallelized
    const teamsResult = categoryId
        ? await supabase
            .from("tournament_teams")
            .select("*, team:teams(*)")
            .eq("tournament_category_id", categoryId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
        : { data: [] };

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
            .order("match_index", { ascending: true })
            .order("created_at", { ascending: true })
        : { data: [] };

    const allTeams = teamsResult.data || [];
    const mappedTeams = allTeams.map((t) => {
        const tObj = t as unknown as {
            team: {
                name?: string | null;
                logo_img?: string | null;
                description?: string | null;
                contact_name?: string | null;
                contact_phone?: string | null;
                user_id?: string | null;
            } | null;
            payment_status?: string | null;
            registration_status?: string | null;
        };
        const teamObj = tObj.team || {};
        return {
            ...t,
            name: teamObj.name || "Unknown Team",
            logo_url: teamObj.logo_img || null,
            description: teamObj.description || null,
            contact_name: teamObj.contact_name || null,
            contact_phone: teamObj.contact_phone || null,
            sport: 'football' as const,
            user_id: teamObj.user_id || null
        };
    });

    const teams = mappedTeams.filter((t) => {
        const ps = t.payment_status;
        const rs = t.registration_status;
        if (!ps && !rs) return true;
        return String(ps || '').toLowerCase() === 'paid' ||
            String(rs || '').toLowerCase() === 'approved';
    });

    const matches = (matchesResult.data || []).map((m) => {
        const mObj = m as unknown as {
            id: string;
            home_team_id: string | null;
            away_team_id: string | null;
            home_team?: { name: string; logo_img?: string | null } | null;
            away_team?: { name: string; logo_img?: string | null } | null;
            home_score?: { total?: number } | number | null;
            away_score?: { total?: number } | number | null;
        };
        const getScoreTotal = (score: { total?: number } | number | null | undefined) => {
            if (!score) return 0;
            if (typeof score === 'object') return score.total || 0;
            return Number(score) || 0;
        };
        return {
            ...mObj,
            home_team: mObj.home_team ? { id: mObj.home_team_id, name: mObj.home_team.name, logo_url: mObj.home_team.logo_img } : null,
            away_team: mObj.away_team ? { id: mObj.away_team_id, name: mObj.away_team.name, logo_url: mObj.away_team.logo_img } : null,
            home_score: getScoreTotal(mObj.home_score),
            away_score: getScoreTotal(mObj.away_score)
        };
    });

    // Fetch goals for Top Scorers (only if matches exist)
    let tournamentGoals: Goal[] = [];
    if (categoryId && matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        const { data: eventsData } = await supabase
            .from("match_events")
            .select("*, player:players(display_name)")
            .in("match_id", matchIds)
            .eq("event_type", "goal");

        tournamentGoals = (eventsData || []).map((e) => {
            const eObj = e as unknown as {
                id: string;
                match_id: string;
                team_id: string;
                player?: { display_name: string } | null;
                minute?: number | string | null;
                created_at: string;
            };
            return {
                id: eObj.id,
                match_id: eObj.match_id,
                team_id: eObj.team_id,
                player_name: eObj.player?.display_name || "Unknown Player",
                goal_time: eObj.minute ? `${eObj.minute}'` : undefined,
                created_at: eObj.created_at
            };
        });
    }

    const isPro = true; // Pro locks removed for all users

    return (
        <TournamentContent
            tournament={tournament}
            initialMatches={matches as Match[] || []}
            initialTeams={teams as (TournamentTeam & { team?: { user_id: string | null } })[] || []}
            initialGoals={tournamentGoals as Goal[]}
            userPlan={userPlan}
            initialIsPro={isPro}
            id={id}
            userRole={userRole}
        />
    );
}
