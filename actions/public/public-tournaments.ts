"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getPublicTournaments(query?: string) {
    const supabase = createAdminClient();

    let dbQuery = supabase
        .from("tournaments")
        .select(`
            id, 
            name, 
            status, 
            start_date, 
            end_date,
            organizer_id,
            document_deadline,
            logo_img,
            cover_img,
            tournament_teams(count),
            tournament_categories(max_teams)
        `)
        .in("status", ["active", "completed"])
        .order("start_date", { ascending: false });

    // Apply search filter if provided
    if (query && query.trim() !== "") {
        dbQuery = dbQuery.ilike("name", `%${query}%`);
    }

    const { data: tournaments, error } = await dbQuery.limit(50);

    if (error) {
        console.error("Error fetching public tournaments:", error);
        return [];
    }

    console.log("Fetched public tournaments:", tournaments?.length);

    const mappedTournaments = (tournaments || []).map((t: any) => {
        const maxTeams = t.tournament_categories && t.tournament_categories.length > 0
            ? t.tournament_categories[0].max_teams
            : 8;
        return {
            ...t,
            user_id: t.organizer_id,
            format: 'knockout',
            max_teams: maxTeams,
            plan: 'free',
        };
    });

    return mappedTournaments;
}
