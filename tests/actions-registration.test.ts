import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveRegistration, rejectRegistration } from '@/actions/tournaments/registration';

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

describe('approveRegistration Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await approveRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should return error if registration is not found', async () => {
        mockSupabase.from.mockImplementation(() => {
            return createMockQueryBuilder({ data: null, error: { message: 'Not found' } });
        });

        const result = await approveRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Registration not found');
    });

    it('should return error if registration does not belong to this tournament', async () => {
        mockSupabase.from.mockImplementation(() => {
            return createMockQueryBuilder({
                data: {
                    id: 'reg-123',
                    tournament_categories: { tournament_id: 'tournament-999' }
                },
                error: null
            });
        });

        const result = await approveRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Registration does not belong to this tournament');
    });

    it('should successfully approve a pending registration', async () => {
        const builder = createMockQueryBuilder({
            data: {
                id: 'reg-123',
                payment_status: 'pending',
                registration_status: 'pending',
                tournament_categories: { tournament_id: 'tournament-123' }
            },
            error: null
        });
        const mockUpdate = vi.fn(() => builder);
        builder.update = mockUpdate;

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_teams') {
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await approveRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            payment_status: 'paid',
            registration_status: 'approved'
        }));
    });
});

describe('rejectRegistration Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await rejectRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should return error if registration is not found', async () => {
        mockSupabase.from.mockImplementation(() => {
            return createMockQueryBuilder({ data: null, error: { message: 'Not found' } });
        });

        const result = await rejectRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Registration not found');
    });

    it('should successfully reject a pending registration', async () => {
        const builder = createMockQueryBuilder({
            data: {
                id: 'reg-123',
                tournament_categories: { tournament_id: 'tournament-123' }
            },
            error: null
        });
        const mockUpdate = vi.fn(() => builder);
        builder.update = mockUpdate;

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_teams') {
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await rejectRegistration('reg-123', 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            payment_status: 'rejected',
            registration_status: 'rejected'
        }));
    });
});
