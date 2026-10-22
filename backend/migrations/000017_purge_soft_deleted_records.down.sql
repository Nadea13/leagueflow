-- Migration Down: 000017_purge_soft_deleted_records

DROP TRIGGER IF EXISTS trg_purge_on_users_delete ON users;
DROP TRIGGER IF EXISTS trg_purge_on_teams_delete ON teams;
DROP TRIGGER IF EXISTS trg_purge_on_tournaments_delete ON tournaments;

DROP FUNCTION IF EXISTS app.trigger_purge_soft_deleted();
DROP FUNCTION IF EXISTS app.purge_soft_deleted_records();

DROP INDEX IF EXISTS idx_tournament_sponsors_deleted_at;
DROP INDEX IF EXISTS idx_tournament_categories_deleted_at;
DROP INDEX IF EXISTS idx_tournament_teams_deleted_at;
DROP INDEX IF EXISTS idx_matches_deleted_at;
DROP INDEX IF EXISTS idx_master_players_deleted_at;
DROP INDEX IF EXISTS idx_players_deleted_at;
DROP INDEX IF EXISTS idx_teams_deleted_at;
DROP INDEX IF EXISTS idx_tournaments_deleted_at;
DROP INDEX IF EXISTS idx_users_deleted_at;
