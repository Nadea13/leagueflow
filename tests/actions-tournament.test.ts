import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTournament, updateTournament, deleteTournament } from '@/actions/tournaments/general';

// Mock Next.js headers / cache / navigation
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
    headers: vi.fn(() => ({
        get: vi.fn(() => '127.0.0.1'),
    })),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
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
    createAdminClient: vi.fn(),
}));

vi.mock('@/lib/profile', () => ({
    ensureProfileExists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/file-validation', () => ({
    validateUploadedFile: vi.fn(() => ({ valid: true })),
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

const mockValidateTournamentAccess = vi.fn().mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
vi.mock('@/lib/security', () => ({
    validateTournamentAccess: (..._args: unknown[]) => mockValidateTournamentAccess(..._args),
}));

describe('createTournament Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const formData = new FormData();
        formData.append('name', 'Test Tournament');
        formData.append('sport_id', 'sport-123');
        formData.append('start_date', '2026-07-10');
        formData.append('end_date', '2026-07-20');
        formData.append('document_deadline', '2026-07-08');

        const result = await createTournament({ success: false }, formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should return error if name is missing', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });

        const formData = new FormData();
        formData.append('sport_id', 'sport-123');
        formData.append('start_date', '2026-07-10');
        formData.append('end_date', '2026-07-20');
        formData.append('document_deadline', '2026-07-08');

        const result = await createTournament({ success: false }, formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Name is required');
    });

    it('should successfully create a tournament', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ 
            data: { 
                user: { id: 'user-123', email: 'test@example.com' } 
            } 
        });

        // Mock insert tournaments chaining
        const mockSingle = vi.fn().mockResolvedValue({
            data: { id: 'tournament-123', name: 'Test Tournament' },
            error: null,
        });
        const mockSelect = vi.fn(() => ({ single: mockSingle }));
        const mockInsert = vi.fn(() => ({ select: mockSelect }));
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return { insert: mockInsert };
            }
            if (table === 'tournament_invitations') {
                return { insert: vi.fn().mockResolvedValue({ error: null }) };
            }
            if (table === 'audit_logs') {
                return { insert: vi.fn().mockResolvedValue({ error: null }) };
            }
            return {};
        });

        const formData = new FormData();
        formData.append('name', 'Test Tournament');
        formData.append('sport_id', 'sport-123');
        formData.append('description', 'A fun tournament');
        formData.append('start_date', '2026-07-10');
        formData.append('end_date', '2026-07-20');
        formData.append('document_deadline', '2026-07-08');

        const result = await createTournament({ success: false }, formData);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('tournaments');
        expect(mockInsert).toHaveBeenCalledWith({
            organizer_id: 'user-123',
            sport_id: 'sport-123',
            name: 'Test Tournament',
            description: 'A fun tournament',
            start_date: '2026-07-10',
            end_date: '2026-07-20',
            document_deadline: '2026-07-08',
        });
    });
});

describe('updateTournament Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const formData = new FormData();
        const result = await updateTournament('tournament-123', { success: false }, formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should successfully update tournament general info', async () => {
        const mockUpdate = vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
        }));
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return { update: mockUpdate };
            }
            if (table === 'tournament_categories') {
                return createMockQueryBuilder({ data: { id: 'category-123' }, error: null });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const formData = new FormData();
        formData.append('form_type', 'general');
        formData.append('name', 'Updated Tournament Name');
        formData.append('status', 'live');

        const result = await updateTournament('tournament-123', { success: false }, formData);

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Updated Tournament Name',
            status: 'live',
        }));
    });
});

describe('deleteTournament Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
    });

    it('should return error if unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const result = await deleteTournament('tournament-123');

        expect(result).toEqual({ success: false, error: 'Access denied' });
    });

    it('should successfully soft delete a tournament and redirect', async () => {
        const mockUpdate = vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
        }));
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'tournaments') {
                return { update: mockUpdate };
            }
            return {};
        });

        await deleteTournament('tournament-123');

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            deleted_at: expect.any(String),
        }));
        const { redirect } = await import('next/navigation');
        expect(redirect).toHaveBeenCalledWith('/dashboard/tournaments');
    });
});
