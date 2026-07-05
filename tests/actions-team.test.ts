import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTeam, addPlayer, updateTeamGlobal, deleteTeamGlobal, updatePlayer, deletePlayer } from '@/actions/manager/team';

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

describe('createTeam Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const formData = new FormData();
        formData.append('name', 'Test Team');
        formData.append('contact_name', 'John Doe');
        formData.append('contact_phone', '0812345678');

        const result = await createTeam({ success: false }, formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should return error if team name is missing', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });

        const formData = new FormData();
        formData.append('contact_name', 'John Doe');
        formData.append('contact_phone', '0812345678');

        const result = await createTeam({ success: false }, formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Team name is required');
    });

    it('should successfully create a team', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });

        // Mock teams insertion and fetch
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockSingle = vi.fn().mockResolvedValue({
            data: { id: 'team-123', name: 'Test Team' },
            error: null,
        });
        const mockLimit = vi.fn(() => ({ single: mockSingle }));
        const mockOrder = vi.fn(() => ({ limit: mockLimit }));
        const mockEq2 = vi.fn(() => ({ order: mockOrder }));
        const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
        const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'teams') {
                return { 
                    insert: mockInsert,
                    select: mockSelect,
                };
            }
            if (table === 'sports') {
                return {
                    select: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sport-123' } }) })) })),
                };
            }
            return {};
        });

        const formData = new FormData();
        formData.append('name', 'Test Team');
        formData.append('contact_name', 'John Doe');
        formData.append('contact_phone', '0812345678');
        formData.append('sport_id', 'sport-123');

        const result = await createTeam({ success: false }, formData);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('teams');
        expect(mockInsert).toHaveBeenCalled();
    });
});

describe('addPlayer Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const formData = new FormData();
        formData.append('name', 'Player One');

        const result = await addPlayer('team-123', formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should return error if unauthorized to manage the team roster', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });
        
        // Mock all calls to return empty/unauthorized data
        mockSupabase.from.mockImplementation((_table) => {
            return createMockQueryBuilder({ data: null, error: null });
        });

        const formData = new FormData();
        formData.append('name', 'Player One');

        const result = await addPlayer('team-123', formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized to manage this roster');
    });

    it('should successfully add a player to the team roster', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

        const mockPlayerSportsInsert = vi.fn().mockResolvedValue({ error: null });

        const mockSingle = vi.fn()
            .mockResolvedValueOnce({ data: { id: 'team-123' }, error: null }) // isAuthorizedForTeam
            .mockResolvedValueOnce({ data: { id: 'team-123', sport_id: 'sport-123' }, error: null }); // addPlayer sport check

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'teams') {
                // Chains used:
                // 1. isAuthorizedForTeam -> teams.select().eq().eq().single() => returns team check (authorized)
                // 2. addPlayer -> teams.select("id, sport_id").eq("id", teamId).single() => returns sport ID
                const builder = createMockQueryBuilder({});
                builder.single = mockSingle;
                return builder;
            }
            if (table === 'tournament_teams') {
                return createMockQueryBuilder({ data: null, error: null });
            }
            if (table === 'tournaments') {
                return createMockQueryBuilder({ data: [{ id: 'tournament-123' }], error: null });
            }
            if (table === 'master_players') {
                return createMockQueryBuilder({ data: { id: 'master-123' }, error: null });
            }
            if (table === 'players') {
                return createMockQueryBuilder({ data: { id: 'player-123' }, error: null });
            }
            if (table === 'player_sports') {
                return {
                    insert: mockPlayerSportsInsert
                };
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const formData = new FormData();
        formData.append('name', 'Player One');
        formData.append('position', 'Forward');
        formData.append('number', '10');

        const result = await addPlayer('team-123', formData);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('players');
        expect(mockSupabase.from).toHaveBeenCalledWith('player_sports');
        expect(mockPlayerSportsInsert).toHaveBeenCalledWith({
            player_id: 'player-123',
            sport_id: 'sport-123',
            team_id: 'team-123',
            position: 'Forward',
            shirt_number: '10'
        });
    });
});

describe('updateTeamGlobal Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const formData = new FormData();
        formData.append('name', 'Updated Team');

        const result = await updateTeamGlobal('team-123', formData, 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should successfully update a global team info', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

        const builder = createMockQueryBuilder({ data: { id: 'team-123' }, error: null });
        const mockUpdate = vi.fn(() => builder);
        builder.update = mockUpdate;

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'teams') {
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const formData = new FormData();
        formData.append('name', 'Updated Team Name');
        formData.append('sport', 'football');

        const result = await updateTeamGlobal('team-123', formData, 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Updated Team Name',
        }));
    });
});

describe('deleteTeamGlobal Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const result = await deleteTeamGlobal('team-123', 'tournament-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should successfully delete a global team', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

        const builder = createMockQueryBuilder({ data: { id: 'team-123' }, error: null });
        const mockUpdate = vi.fn(() => builder);
        builder.update = mockUpdate;

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'teams') {
                return builder;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await deleteTeamGlobal('team-123', 'tournament-123');

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            deleted_at: expect.any(String),
        }));
    });
});

describe('updatePlayer Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const result = await updatePlayer('player-123', 'team-123', { name: 'New Name' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should successfully update a player', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

        const builderTeams = createMockQueryBuilder({ data: { id: 'team-123' }, error: null });
        const builderPlayers = createMockQueryBuilder({ error: null });
        const mockUpdate = vi.fn(() => builderPlayers);
        builderPlayers.update = mockUpdate;

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'teams') {
                return builderTeams;
            }
            if (table === 'players' || table === 'player_sports') {
                return builderPlayers;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await updatePlayer('player-123', 'team-123', { name: 'New Name', position: 'Midfielder' });

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalled();
    });
});

describe('deletePlayer Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return error if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

        const result = await deletePlayer('player-123', 'team-123');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should successfully delete a player', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

        const builderTeams = createMockQueryBuilder({ data: { id: 'team-123' }, error: null });
        const builderPlayers = createMockQueryBuilder({ error: null });
        const mockDelete = vi.fn(() => builderPlayers);
        builderPlayers.delete = mockDelete;

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'teams') {
                return builderTeams;
            }
            if (table === 'players') {
                return builderPlayers;
            }
            return createMockQueryBuilder({ data: null, error: null });
        });

        const result = await deletePlayer('player-123', 'team-123');

        expect(result.success).toBe(true);
        expect(mockDelete).toHaveBeenCalled();
    });
});
