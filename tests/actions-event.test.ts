import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMatchEvents, addMatchEvent, deleteMatchEvent } from '@/actions/tournaments/event';

// Mock Next.js headers / cache
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
    headers: vi.fn(() => ({
        get: vi.fn(() => '127.0.0.1'),
    })),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock Supabase Server client
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
        from: vi.fn(),
    },
};

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
    createAdminClient: vi.fn(() => mockSupabase),
}));

const mockValidateTournamentAccess = vi.fn().mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
vi.mock('@/lib/security', () => ({
    validateTournamentAccess: (..._args: unknown[]) => mockValidateTournamentAccess(..._args),
}));

// Helper to create a query builder mock that can be chained arbitrarily
function createMockQueryBuilder(resolvedValue: unknown) {
    const builder = {} as Record<string, unknown>;
    const chain = () => builder;

    builder.select = chain;
    builder.eq = chain;
    builder.is = chain;
    builder.limit = chain;
    builder.order = chain;
    builder.insert = chain;
    builder.update = chain;
    builder.delete = chain;
    builder.or = chain;
    builder.single = vi.fn().mockResolvedValue(resolvedValue);
    builder.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);

    // Make it awaitable
    builder.then = (onfulfilled?: (value: unknown) => unknown) => Promise.resolve(resolvedValue).then(onfulfilled);

    return builder;
}

describe('getMatchEvents Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully get match events with player names', async () => {
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'match_events') {
                return createMockQueryBuilder({
                    data: [
                        {
                            id: 'event-123',
                            event_type: 'goal',
                            minute: 10,
                            players: { display_name: 'John Doe' }
                        }
                    ],
                    error: null
                });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await getMatchEvents('match-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(expect.arrayContaining([
            expect.objectContaining({
                player_name: 'John Doe'
            })
        ]));
    });
});

describe('addMatchEvent Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await addMatchEvent(
            'match-123',
            'team-123',
            'goal',
            15,
            'player-123',
            null,
            'tournament-123'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should successfully add a match event', async () => {
        // Use valid UUID strings for playerId and teamId to satisfy UUID regex check
        const teamId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
        const playerId = 'f1e2d3c4-b5a6-9f8e-7d6c-5b4a3f2e1d0c';

        const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'event-123', event_type: 'goal', minute: 15 },
                    error: null
                })
            }))
        }));

        const builderEvents = createMockQueryBuilder({
            data: [{ team_id: teamId }],
            error: null
        });
        builderEvents.insert = mockInsert;

        const builderMatches = createMockQueryBuilder({
            data: { home_team_id: teamId, away_team_id: 'other-team' },
            error: null
        });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'match_events') {
                return builderEvents;
            }
            if (table === 'matches') {
                return builderMatches;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await addMatchEvent(
            'match-123',
            teamId,
            'goal',
            15,
            playerId,
            null,
            'tournament-123'
        );

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            match_id: 'match-123',
            team_id: teamId,
            event_type: 'goal',
            minute: 15,
            player_id: playerId
        }));
    });
});

describe('deleteMatchEvent Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await deleteMatchEvent('event-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should successfully delete a match event', async () => {
        const mockDelete = vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
        }));

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'match_events') {
                const builder = createMockQueryBuilder({
                    data: { id: 'event-123', event_type: 'card', match_id: 'match-123' },
                    error: null
                });
                builder.delete = mockDelete;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await deleteMatchEvent('event-123', 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockDelete).toHaveBeenCalled();
    });
});
