import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMatch } from '@/actions/tournaments/matches';

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

vi.mock('@/lib/audit', () => ({
    logActivity: vi.fn(() => Promise.resolve()),
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

describe('updateMatch Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await updateMatch('match-123', {}, 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should successfully update match details', async () => {
        const mockUpdate = vi.fn(() => ({
            eq: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                        data: {
                            id: 'match-123',
                            status: 'live',
                            tournament_category_id: 'category-123',
                        },
                        error: null,
                    }),
                })),
            })),
        }));

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'matches') {
                const builder = createMockQueryBuilder({
                    data: { id: 'match-123', status: 'scheduled' },
                    error: null,
                });
                builder.update = mockUpdate;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await updateMatch('match-123', { status: 'live' }, 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'live',
        }));
    });
});
