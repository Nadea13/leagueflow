import { Match, Standing, Team } from "@/types/index";

export function calculateStandings(teams: any[], matches: Match[]): Standing[] {
    const standingsMap = new Map<string, Standing>();

    // Initialize standings for all teams
    teams.forEach((team) => {
        standingsMap.set(team.id, {
            tournament_id: team.tournament_id || "",
            team_id: team.id,
            team: {
                name: team.name,
                logo_url: team.logo_url
            },
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
        });
    });

    // Process matches
    matches.forEach((match) => {
        // Skip if not finished/live or no score
        if (!['finished', 'live'].includes(match.status) || match.home_score === null || match.away_score === null) return;

        // Skip if team IDs are missing
        if (!match.home_team_id || !match.away_team_id) return;

        const homeStats = standingsMap.get(match.home_team_id);
        const awayStats = standingsMap.get(match.away_team_id);

        if (homeStats && awayStats) {
            homeStats.played += 1;
            awayStats.played += 1;

            homeStats.gf += match.home_score;
            homeStats.ga += match.away_score;
            homeStats.gd = homeStats.gf - homeStats.ga;

            awayStats.gf += match.away_score;
            awayStats.ga += match.home_score;
            awayStats.gd = awayStats.gf - awayStats.ga;

            if (match.home_score > match.away_score) {
                homeStats.won += 1;
                homeStats.pts += 3;
                awayStats.lost += 1;
            } else if (match.home_score < match.away_score) {
                awayStats.won += 1;
                homeStats.lost += 1;
                awayStats.pts += 3;
            } else {
                homeStats.drawn += 1;
                homeStats.pts += 1;
                awayStats.drawn += 1;
                awayStats.pts += 1;
            }
        }
    });

    // Convert map to array and sort
    return Array.from(standingsMap.values()).sort((a, b) => {
        // 1. Points
        if (b.pts !== a.pts) return b.pts - a.pts;
        // 2. Goal Difference
        if (b.gd !== a.gd) return b.gd - a.gd;
        // 3. Goals For
        if (b.gf !== a.gf) return b.gf - a.gf;
        // 4. Team Name (Fall back to name comparison, safe navigation)
        return (a.team?.name || "").localeCompare(b.team?.name || "");
    });
}
