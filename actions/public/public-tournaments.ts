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
            format,
            max_teams,
            plan,
            user_id,
            document_deadline,
            tournament_teams(count)
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

    return tournaments || [];
}
