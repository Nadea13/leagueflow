import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveBracketCanvas } from '@/actions/tournaments/bracket';
import { ApiClient } from '@/lib/api-client';

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

const mockValidateTournamentAccess = vi.fn().mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
vi.mock('@/lib/security', () => ({
    validateTournamentAccess: (..._args: unknown[]) => mockValidateTournamentAccess(..._args),
}));

vi.mock('@/lib/api-client', () => ({
    ApiClient: {
        fetch: vi.fn(),
        getToken: vi.fn(() => 'mock-token'),
        setToken: vi.fn(),
    },
}));

describe('saveBracketCanvas Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockValidateTournamentAccess.mockResolvedValue({ success: true, user: { id: 'user-123' }, role: 'admin' });
        // Mock global fetch for canvas update
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Canvas updated' }),
        } as Response);
    });

    it('should return error if user is unauthorized', async () => {
        mockValidateTournamentAccess.mockResolvedValueOnce({ success: false, error: 'Access denied' });

        const canvasData = { nodes: [], edges: [] };
        const result = await saveBracketCanvas('tournament-123', canvasData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Access denied');
    });

    it('should return error if no tournament category is found', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ tournament: { id: 'tournament-123' }, categories: [] }),
        } as Response);

        const canvasData = { nodes: [], edges: [] };
        const result = await saveBracketCanvas('tournament-123', canvasData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Tournament category not found');
    });

    it('should successfully sync matchNodes and save canvas data', async () => {
        const mockTeams = [
            { id: 'tt-1', team_id: 'team-1', team: { name: 'Team Alpha' } },
            { id: 'tt-2', team_id: 'team-2', team: { name: 'Team Beta' } },
        ];

        vi.mocked(ApiClient.fetch).mockImplementation(async (endpoint: string) => {
            if (endpoint.includes('/teams')) {
                return mockTeams;
            }
            if (endpoint.includes('/sync-matches')) {
                return {
                    message: 'Matches synced successfully',
                    matches: [
                        { id: 'db-match-1', node_id: 'node-1', match_index: 1 }
                    ]
                };
            }
            return [];
        });

        const canvasData = {
            nodes: [
                {
                    id: 'node-1',
                    type: 'matchNode',
                    position: { x: 100, y: 100 },
                    data: {
                        label: 'Final Match',
                        matches: [
                            {
                                placeholderA: 'Team Alpha',
                                placeholderB: 'Team Beta',
                                match_date: '2026-10-01',
                                match_time: '18:00'
                            }
                        ]
                    }
                }
            ],
            edges: []
        };

        const result = await saveBracketCanvas('tournament-123', canvasData, 'category-123');

        expect(result.success).toBe(true);
        expect(ApiClient.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sync-matches'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Team Alpha')
            })
        );
        // Verify dbId was populated back into node data
        expect((result.data?.nodes[0]?.data as any).matches[0].dbId).toBe('db-match-1');
    });
});
