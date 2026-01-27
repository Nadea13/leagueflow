import { Match, Team, Standing } from "@/types/index";

export function calculateStandings(teams: Team[], matches: Match[]): Standing[] {
    const standingsMap = new Map<string, Standing>();

    // Initialize standings for all teams
    teams.forEach(team => {
        standingsMap.set(team.id, {
            tournament_id: team.tournament_id,
            team_id: team.id,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
            team: { name: team.name, logo_url: team.logo_url }
        });
    });

    // Process matches
    matches.forEach(match => {
        if (match.status === 'finished' && match.home_score !== null && match.away_score !== null) {
            const homeId = match.home_team_id;
            const awayId = match.away_team_id;

            if (homeId && standingsMap.has(homeId)) {
                updateTeamStats(standingsMap.get(homeId)!, match.home_score, match.away_score);
            }
            if (awayId && standingsMap.has(awayId)) {
                updateTeamStats(standingsMap.get(awayId)!, match.away_score, match.home_score);
            }
        }
    });

    // Convert to array and sort
    return Array.from(standingsMap.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
}

function updateTeamStats(stats: Standing, goalsFor: number, goalsAgainst: number) {
    stats.played += 1;
    stats.gf += goalsFor;
    stats.ga += goalsAgainst;
    stats.gd = stats.gf - stats.ga;

    if (goalsFor > goalsAgainst) {
        stats.won += 1;
        stats.pts += 3;
    } else if (goalsFor === goalsAgainst) {
        stats.drawn += 1;
        stats.pts += 1;
    } else {
        stats.lost += 1;
    }
}
