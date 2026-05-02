-- Add contact columns to teams (global) and tournament_teams (participation)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS contact_phone TEXT;
