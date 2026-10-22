import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTournamentAccess } from '@/lib/security';
import type { ServerAuthUser } from '@/lib/auth-server';

vi.mock('@/lib/auth-server', () => ({
    getServerSession: vi.fn(),
}));

import { getServerSession } from '@/lib/auth-server';

const createMockUser = (overrides: Partial<ServerAuthUser> = {}): ServerAuthUser => ({
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'Test User',
    role: 'user',
    is_active: true,
    ...overrides,
});

describe('validateTournamentAccess', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error when no user session is present', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce(null);

        const result = await validateTournamentAccess('tournament-123');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Authentication required');
        }
    });

    it('should grant admin role when user is the tournament organizer', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({
            user: createMockUser({ id: 'organizer-user', email: 'org@example.com' }),
            token: 'valid-jwt',
        });

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                tournament: {
                    id: 'tournament-123',
                    organizer_id: 'organizer-user',
                },
            }),
        } as Response);

        const result = await validateTournamentAccess('tournament-123');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.role).toBe('admin');
            expect(result.user.id).toBe('organizer-user');
        }
    });

    it('should grant admin role when user is super_admin', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({
            user: createMockUser({ id: 'super-admin-user', email: 'admin@example.com', role: 'super_admin' }),
            token: 'valid-jwt',
        });

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                tournament: {
                    id: 'tournament-123',
                    organizer_id: 'other-user',
                },
            }),
        } as Response);

        const result = await validateTournamentAccess('tournament-123');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.role).toBe('admin');
        }
    });

    it('should grant editor role for staff / co-organizers', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({
            user: createMockUser({ id: 'staff-user', email: 'staff@example.com' }),
            token: 'valid-jwt',
        });

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                tournament: {
                    id: 'tournament-123',
                    organizer_id: 'someone-else',
                },
            }),
        } as Response);

        const result = await validateTournamentAccess('tournament-123');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.role).toBe('editor');
        }
    });

    it('should fallback gracefully when tournament fetch encounters an error', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({
            user: createMockUser({ id: 'user-1', email: 'u1@example.com' }),
            token: 'valid-jwt',
        });

        global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

        const result = await validateTournamentAccess('tournament-123');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.user.id).toBe('user-1');
        }
    });
});
