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

vi.mock('@/lib/auth-server', () => ({
    getServerSession: vi.fn(() => Promise.resolve({
        user: { id: 'user-123', email: 'test@example.com' },
        token: 'mock-jwt-token'
    }))
}));

describe('Announcement Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully get announcements', async () => {
        const mockAnnouncements = [{ id: 'ann-123', title: 'Welcome!', tournament_id: 'tournament-123', is_pinned: false, created_at: new Date().toISOString() }];
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(mockAnnouncements)
        });

        const result = await getAnnouncements('tournament-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ title: 'Welcome!' })
        ]));
    });

    it('should successfully add an announcement', async () => {
        const createdAnnouncement = { id: 'ann-new', title: 'Important Update', content: 'Please read', tournament_id: 'tournament-123', is_pinned: false, created_at: new Date().toISOString() };
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(createdAnnouncement)
        });

        const result = await addAnnouncement('tournament-123', 'Important Update', 'Please read');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(expect.objectContaining({
            title: 'Important Update'
        }));
    });

    it('should successfully delete an announcement', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ message: 'Announcement deleted successfully' })
        });

        const result = await deleteAnnouncement('ann-123', 'tournament-123');

        expect(result.success).toBe(true);
    });

    it('should successfully toggle announcement pin status', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ message: 'Announcement updated successfully' })
        });

        const result = await toggleAnnouncementPin('ann-123', true, 'tournament-123');

        expect(result.success).toBe(true);
    });
});
