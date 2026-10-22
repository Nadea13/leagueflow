-- Migration: 000016_setup_app_context_and_rls
-- Description: Sets up app session schema, helper functions, and RLS policies for high-risk tables (Scope A).

CREATE SCHEMA IF NOT EXISTS app;

-- Helper 1: Extract current user ID from session settings
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper 2: Extract current user role from session settings
CREATE OR REPLACE FUNCTION app.current_user_role() RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper 3: Check if super_admin or bypass_rls flag is on
CREATE OR REPLACE FUNCTION app.is_admin_or_bypass() RETURNS BOOLEAN AS $$
BEGIN
    RETURN app.current_user_role() = 'super_admin' 
        OR current_setting('app.bypass_rls', true) = 'on';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_policy ON users;
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        is_active = true 
        OR id = app.current_user_id() 
        OR app.is_admin_or_bypass()
        OR app.current_user_id() IS NULL
    );

DROP POLICY IF EXISTS users_insert_policy ON users;
CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (
        app.is_admin_or_bypass() 
        OR app.current_user_id() IS NULL 
        OR id = app.current_user_id()
    );

DROP POLICY IF EXISTS users_update_policy ON users;
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (
        id = app.current_user_id() 
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS users_delete_policy ON users;
CREATE POLICY users_delete_policy ON users
    FOR DELETE
    USING (
        app.is_admin_or_bypass()
    );

-- ============================================================================
-- 2. TEAMS TABLE
-- ============================================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select_policy ON teams;
CREATE POLICY teams_select_policy ON teams
    FOR SELECT
    USING (
        deleted_at IS NULL 
        OR user_id = app.current_user_id() 
        OR created_by = app.current_user_id() 
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS teams_insert_policy ON teams;
CREATE POLICY teams_insert_policy ON teams
    FOR INSERT
    WITH CHECK (
        user_id = app.current_user_id() 
        OR created_by = app.current_user_id() 
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS teams_update_policy ON teams;
CREATE POLICY teams_update_policy ON teams
    FOR UPDATE
    USING (
        user_id = app.current_user_id() 
        OR created_by = app.current_user_id() 
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS teams_delete_policy ON teams;
CREATE POLICY teams_delete_policy ON teams
    FOR DELETE
    USING (
        user_id = app.current_user_id() 
        OR created_by = app.current_user_id() 
        OR app.is_admin_or_bypass()
    );

-- ============================================================================
-- 3. PAYMENTS TABLE
-- ============================================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_policy ON payments;
CREATE POLICY payments_select_policy ON payments
    FOR SELECT
    USING (
        user_id = app.current_user_id() 
        OR tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = app.current_user_id()
        )
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS payments_insert_policy ON payments;
CREATE POLICY payments_insert_policy ON payments
    FOR INSERT
    WITH CHECK (
        user_id = app.current_user_id() 
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS payments_update_policy ON payments;
CREATE POLICY payments_update_policy ON payments
    FOR UPDATE
    USING (
        app.is_admin_or_bypass() 
        OR tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = app.current_user_id()
        )
    );

DROP POLICY IF EXISTS payments_delete_policy ON payments;
CREATE POLICY payments_delete_policy ON payments
    FOR DELETE
    USING (
        app.is_admin_or_bypass()
    );

-- ============================================================================
-- 4. TOURNAMENT_TEAMS TABLE (Registrations)
-- ============================================================================
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournament_teams_select_policy ON tournament_teams;
CREATE POLICY tournament_teams_select_policy ON tournament_teams
    FOR SELECT
    USING (
        (registration_status = 'approved' AND deleted_at IS NULL)
        OR team_id IN (
            SELECT id FROM teams WHERE user_id = app.current_user_id() OR created_by = app.current_user_id()
        )
        OR tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = app.current_user_id()
        )
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS tournament_teams_insert_policy ON tournament_teams;
CREATE POLICY tournament_teams_insert_policy ON tournament_teams
    FOR INSERT
    WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE user_id = app.current_user_id() OR created_by = app.current_user_id()
        )
        OR tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = app.current_user_id()
        )
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS tournament_teams_update_policy ON tournament_teams;
CREATE POLICY tournament_teams_update_policy ON tournament_teams
    FOR UPDATE
    USING (
        tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = app.current_user_id()
        )
        OR team_id IN (
            SELECT id FROM teams WHERE user_id = app.current_user_id() OR created_by = app.current_user_id()
        )
        OR app.is_admin_or_bypass()
    );

DROP POLICY IF EXISTS tournament_teams_delete_policy ON tournament_teams;
CREATE POLICY tournament_teams_delete_policy ON tournament_teams
    FOR DELETE
    USING (
        tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = app.current_user_id()
        )
        OR team_id IN (
            SELECT id FROM teams WHERE user_id = app.current_user_id() OR created_by = app.current_user_id()
        )
        OR app.is_admin_or_bypass()
    );

-- ============================================================================
-- 5. TOURNAMENT_ROSTER_SUBMISSIONS TABLE
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_roster_submissions') THEN
        ALTER TABLE tournament_roster_submissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tournament_roster_submissions FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS roster_submissions_select_policy ON tournament_roster_submissions;
        CREATE POLICY roster_submissions_select_policy ON tournament_roster_submissions
            FOR SELECT
            USING (
                status = 'approved'
                OR tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN teams t ON tt.team_id = t.id
                    WHERE t.user_id = app.current_user_id() OR t.created_by = app.current_user_id()
                )
                OR tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN tournaments tour ON tt.tournament_id = tour.id
                    WHERE tour.organizer_id = app.current_user_id()
                )
                OR app.is_admin_or_bypass()
            );

        DROP POLICY IF EXISTS roster_submissions_insert_policy ON tournament_roster_submissions;
        CREATE POLICY roster_submissions_insert_policy ON tournament_roster_submissions
            FOR INSERT
            WITH CHECK (
                tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN teams t ON tt.team_id = t.id
                    WHERE t.user_id = app.current_user_id() OR t.created_by = app.current_user_id()
                )
                OR app.is_admin_or_bypass()
            );

        DROP POLICY IF EXISTS roster_submissions_update_policy ON tournament_roster_submissions;
        CREATE POLICY roster_submissions_update_policy ON tournament_roster_submissions
            FOR UPDATE
            USING (
                tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN tournaments tour ON tt.tournament_id = tour.id
                    WHERE tour.organizer_id = app.current_user_id()
                )
                OR tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN teams t ON tt.team_id = t.id
                    WHERE t.user_id = app.current_user_id() OR t.created_by = app.current_user_id()
                )
                OR app.is_admin_or_bypass()
            );

        DROP POLICY IF EXISTS roster_submissions_delete_policy ON tournament_roster_submissions;
        CREATE POLICY roster_submissions_delete_policy ON tournament_roster_submissions
            FOR DELETE
            USING (
                tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN tournaments tour ON tt.tournament_id = tour.id
                    WHERE tour.organizer_id = app.current_user_id()
                )
                OR tournament_team_id IN (
                    SELECT tt.id FROM tournament_teams tt
                    JOIN teams t ON tt.team_id = t.id
                    WHERE t.user_id = app.current_user_id() OR t.created_by = app.current_user_id()
                )
                OR app.is_admin_or_bypass()
            );
    END IF;
END $$;
