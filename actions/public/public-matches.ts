"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getPublicMatches() {
    const supabase = createAdminClient();

    let dbQuery = supabase
        .from("matches")
        .select(`
            *,
            home_team:tournament_teams!matches_home_team_id_fkey(name, logo_url),
            away_team:tournament_teams!matches_away_team_id_fkey(name, logo_url),
            tournaments!inner(name, status)
        `)
        .in("tournaments.status", ["active", "completed"])
        .order("match_date", { ascending: false })
        .order("match_time", { ascending: true });

    const { data: matches, error } = await dbQuery.limit(100);

    if (error) {
        console.error("Error fetching public matches:", error);
        return [];
    }

    return matches || [];
}
