import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    approveRegistration,
    rejectRegistration,
    requestRosterUnlock,
    approveRosterUnlock,
    rejectRosterUnlock,
    getPendingInboxCount,
    withdrawTournamentTeam,
} from '@/actions/tournaments/registration';

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

describe('Tournament Registration Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({
            success: true,
            user: { id: 'org-user' },
            role: 'admin',
        });
    });

    describe('approveRegistration', () => {
        it('should approve registration and update status', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Registration approved' }),
            } as Response);

            const res = await approveRegistration('reg-1', 'tournament-1');
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/tournaments/tournament-1/registrations/reg-1/status'),
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'approved',
                        payment_status: 'paid',
                        registration_status: 'approved',
                    }),
                })
            );
        });

        it('should return error if API call fails', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Unauthorized to approve registration' }),
            } as Response);

            const res = await approveRegistration('reg-1', 'tournament-1');
            expect(res.success).toBe(false);
            expect(res.error).toBe('Unauthorized to approve registration');
        });
    });

    describe('rejectRegistration', () => {
        it('should reject registration', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Registration rejected' }),
            } as Response);

            const res = await rejectRegistration('reg-1', 'tournament-1');
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/tournaments/tournament-1/registrations/reg-1/status'),
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'rejected',
                        payment_status: 'rejected',
                        registration_status: 'rejected',
                    }),
                })
            );
        });

        it('should return error if rejection fails', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Failed to reject registration' }),
            } as Response);

            const res = await rejectRegistration('reg-1', 'tournament-1');
            expect(res.success).toBe(false);
            expect(res.error).toBe('Failed to reject registration');
        });
    });

    describe('Roster Unlock Lifecycle', () => {
        it('should submit request to unlock roster', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Unlock requested' }),
            } as Response);

            const res = await requestRosterUnlock('reg-1');
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/registrations/reg-1/request-unlock'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should approve roster unlock request if user has admin access', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Unlock approved' }),
            } as Response);

            const res = await approveRosterUnlock('reg-1', 'tournament-1');
            expect(res.success).toBe(true);
            expect(mockValidateTournamentAccess).toHaveBeenCalledWith('tournament-1', 'admin');
        });

        it('should reject roster unlock approval if access check fails', async () => {
            mockValidateTournamentAccess.mockResolvedValueOnce({
                success: false,
                error: 'Unauthorized organizer access',
            });

            const res = await approveRosterUnlock('reg-1', 'tournament-1');
            expect(res.success).toBe(false);
            expect(res.error).toBe('Unauthorized organizer access');
        });

        it('should reject roster unlock request if user has admin access', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Unlock rejected' }),
            } as Response);

            const res = await rejectRosterUnlock('reg-1', 'tournament-1');
            expect(res.success).toBe(true);
            expect(mockValidateTournamentAccess).toHaveBeenCalledWith('tournament-1', 'admin');
        });
    });

    describe('Inbox & Withdrawal Actions', () => {
        it('should get pending inbox count', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 1 }, { id: 2 }],
            } as Response);

            const res = await getPendingInboxCount();
            expect(res.success).toBe(true);
            expect(res.data).toBe(2);
        });

        it('should withdraw tournament team successfully', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Team withdrawn' }),
            } as Response);

            const res = await withdrawTournamentTeam('reg-1');
            expect(res.success).toBe(true);
        });
    });
});
