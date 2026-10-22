import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelTournament, createTournamentCategory, deleteTournamentCategory } from '@/actions/tournaments/general';

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
        user: { id: 'org-user', email: 'org@example.com' },
        token: 'mock-jwt-token',
    })),
}));

const mockValidateTournamentAccess = vi.fn();
vi.mock('@/lib/security', () => ({
    validateTournamentAccess: (...args: unknown[]) => mockValidateTournamentAccess(...args),
}));

vi.mock('@/lib/audit', () => ({
    logActivity: vi.fn().mockResolvedValue(true),
}));

describe('Tournament General Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({
            success: true,
            user: { id: 'org-user' },
            role: 'admin',
        });
    });

    describe('cancelTournament', () => {
        it('should return error if user lacks editor or admin role', async () => {
            mockValidateTournamentAccess.mockResolvedValueOnce({
                success: false,
                error: 'Unauthorized access',
            });

            const res = await cancelTournament('tournament-123');
            expect(res.success).toBe(false);
            expect(res.error).toBe('Unauthorized access');
        });

        it('should successfully cancel tournament via backend endpoint', async () => {
            // First fetch: GET current tournament
            // Second fetch: PUT updated tournament
            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tournament: { id: 'tournament-123', settings: {} } }),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ message: 'Tournament cancelled' }),
                } as Response);

            const res = await cancelTournament('tournament-123');
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('createTournamentCategory', () => {
        it('should create tournament category successfully', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'new-cat-123' }),
            } as Response);

            const res = await createTournamentCategory(
                'tournament-123',
                1,
                'open',
                16,
                500
            );

            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/tournaments/tournament-123/categories'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should reject when user does not have permission', async () => {
            mockValidateTournamentAccess.mockResolvedValueOnce({
                success: false,
                error: 'Forbidden',
            });

            const res = await createTournamentCategory(
                'tournament-123',
                1,
                'open',
                16,
                500
            );

            expect(res.success).toBe(false);
            expect(res.error).toBe('Forbidden');
        });
    });

    describe('deleteTournamentCategory', () => {
        it('should delete category and associated matches and teams', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Category deleted' }),
            } as Response);

            const res = await deleteTournamentCategory('tournament-123', 'cat-123');
            expect(res.success).toBe(true);
        });
    });
});
