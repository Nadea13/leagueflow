"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getPublicMatches() {
    const supabase = createAdminClient();

    const dbQuery = supabase
        .from("matches")
        .select(`
            *,
            home_team:tournament_teams!matches_home_team_id_fkey(name, logo_url),
            away_team:tournament_teams!matches_away_team_id_fkey(name, logo_url),
            tournaments!inner(name, status)
        `)
        .in("tournaments.status", ["upcoming", "ongoing", "finished", "active", "completed"])
        .is("deleted_at", null)
        .order("match_date", { ascending: false })
        .order("match_time", { ascending: true });

    const { data: matches, error } = await dbQuery.limit(100);

    if (error) {
        console.error("Error fetching public matches:", error);
        return [];
    }

    return matches || [];
}

export async function getPublicTournaments(query?: string, sportId?: string) {
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
            sport_id,
            sports:sport_id(id, sport_name),
            tournament_categories(id, max_teams, tournament_teams(count))
        `)
        .in("status", ["upcoming", "ongoing", "finished"])
        .is("deleted_at", null)
        .order("start_date", { ascending: false });

    // Apply search filter if provided
    if (query && query.trim() !== "") {
        dbQuery = dbQuery.ilike("name", `%${query}%`);
    }

    if (sportId && sportId !== "all") {
        dbQuery = dbQuery.eq("sport_id", sportId);
    }

    const { data: tournaments, error } = await dbQuery.limit(50);

    if (error) {
        console.error("Error fetching public tournaments:", error);
        return [];
    }

    interface DBTournament {
        id: string;
        name: string;
        status: string;
        start_date: string | null;
        end_date: string | null;
        organizer_id: string;
        document_deadline: string | null;
        logo_img: string | null;
        cover_img: string | null;
        sport_id: string | null;
        sports: { id: string; sport_name: string } | null;
        tournament_categories: {
            id: string;
            max_teams: number;
            tournament_teams: { count: number }[];
        }[];
    }

    const mappedTournaments = ((tournaments || []) as unknown as DBTournament[]).map((t) => {
        const categories = t.tournament_categories || [];
        const maxTeams = categories.length > 0 ? categories.reduce((sum, c) => sum + (c.max_teams || 0), 0) : 8;
        const currentTeams = categories.reduce((sum, c) => {
            const teamCount = c.tournament_teams && c.tournament_teams.length > 0 ? c.tournament_teams[0].count : 0;
            return sum + teamCount;
        }, 0);

        return {
            ...t,
            user_id: t.organizer_id,
            format: 'knockout',
            max_teams: maxTeams,
            tournament_teams: [{ count: currentTeams }],
            plan: 'free',
            sport: (t.sports?.sport_name?.toLowerCase() || 'football') as "football",
        };
    });

    return mappedTournaments;
}
