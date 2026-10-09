-- Migration: Drop redundant 'status' column from tournament_teams
ALTER TABLE tournament_teams DROP COLUMN IF EXISTS status;
