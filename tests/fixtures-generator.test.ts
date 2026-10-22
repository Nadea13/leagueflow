import { describe, it, expect } from 'vitest';
import { generateRoundRobinMatches, assignMatchTimes } from '@/lib/fixture-utils';

describe('Round Robin Fixture Generator', () => {
    it('should generate correct number of rounds and matches for an even number of teams (4 teams)', () => {
        const teams = ['team-1', 'team-2', 'team-3', 'team-4'];
        const matches = generateRoundRobinMatches(teams, 'cat-1', 'league', 1, false);

        // 4 teams -> 3 rounds -> 2 matches per round -> 6 matches total
        expect(matches).toHaveLength(6);

        // Rounds 1, 2, 3
        const rounds = new Set(matches.map(m => m.round));
        expect(rounds.size).toBe(3);
        expect(rounds).toContain(1);
        expect(rounds).toContain(2);
        expect(rounds).toContain(3);

        // Ensure every team plays 3 matches
        teams.forEach(t => {
            const teamMatches = matches.filter(m => m.home_team_id === t || m.away_team_id === t);
            expect(teamMatches).toHaveLength(3);
        });
    });

    it('should handle odd number of teams by assigning byes (null opponents)', () => {
        const teams = ['team-1', 'team-2', 'team-3'];
        const matches = generateRoundRobinMatches(teams, 'cat-1', 'league', 1, false);

        // 3 teams + 1 dummy (null) -> 3 rounds, 6 match slots generated with byes
        expect(matches.length).toBeGreaterThan(0);

        // Check that actual matches with real teams exist
        const realMatches = matches.filter(m => m.home_team_id && m.away_team_id);
        // In 3 teams, each pair plays once: (3 * 2) / 2 = 3 real matches
        expect(realMatches).toHaveLength(3);
    });

    it('should double the match count for double round robin', () => {
        const teams = ['team-1', 'team-2', 'team-3', 'team-4'];
        const singleMatches = generateRoundRobinMatches(teams, 'cat-1', 'league', 1, false);
        const doubleMatches = generateRoundRobinMatches(teams, 'cat-1', 'league', 1, true);

        expect(doubleMatches).toHaveLength(singleMatches.length * 2);
    });
});

describe('assignMatchTimes', () => {
    it('should distribute match schedule over hours and pitches starting from 08:00', () => {
        const fixtures = [
            { id: 'm1' },
            { id: 'm2' },
            { id: 'm3' },
            { id: 'm4' },
        ];

        assignMatchTimes(fixtures, '2026-10-25', '2026-10-26', 2);

        expect(fixtures[0].scheduled_at).toBeDefined();
        expect(fixtures[1].scheduled_at).toBeDefined();

        const date1 = new Date(fixtures[0].scheduled_at!);
        expect(date1.getHours()).toBe(8);
        expect(date1.getMinutes()).toBe(0);
    });
});
