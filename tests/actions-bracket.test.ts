import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveBracketCanvas } from '@/actions/tournaments/bracket';

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

describe('saveBracketCanvas Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const canvasData = { nodes: [], edges: [] };
        const result = await saveBracketCanvas('tournament-123', canvasData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should return error if no tournament category is found', async () => {
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_categories') {
                return createMockQueryBuilder({ data: [], error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const canvasData = { nodes: [], edges: [] };
        const result = await saveBracketCanvas('tournament-123', canvasData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Tournament category not found');
    });

    it('should successfully save empty canvas data', async () => {
        const mockUpdate = vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
        }));

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_categories') {
                const builder = createMockQueryBuilder({ data: [{ id: 'category-123' }], error: null });
                builder.update = mockUpdate;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const canvasData = { nodes: [], edges: [] };
        const result = await saveBracketCanvas('tournament-123', canvasData, 'category-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            canvas_data: canvasData,
        }));
    });
});
