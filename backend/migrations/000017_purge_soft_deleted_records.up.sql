-- Migration: 000017_purge_soft_deleted_records
-- Description: Automated purge of soft-deleted records:
--   - 90 days retention: users, tournaments, teams, players, master_players
--   - 30 days retention: matches, tournament_teams, tournament_categories, tournament_sponsors, sports

-- 1. Ensure deleted_at column exists on users & master_players
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE master_players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Create partial indexes for fast lookups and purge operations
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournaments_deleted_at ON tournaments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_deleted_at ON players(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_master_players_deleted_at ON master_players(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_deleted_at ON matches(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_teams_deleted_at ON tournament_teams(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_categories_deleted_at ON tournament_categories(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_sponsors_deleted_at ON tournament_sponsors(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Stored Procedure: Purge soft-deleted records based on 90-day and 30-day rules
CREATE OR REPLACE FUNCTION app.purge_soft_deleted_records()
RETURNS JSONB AS $$
DECLARE
    purged_counts JSONB := '{}'::jsonb;
    cnt_matches INT := 0;
    cnt_tt INT := 0;
    cnt_tc INT := 0;
    cnt_sponsors INT := 0;
    cnt_sports INT := 0;
    cnt_players INT := 0;
    cnt_master_players INT := 0;
    cnt_teams INT := 0;
    cnt_tournaments INT := 0;
    cnt_users INT := 0;
BEGIN
    -- Temporary disable RLS constraints within this system cleanup procedure
    PERFORM set_config('app.bypass_rls', 'on', true);

    -- ========================================================================
    -- A. 30-DAY RETENTION TABLES (Child & Operational Entities)
    -- ========================================================================

    -- 1. Tournament Sponsors (30 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_sponsors') THEN
        DELETE FROM tournament_sponsors
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS cnt_sponsors = ROW_COUNT;
    END IF;

    -- 2. Matches (30 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'matches') THEN
        DELETE FROM matches
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS cnt_matches = ROW_COUNT;
    END IF;

    -- 3. Tournament Teams / Registrations (30 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_teams') THEN
        DELETE FROM tournament_teams
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS cnt_tt = ROW_COUNT;
    END IF;

    -- 4. Tournament Categories (30 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_categories') THEN
        DELETE FROM tournament_categories
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS cnt_tc = ROW_COUNT;
    END IF;

    -- 5. Sports (30 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sports') THEN
        DELETE FROM sports
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
        GET DIAGNOSTICS cnt_sports = ROW_COUNT;
    END IF;

    -- ========================================================================
    -- B. 90-DAY RETENTION TABLES (Core Entities: User, Tournament, Team, Player)
    -- ========================================================================

    -- 6. Players (Team-level players) (90 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'players') THEN
        DELETE FROM players
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS cnt_players = ROW_COUNT;
    END IF;

    -- 7. Master Players (Global player registry) (90 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'master_players') THEN
        DELETE FROM master_players
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS cnt_master_players = ROW_COUNT;
    END IF;

    -- 8. Teams (90 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
        DELETE FROM teams
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS cnt_teams = ROW_COUNT;
    END IF;

    -- 9. Tournaments (90 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournaments') THEN
        DELETE FROM tournaments
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS cnt_tournaments = ROW_COUNT;
    END IF;

    -- 10. Users (90 days)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DELETE FROM users
        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS cnt_users = ROW_COUNT;
    END IF;

    -- Compile summary JSON
    purged_counts := jsonb_build_object(
        'purged_at', NOW(),
        'retention_30_days', jsonb_build_object(
            'matches', cnt_matches,
            'tournament_teams', cnt_tt,
            'tournament_categories', cnt_tc,
            'tournament_sponsors', cnt_sponsors,
            'sports', cnt_sports
        ),
        'retention_90_days', jsonb_build_object(
            'players', cnt_players,
            'master_players', cnt_master_players,
            'teams', cnt_teams,
            'tournaments', cnt_tournaments,
            'users', cnt_users
        )
    );

    RETURN purged_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Opportunistic trigger function for tables when deleted_at is updated
CREATE OR REPLACE FUNCTION app.trigger_purge_soft_deleted()
RETURNS TRIGGER AS $$
BEGIN
    -- When a record gets soft-deleted (deleted_at transitions from NULL to NOT NULL),
    -- run purge in background / opportunistic check.
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        PERFORM app.purge_soft_deleted_records();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach triggers to core tables on soft-delete
DROP TRIGGER IF EXISTS trg_purge_on_tournaments_delete ON tournaments;
CREATE TRIGGER trg_purge_on_tournaments_delete
    AFTER UPDATE OF deleted_at ON tournaments
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION app.trigger_purge_soft_deleted();

DROP TRIGGER IF EXISTS trg_purge_on_teams_delete ON teams;
CREATE TRIGGER trg_purge_on_teams_delete
    AFTER UPDATE OF deleted_at ON teams
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION app.trigger_purge_soft_deleted();

DROP TRIGGER IF EXISTS trg_purge_on_users_delete ON users;
CREATE TRIGGER trg_purge_on_users_delete
    AFTER UPDATE OF deleted_at ON users
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION app.trigger_purge_soft_deleted();
