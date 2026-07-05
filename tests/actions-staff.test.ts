import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteStaff, getStaffs, removeStaff } from '@/actions/tournaments/staff';

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

const mockValidateTournamentAccess = vi.fn().mockResolvedValue({ success: true, user: { id: 'user-123', email: 'owner@example.com' }, role: 'admin' });
vi.mock('@/lib/security', () => ({
    validateTournamentAccess: (..._args: unknown[]) => mockValidateTournamentAccess(..._args),
}));

vi.mock('@/lib/audit', () => ({
    logActivity: vi.fn(() => Promise.resolve()),
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

describe('inviteStaff Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123', email: 'owner@example.com' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await inviteStaff('tournament-123', 'staff@example.com');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should return error if inviting oneself', async () => {
        mockSupabase.from.mockImplementation(() => {
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await inviteStaff('tournament-123', 'owner@example.com');

        expect(result.success).toBe(false);
        expect(result.error).toBe('You cannot invite yourself');
    });

    it('should successfully invite a new staff collaborator', async () => {
        const mockInsert = vi.fn(() => ({
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'member-123', email: 'staff@example.com', role: 'staff' },
                    error: null
                })
            }))
        }));

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_invitations') {
                const builder = createMockQueryBuilder({ data: null, error: null }); // existing invitation is null
                builder.insert = mockInsert;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await inviteStaff('tournament-123', 'staff@example.com', 'staff');

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            email: 'staff@example.com',
            role: 'staff'
        }));
    });
});

describe('getStaffs Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'viewer' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await getStaffs('tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should successfully fetch all staff members', async () => {
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_invitations') {
                return createMockQueryBuilder({
                    data: [{ id: 'member-123', email: 'staff@example.com', role: 'staff' }],
                    error: null
                });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await getStaffs('tournament-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ email: 'staff@example.com' })
        ]));
    });
});

describe('removeStaff Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await removeStaff('member-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should successfully soft delete a staff member invitation', async () => {
        const mockUpdate = vi.fn(() => ({
            eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null })
            }))
        }));

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournament_invitations') {
                const builder = createMockQueryBuilder({ error: null });
                builder.update = mockUpdate;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await removeStaff('member-123', 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            deleted_at: expect.any(String)
        }));
    });
});
