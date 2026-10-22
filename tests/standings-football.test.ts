import { describe, it, expect } from 'vitest';

interface FootballStats {
    name: string;
    mp: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
    form: string[];
}

function calculateFootballStandings(
    teams: string[],
    matches: Array<{
        home: string;
        away: string;
        homeScore: number;
        awayScore: number;
        status: string;
    }>
): FootballStats[] {
    const map = new Map<string, FootballStats>();

    teams.forEach(t => {
        map.set(t, {
            name: t,
            mp: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
            form: []
        });
    });

    matches.forEach(m => {
        if (m.status !== 'completed' && m.status !== 'finished') return;
        const h = map.get(m.home);
        const a = map.get(m.away);
        if (!h || !a) return;

        h.mp++;
        a.mp++;
        h.gf += m.homeScore;
        h.ga += m.awayScore;
        a.gf += m.awayScore;
        a.ga += m.homeScore;

        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;

        if (m.homeScore > m.awayScore) {
            h.w++;
            h.pts += 3;
            h.form.push('W');
            a.l++;
            a.form.push('L');
        } else if (m.homeScore < m.awayScore) {
            a.w++;
            a.pts += 3;
            a.form.push('W');
            h.l++;
            h.form.push('L');
        } else {
            h.d++;
            h.pts += 1;
            h.form.push('D');
            a.d++;
            a.pts += 1;
            a.form.push('D');
        }
    });

    return Array.from(map.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });
}

describe('Football Standings Calculation', () => {
    const teams = ['Arsenal', 'Chelsea', 'Liverpool', 'Man City'];

    it('should initialize empty stats for all teams with 0 points and 0 played', () => {
        const standings = calculateFootballStandings(teams, []);
        expect(standings).toHaveLength(4);
        standings.forEach(team => {
            expect(team.mp).toBe(0);
            expect(team.pts).toBe(0);
            expect(team.gd).toBe(0);
            expect(team.form).toEqual([]);
        });
    });

    it('should grant 3 points to winner and 0 to loser on a win', () => {
        const matches = [
            { home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 0, status: 'completed' }
        ];

        const standings = calculateFootballStandings(teams, matches);
        const arsenal = standings.find(t => t.name === 'Arsenal')!;
        const chelsea = standings.find(t => t.name === 'Chelsea')!;

        expect(arsenal.pts).toBe(3);
        expect(arsenal.w).toBe(1);
        expect(arsenal.gd).toBe(2);
        expect(arsenal.form).toEqual(['W']);

        expect(chelsea.pts).toBe(0);
        expect(chelsea.l).toBe(1);
        expect(chelsea.gd).toBe(-2);
        expect(chelsea.form).toEqual(['L']);
    });

    it('should grant 1 point to each team on a draw', () => {
        const matches = [
            { home: 'Liverpool', away: 'Man City', homeScore: 1, awayScore: 1, status: 'completed' }
        ];

        const standings = calculateFootballStandings(teams, matches);
        const liverpool = standings.find(t => t.name === 'Liverpool')!;
        const manCity = standings.find(t => t.name === 'Man City')!;

        expect(liverpool.pts).toBe(1);
        expect(liverpool.d).toBe(1);
        expect(liverpool.gd).toBe(0);
        expect(liverpool.form).toEqual(['D']);

        expect(manCity.pts).toBe(1);
        expect(manCity.d).toBe(1);
        expect(manCity.gd).toBe(0);
        expect(manCity.form).toEqual(['D']);
    });

    it('should break ties by Goal Difference (GD) and then Goals For (GF)', () => {
        const matches = [
            // Arsenal wins 1-0 against Chelsea
            { home: 'Arsenal', away: 'Chelsea', homeScore: 1, awayScore: 0, status: 'completed' },
            // Man City wins 3-0 against Liverpool
            { home: 'Man City', away: 'Liverpool', homeScore: 3, awayScore: 0, status: 'completed' },
        ];

        const standings = calculateFootballStandings(teams, matches);

        // Man City (+3 GD, 3 pts) should rank above Arsenal (+1 GD, 3 pts)
        expect(standings[0].name).toBe('Man City');
        expect(standings[1].name).toBe('Arsenal');
    });

    it('should ignore scheduled or unfinished matches in standings calculation', () => {
        const matches = [
            { home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 0, status: 'scheduled' }
        ];

        const standings = calculateFootballStandings(teams, matches);
        const arsenal = standings.find(t => t.name === 'Arsenal')!;
        expect(arsenal.mp).toBe(0);
        expect(arsenal.pts).toBe(0);
    });
});
