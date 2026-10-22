import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getSports,
    createTeam,
    getMyTeams,
    getTeam,
    updateTeamGlobal,
    deleteTeamGlobal,
    toggleRosterLock,
    getImportableTeams,
} from '@/actions/manager/team';

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
    getServerSession: vi.fn(() => Promise.resolve({
        user: { id: 'manager-user-123', email: 'manager@example.com' },
        token: 'mock-manager-jwt',
    })),
}));

vi.mock('@/actions/public', () => ({
    getPublicSports: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/audit', () => ({
    logActivity: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/file-validation', () => ({
    validateUploadedFile: vi.fn(() => ({ valid: true })),
}));

vi.mock('@/lib/r2', () => ({
    uploadToR2: vi.fn().mockResolvedValue({
        success: true,
        url: 'https://cdn.example.com/teams/logo.png',
    }),
}));

describe('Team Manager Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getSports', () => {
        it('should return sports list from backend API if available', async () => {
            const mockSports = [
                { id: 1, sport_name: 'Football' },
                { id: 2, sport_name: 'Volleyball' },
            ];
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockSports,
            } as Response);

            const res = await getSports();
            expect(res.success).toBe(true);
            expect(res.data).toEqual(mockSports);
        });

        it('should fallback to default sports if backend API fails', async () => {
            global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

            const res = await getSports();
            expect(res.success).toBe(true);
            expect(Array.isArray(res.data)).toBe(true);
            expect(res.data!.length).toBeGreaterThan(0);
        });
    });

    describe('createTeam', () => {
        it('should fail if required fields are missing', async () => {
            const formData = new FormData();
            formData.set('name', '');

            const res = await createTeam({ success: false }, formData);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Team name is required/i);
        });

        it('should create team successfully with valid fields', async () => {
            const formData = new FormData();
            formData.set('name', 'FC Barcelona');
            formData.set('contact_name', 'Xavi');
            formData.set('contact_phone', '0812345678');
            formData.set('sport_id', '1');

            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'new-team-id', name: 'FC Barcelona' }),
            } as Response);

            const res = await createTeam({ success: false }, formData);
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/teams'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-manager-jwt',
                    }),
                })
            );
        });
    });

    describe('getMyTeams', () => {
        it('should return teams belonging to the current user', async () => {
            const mockTeams = [
                { id: 'team-1', name: 'Thunder FC', sport_id: '1' },
            ];
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockTeams,
            } as Response);

            const res = await getMyTeams();
            expect(res.success).toBe(true);
            expect(res.data).toHaveLength(1);
            expect((res.data as any[])[0].name).toBe('Thunder FC');
        });
    });

    describe('getTeam', () => {
        it('should return team details by id', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'team-1', name: 'Thunder FC', sport_id: '1' }),
            } as Response);

            const team = await getTeam('team-1');
            expect(team).not.toBeNull();
            expect(team?.name).toBe('Thunder FC');
        });

        it('should return null if team is not found', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                status: 404,
            } as Response);

            const team = await getTeam('team-missing');
            expect(team).toBeNull();
        });
    });

    describe('updateTeamGlobal', () => {
        it('should update team information', async () => {
            const formData = new FormData();
            formData.set('name', 'Thunder FC Updated');
            formData.set('contact_name', 'Pep');
            formData.set('contact_phone', '0899999999');

            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'team-1', name: 'Thunder FC Updated' }),
            } as Response);

            const res = await updateTeamGlobal('team-1', formData, 'tour-1');
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/teams/team-1'),
                expect.objectContaining({
                    method: 'PUT',
                })
            );
        });
    });

    describe('deleteTeamGlobal', () => {
        it('should delete team successfully', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Deleted' }),
            } as Response);

            const res = await deleteTeamGlobal('team-1');
            expect(res.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/teams/team-1'),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });
    });

    describe('toggleRosterLock', () => {
        it('should toggle roster lock state', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ is_roster_locked: true }),
            } as Response);

            const res = await toggleRosterLock('team-1', true);
            expect(res.success).toBe(true);
        });
    });

    describe('getImportableTeams', () => {
        it('should return other user teams excluding current team id', async () => {
            const mockTeams = [
                { id: 'team-1', name: 'Team One' },
                { id: 'team-2', name: 'Team Two' },
            ];
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockTeams,
            } as Response);

            const res = await getImportableTeams('team-1');
            expect(res.success).toBe(true);
            expect(res.data).toHaveLength(1);
            expect(res.data![0].id).toBe('team-2');
        });
    });
});
