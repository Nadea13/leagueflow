import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMatch } from '@/actions/tournaments/matches';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
    getServerSession: vi.fn(() => Promise.resolve({
        user: { id: 'referee-user' },
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

describe('Match Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({
            success: true,
            user: { id: 'referee-user' },
            role: 'editor',
        });
    });

    it('should reject update if user has no editor access', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({
            success: false,
            error: 'Permission denied',
        });

        const res = await updateMatch('match-1', { home_score: 2 }, 'tournament-1');
        expect(res.success).toBe(false);
        expect(res.error).toBe('Permission denied');
    });

    it('should update match score and status successfully', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'match-1', home_score: 3, away_score: 1 }),
        } as Response);

        const res = await updateMatch(
            'match-1',
            {
                home_score: 3,
                away_score: 1,
                status: 'completed',
            },
            'tournament-1'
        );

        expect(res.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/matches/match-1'),
            expect.objectContaining({
                method: 'PUT',
                body: expect.stringContaining('"home_score":3'),
            })
        );
    });

    it('should update match timer state and minute', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'match-1', timer_status: 'playing' }),
        } as Response);

        const res = await updateMatch(
            'match-1',
            {
                timer_status: 'playing',
                current_minute: 45,
                elapsed_before_pause: 2700,
            },
            'tournament-1'
        );

        expect(res.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/matches/match-1'),
            expect.objectContaining({
                method: 'PUT',
                body: expect.stringContaining('"timer_status":"playing"'),
            })
        );
    });
});
