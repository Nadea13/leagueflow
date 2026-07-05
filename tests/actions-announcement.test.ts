import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAnnouncements, addAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from '@/actions/tournaments/announcement';

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

describe('Announcement Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully get announcements', async () => {
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'announcements') {
                return createMockQueryBuilder({
                    data: [{ id: 'ann-123', title: 'Welcome!' }],
                    error: null
                });
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await getAnnouncements('tournament-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ title: 'Welcome!' })
        ]));
    });

    it('should successfully add an announcement', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'announcements') {
                const builder = createMockQueryBuilder({ error: null });
                builder.insert = mockInsert;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await addAnnouncement('tournament-123', 'Important Update', 'Please read');

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Important Update',
            content: 'Please read',
            tournament_id: 'tournament-123'
        }));
    });

    it('should successfully delete an announcement', async () => {
        const mockDelete = vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
        }));
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'announcements') {
                const builder = createMockQueryBuilder({ error: null });
                builder.delete = mockDelete;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await deleteAnnouncement('ann-123', 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockDelete).toHaveBeenCalled();
    });

    it('should successfully toggle announcement pin status', async () => {
        const mockUpdate = vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
        }));
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'announcements') {
                const builder = createMockQueryBuilder({ error: null });
                builder.update = mockUpdate;
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await toggleAnnouncementPin('ann-123', true, 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            is_pinned: true
        }));
    });
});
