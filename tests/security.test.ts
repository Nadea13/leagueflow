import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTournamentAccess } from '@/lib/security';

// Mock Next.js headers / cache
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
    headers: vi.fn(() => ({
        get: vi.fn(() => '127.0.0.1'),
    })),
}));

// Mock Supabase Server client
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
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

describe('validateTournamentAccess Security Utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated (auth.getUser returns null)', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const result = await validateTournamentAccess('tournament-123', 'viewer');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Authentication required');
        }
    });

    it('should return admin access if user is the owner/organizer of the tournament', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-owner' } } });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return createMockQueryBuilder({ data: { organizer_id: 'user-owner' }, error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await validateTournamentAccess('tournament-123', 'admin');

        expect(result.success).toBe(true);
        expect((result as { role?: string }).role).toBe('admin');
        expect((result as { user?: { id: string } }).user?.id).toBe('user-owner');
    });

    it('should map co_organizer to admin and approve access', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-collaborator' } } });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                // Not the owner
                return createMockQueryBuilder({ data: { organizer_id: 'user-owner' }, error: null });
            }
            if (table === 'tournament_invitations') {
                // Return accepted invitation as co_organizer
                return createMockQueryBuilder({ data: { role: 'co_organizer' }, error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await validateTournamentAccess('tournament-123', 'admin');

        expect(result.success).toBe(true);
        expect((result as { role?: string }).role).toBe('admin');
    });

    it('should map staff to editor and approve editor access, but reject admin access', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-staff' } } });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return createMockQueryBuilder({ data: { organizer_id: 'user-owner' }, error: null });
            }
            if (table === 'tournament_invitations') {
                return createMockQueryBuilder({ data: { role: 'staff' }, error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        // 1. Check with 'editor' (should be successful)
        const okResult = await validateTournamentAccess('tournament-123', 'editor');
        expect(okResult.success).toBe(true);
        expect((okResult as { role?: string }).role).toBe('editor');

        // 2. Check with 'admin' (should be rejected because staff has lower priority)
        const rejectResult = await validateTournamentAccess('tournament-123', 'admin');
        expect(rejectResult.success).toBe(false);
        if (!rejectResult.success) {
            expect(rejectResult.error).toContain("Required role 'admin', but you are a 'editor'");
        }
    });

    it('should map referee to viewer and approve viewer access, but reject editor access', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-referee' } } });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return createMockQueryBuilder({ data: { organizer_id: 'user-owner' }, error: null });
            }
            if (table === 'tournament_invitations') {
                return createMockQueryBuilder({ data: { role: 'referee' }, error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        // 1. Check with 'viewer' (should be successful)
        const okResult = await validateTournamentAccess('tournament-123', 'viewer');
        expect(okResult.success).toBe(true);
        expect((okResult as { role?: string }).role).toBe('viewer');

        // 2. Check with 'editor' (should be rejected because referee has lower priority)
        const rejectResult = await validateTournamentAccess('tournament-123', 'editor');
        expect(rejectResult.success).toBe(false);
        if (!rejectResult.success) {
            expect(rejectResult.error).toContain("Required role 'editor', but you are a 'viewer'");
        }
    });

    it('should return error if user is not a collaborator and not the owner', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-intruder' } } });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return createMockQueryBuilder({ data: { organizer_id: 'user-owner' }, error: null });
            }
            if (table === 'tournament_invitations') {
                // No invitation records
                return createMockQueryBuilder({ data: null, error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await validateTournamentAccess('tournament-123', 'viewer');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Access denied: You are not a collaborator for this tournament');
        }
    });
});
