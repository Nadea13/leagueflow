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
            tournament_categories(id, max_teams, tournament_teams(count), age_categories:age_category_id(category_name))
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
            age_categories: { category_name: string } | null;
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
            tournament_categories: categories,
            plan: 'free',
            sport: (t.sports?.sport_name?.toLowerCase() || 'football') as "football",
        };
    });

    return mappedTournaments;
}

export async function getPublicTournamentMatches(tournamentId: string) {
    const supabase = createAdminClient();

    // 1. Get all category IDs for this tournament
    const { data: categories, error: catError } = await supabase
        .from("tournament_categories")
        .select(`
            id,
            age_categories:age_category_id(category_name)
        `)
        .eq("tournament_id", tournamentId)
        .is("deleted_at", null);

    if (catError || !categories || categories.length === 0) {
        return [];
    }

    const categoryMap = new Map<string, string>();
    const categoryIds: string[] = [];
    for (const c of categories) {
        categoryIds.push(c.id);
        const ageName = (c.age_categories as unknown as { category_name?: string })?.category_name || "ทั่วไป";
        categoryMap.set(c.id, ageName);
    }

    // 2. Fetch all matches for these categories
    const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .in("tournament_category_id", categoryIds)
        .order("round", { ascending: true })
        .order("created_at", { ascending: true });

    if (matchError || !matches) {
        console.error("Error fetching tournament matches:", matchError);
        return [];
    }

    // 3. Resolve team names and logos
    const teamIds = Array.from(new Set(
        matches.flatMap(m => [m.home_team_id, m.away_team_id]).filter(Boolean)
    )) as string[];

    const teamMap = new Map<string, { id: string; name: string; logo_url: string | null }>();
    if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
            .from("teams")
            .select("id, name, logo_img")
            .in("id", teamIds);

        if (teamsData) {
            for (const tm of teamsData) {
                teamMap.set(tm.id, { id: tm.id, name: tm.name, logo_url: tm.logo_img });
            }
        }

        const { data: ttData } = await supabase
            .from("tournament_teams")
            .select("id, name, logo_url, team:teams(name, logo_img)")
            .in("id", teamIds);

        if (ttData) {
            for (const tt of ttData) {
                const teamObj = Array.isArray(tt.team) ? tt.team[0] : tt.team;
                teamMap.set(tt.id, {
                    id: tt.id,
                    name: tt.name || teamObj?.name || "Unknown Team",
                    logo_url: tt.logo_url || teamObj?.logo_img || null
                });
            }
        }
    }

    return matches.map((m) => {
        let match_date = m.match_date || null;
        let match_time = m.match_time || null;
        if (m.scheduled_at) {
            const parts = m.scheduled_at.split('T');
            match_date = match_date || parts[0];
            match_time = match_time || parts[1]?.substring(0, 5) || null;
        }

        const homeTeam = m.home_team_id ? teamMap.get(m.home_team_id) || { id: m.home_team_id, name: "ทีม A", logo_url: null } : null;
        const awayTeam = m.away_team_id ? teamMap.get(m.away_team_id) || { id: m.away_team_id, name: "ทีม B", logo_url: null } : null;

        const homeScore = typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: number }).total) || 0 : Number(m.home_score) || 0;
        const awayScore = typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: number }).total) || 0 : Number(m.away_score) || 0;

        return {
            ...m,
            match_date,
            match_time,
            category_name: categoryMap.get(m.tournament_category_id) || "ทั่วไป",
            home_team: homeTeam,
            away_team: awayTeam,
            home_score: homeScore,
            away_score: awayScore
        };
    });
}

