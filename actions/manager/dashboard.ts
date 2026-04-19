'use server'

import { createClient } from "@/lib/supabase/server";

export async function getUserTeams() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Get tournaments owned by the user to include their teams
    const { data: ownedTournaments } = await supabase
        .from("tournaments")
        .select("id")
        .eq("user_id", user.id);
    
    const ownedTournamentIds = ownedTournaments?.map(t => t.id) || [];

    // Construct the query
    const query = supabase
        .from("teams")
        .select("id, name, logo_url, description, created_at, user_id, sport, tournament:tournaments(id, name)");
    
    // OR condition for user_id OR tournament_id in owned list
    const conditions = [`user_id.eq.${user.id}`];
    if (ownedTournamentIds.length > 0) {
        conditions.push(`tournament_id.in.(${ownedTournamentIds.join(',')})`);
    }

    const { data: teams, error } = await query
        .or(conditions.join(','))
        .order("created_at", { ascending: false });

    const formattedTeams = (teams || []).map(team => ({
        ...team,
        tournament: Array.isArray(team.tournament) ? team.tournament[0] : (team.tournament || null)
    }));

    return formattedTeams;
}
