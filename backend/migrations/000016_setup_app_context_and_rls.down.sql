-- Migration Down: 000016_setup_app_context_and_rls

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_roster_submissions') THEN
        DROP POLICY IF EXISTS roster_submissions_select_policy ON tournament_roster_submissions;
        DROP POLICY IF EXISTS roster_submissions_insert_policy ON tournament_roster_submissions;
        DROP POLICY IF EXISTS roster_submissions_update_policy ON tournament_roster_submissions;
        DROP POLICY IF EXISTS roster_submissions_delete_policy ON tournament_roster_submissions;
        ALTER TABLE tournament_roster_submissions NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE tournament_roster_submissions DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DROP POLICY IF EXISTS tournament_teams_select_policy ON tournament_teams;
DROP POLICY IF EXISTS tournament_teams_insert_policy ON tournament_teams;
DROP POLICY IF EXISTS tournament_teams_update_policy ON tournament_teams;
DROP POLICY IF EXISTS tournament_teams_delete_policy ON tournament_teams;
ALTER TABLE tournament_teams NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_policy ON payments;
DROP POLICY IF EXISTS payments_insert_policy ON payments;
DROP POLICY IF EXISTS payments_update_policy ON payments;
DROP POLICY IF EXISTS payments_delete_policy ON payments;
ALTER TABLE payments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;
DROP POLICY IF EXISTS teams_delete_policy ON teams;
ALTER TABLE teams NO FORCE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS app.is_admin_or_bypass();
DROP FUNCTION IF EXISTS app.current_user_role();
DROP FUNCTION IF EXISTS app.current_user_id();
DROP SCHEMA IF EXISTS app CASCADE;
