import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Match, Goal, TournamentTeam } from "@/types/index";
import { TournamentContent } from "./tournament-content";
import { getUserRole } from "@/actions/organizer/tournaments/collaborator";
import { getUserSubscriptionPlan } from "@/actions/common/user";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const [tournamentResult, userPlan, roleRes] = await Promise.all([
        supabase.from("tournaments").select(`
            id, name, description, status, start_date, end_date, organizer_id, created_at, sport_id,
            is_registration_open, registration_fee, bank_name, bank_account_name, bank_account_number,
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

    // Ensure a default tournament category exists for the tournament
    let { data: categories } = await supabase
        .from("tournament_categories")
        .select("*")
        .eq("tournament_id", id);

    let category = categories && categories.length > 0 ? categories[0] : null;
    if (!category) {
        // Create default category
        const { data: newCategory, error: createCatError } = await supabase
            .from("tournament_categories")
            .insert({
                tournament_id: id,
                age_category_id: 1, // General / Open
                gender_type: 'open',
                max_teams: 8
            })
            .select()
            .single();
        
        if (createCatError) {
            console.error("Failed to create default category:", createCatError);
        } else {
            category = newCategory;
        }
    }

    const categoryId = category ? category.id : null;
    const canvasData = category ? category.canvas_data : null;
    const maxTeams = category ? category.max_teams : 8;

    const tournament = {
        ...tournamentData,
        format: 'knockout', // Fallback format since it's removed from tournaments table
        max_teams: maxTeams,
        advancing_teams: 2, // Default fallback
        canvas_data: canvasData,
        user_id: tournamentData.organizer_id,
        sport: ((Array.isArray(tournamentData.sports) ? tournamentData.sports[0]?.sport_name : (tournamentData.sports as any)?.sport_name)?.toLowerCase() || 'football') as any,
        plan: 'free' as 'free' | 'tournament' | 'monthly' | 'yearly'
    };

    // Fetch related data (Teams, Matches, Goals) parallelized
    const teamsResult = categoryId 
        ? await supabase
            .from("tournament_teams")
            .select("*, team:teams(*), registrations(payment_status)")
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
    const mappedTeams = allTeams.map((t: any) => {
        const teamObj = t.team || {};
        return {
            ...t,
            name: teamObj.name || "Unknown Team",
            logo_url: teamObj.logo_img || null,
            description: teamObj.description || null,
            contact_name: teamObj.contact_name || null,
            contact_phone: teamObj.contact_phone || null,
            sport: 'football',
            user_id: teamObj.user_id || null
        };
    });

    const teams = mappedTeams.filter((t) => {
        const registration = Array.isArray(t.registrations) ? t.registrations[0] : t.registrations;
        if (registration) {
            return (registration as { payment_status: string }).payment_status === 'PAID';
        }
        return true; // Manual additions by organizer don't have registrations
    });

    const matches = (matchesResult.data || []).map((m: any) => ({
        ...m,
        home_team: m.home_team ? { id: m.home_team_id, name: m.home_team.name, logo_url: m.home_team.logo_img } : null,
        away_team: m.away_team ? { id: m.away_team_id, name: m.away_team.name, logo_url: m.away_team.logo_img } : null,
        home_score: m.home_score?.total || 0,
        away_score: m.away_score?.total || 0
    }));

    // Fetch goals for Top Scorers (only if matches exist)
    let tournamentGoals: Goal[] = [];
    if (categoryId && matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        const { data: eventsData } = await supabase
            .from("match_events")
            .select("*, player:players(display_name)")
            .in("match_id", matchIds)
            .eq("event_type", "goal");

        tournamentGoals = (eventsData || []).map((e: any) => ({
            id: e.id,
            match_id: e.match_id,
            team_id: e.team_id,
            player_name: e.player?.display_name || "Unknown Player",
            goal_time: e.minute ? `${e.minute}'` : undefined,
            created_at: e.created_at
        }));
    }

    const userRole = roleRes.success && roleRes.data ? roleRes.data.role : null;
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
