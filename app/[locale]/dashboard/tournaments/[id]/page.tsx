import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Match, Goal, TournamentTeam } from "@/types/index";
import { TournamentContent } from "./tournament-content";
import { getUserRole } from "@/actions/organizer/tournaments/collaborator";
import { getUserSubscriptionPlan } from "@/actions/common/user";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Parallel fetching: Tournament data, User Plan, User Role
    // Note: getUserSubscriptionPlan internally fetches user, so we don't need to fetch it separately for plan logic
    // But we might need user object later? No, we just need userPlan string.

    // We can't fully parallelize everything because some queries depend on dynamic data?
    // No, everything depends on `id` or current user.
    // Let's refactor into Promise.all for cleaner async flow.

    const [tournamentResult, userPlan, roleRes] = await Promise.all([
        supabase.from("tournaments").select(`
            id, name, format, description, status, start_date, end_date, number_of_pitches, user_id, created_at, sport,
            max_teams, advancing_teams, is_registration_open, registration_fee, bank_name, bank_account_name, bank_account_number,
            document_deadline, canvas_data,
            payments(plan, status)
        `).eq("id", id).single(),
        getUserSubscriptionPlan(),
        getUserRole(id)
    ]);

    const tournamentData = tournamentResult.data;
    const tournament = tournamentData ? {
        ...tournamentData,
        plan: ((tournamentData as { payments?: { plan: string; status: string }[] }).payments?.some((p) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament')) ? 'tournament' : 'free') as 'free' | 'tournament' | 'monthly' | 'yearly'
    } : null;
    const tournamentError = tournamentResult.error;

    if (tournamentError || !tournament) {
        notFound();
    }

    // Fetch related data (Teams, Matches, Goals) parallelized
    const [teamsResult, matchesResult] = await Promise.all([
        supabase.from("tournament_teams").select("*, team:teams(user_id), registrations(payment_status)").eq("tournament_id", id).is("deleted_at", null).order("created_at", { ascending: true }),
        supabase.from("matches").select(`
            *,
            home_team:tournament_teams!matches_home_team_id_fkey(name, logo_url),
            away_team:tournament_teams!matches_away_team_id_fkey(name, logo_url)
        `).eq("tournament_id", id)
            .order("round", { ascending: true })
            .order("match_index", { ascending: true })
            .order("created_at", { ascending: true })
    ]);

    const allTeams = teamsResult.data || [];
    // Filter out teams that have a registration but are not PAID yet
    const teams = allTeams.filter((t) => {
        const registration = Array.isArray(t.registrations) ? t.registrations[0] : t.registrations;
        if (registration) {
            return (registration as { payment_status: string }).payment_status === 'PAID';
        }
        return true; // Manual additions by organizer don't have registrations
    });
    const matches = matchesResult.data || [];

    // Fetch goals for Top Scorers (only if matches exist)
    let tournamentGoals: Goal[] = [];
    if (matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        const { data: goalsData } = await supabase
            .from("goals")
            .select("*")
            .in("match_id", matchIds);
        tournamentGoals = goalsData || [];
    }

    const userRole = roleRes.success && roleRes.data ? roleRes.data.role : null;
    // isOwner removed as it's unused

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
