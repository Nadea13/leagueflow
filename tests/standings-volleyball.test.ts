import { describe, it, expect } from 'vitest';

interface VolleyballStats {
    name: string;
    mp: number;
    w: number;
    l: number;
    sw: number; // sets won
    sl: number; // sets lost
    sd: number; // set difference
    pts: number;
    form: string[];
}

function calculateVolleyballStandings(
    teams: string[],
    matches: Array<{
        home: string;
        away: string;
        homeScore: number;
        awayScore: number;
        status: string;
    }>
): VolleyballStats[] {
    const map = new Map<string, VolleyballStats>();

    teams.forEach(t => {
        map.set(t, {
            name: t,
            mp: 0,
            w: 0,
            l: 0,
            sw: 0,
            sl: 0,
            sd: 0,
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
        h.sw += m.homeScore;
        h.sl += m.awayScore;
        a.sw += m.awayScore;
        a.sl += m.homeScore;

        if (m.homeScore > m.awayScore) {
            h.w++;
            a.l++;
            h.form.push('W');
            a.form.push('L');
            const diff = m.homeScore - m.awayScore;
            if (diff > 1) {
                // 3-0 or 3-1 win: Winner gets 3 pts, Loser gets 0
                h.pts += 3;
            } else {
                // 3-2 win: Winner gets 2 pts, Loser gets 1 pt
                h.pts += 2;
                a.pts += 1;
            }
        } else if (m.awayScore > m.homeScore) {
            a.w++;
            h.l++;
            a.form.push('W');
            h.form.push('L');
            const diff = m.awayScore - m.homeScore;
            if (diff > 1) {
                // 3-0 or 3-1 win
                a.pts += 3;
            } else {
                // 3-2 win
                a.pts += 2;
                h.pts += 1;
            }
        }

        h.sd = h.sw - h.sl;
        a.sd = a.sw - a.sl;
    });

    return Array.from(map.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.sd !== a.sd) return b.sd - a.sd;
        return b.sw - a.sw;
    });
}

describe('Volleyball FIVB Standings Calculation', () => {
    const teams = ['Japan', 'Brazil', 'Poland', 'Italy'];

    it('should award 3-0 winner 3 pts and loser 0 pts', () => {
        const matches = [
            { home: 'Japan', away: 'Brazil', homeScore: 3, awayScore: 0, status: 'completed' }
        ];

        const standings = calculateVolleyballStandings(teams, matches);
        const japan = standings.find(t => t.name === 'Japan')!;
        const brazil = standings.find(t => t.name === 'Brazil')!;

        expect(japan.pts).toBe(3);
        expect(japan.w).toBe(1);
        expect(japan.sw).toBe(3);
        expect(japan.sl).toBe(0);
        expect(japan.sd).toBe(3);

        expect(brazil.pts).toBe(0);
        expect(brazil.l).toBe(1);
        expect(brazil.sw).toBe(0);
        expect(brazil.sl).toBe(3);
    });

    it('should award 3-1 winner 3 pts and loser 0 pts', () => {
        const matches = [
            { home: 'Poland', away: 'Italy', homeScore: 3, awayScore: 1, status: 'completed' }
        ];

        const standings = calculateVolleyballStandings(teams, matches);
        const poland = standings.find(t => t.name === 'Poland')!;
        const italy = standings.find(t => t.name === 'Italy')!;

        expect(poland.pts).toBe(3);
        expect(italy.pts).toBe(0);
    });

    it('should award 3-2 winner 2 pts and loser 1 pt (FIVB 5-setter rule)', () => {
        const matches = [
            { home: 'Japan', away: 'Poland', homeScore: 3, awayScore: 2, status: 'completed' }
        ];

        const standings = calculateVolleyballStandings(teams, matches);
        const japan = standings.find(t => t.name === 'Japan')!;
        const poland = standings.find(t => t.name === 'Poland')!;

        expect(japan.pts).toBe(2);
        expect(japan.w).toBe(1);
        expect(japan.sw).toBe(3);
        expect(japan.sl).toBe(2);

        expect(poland.pts).toBe(1);
        expect(poland.l).toBe(1);
        expect(poland.sw).toBe(2);
        expect(poland.sl).toBe(3);
    });

    it('should rank team with more points higher regardless of matches won', () => {
        // Japan wins one 3-0 match -> 3 pts
        // Brazil wins two 3-2 matches -> 4 pts
        const matches = [
            { home: 'Japan', away: 'Italy', homeScore: 3, awayScore: 0, status: 'completed' },
            { home: 'Brazil', away: 'Poland', homeScore: 3, awayScore: 2, status: 'completed' },
            { home: 'Brazil', away: 'Italy', homeScore: 3, awayScore: 2, status: 'completed' },
        ];

        const standings = calculateVolleyballStandings(teams, matches);

        expect(standings[0].name).toBe('Brazil');
        expect(standings[0].pts).toBe(4);
        expect(standings[1].name).toBe('Japan');
        expect(standings[1].pts).toBe(3);
    });
});
