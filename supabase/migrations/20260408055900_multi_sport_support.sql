-- Add sport columns for multi-sport support
ALTER TABLE tournaments ADD COLUMN sport text NOT NULL DEFAULT 'football';
ALTER TABLE teams ADD COLUMN sport text NOT NULL DEFAULT 'football';
ALTER TABLE tournament_teams ADD COLUMN sport text NOT NULL DEFAULT 'football';
ALTER TABLE global_players ADD COLUMN athlete_types text[] DEFAULT '{}';

-- Optional: Update existing records to ensure they have the default (though DEFAULT handles it)
UPDATE tournaments SET sport = 'football' WHERE sport IS NULL;
UPDATE teams SET sport = 'football' WHERE sport IS NULL;
UPDATE tournament_teams SET sport = 'football' WHERE sport IS NULL;
UPDATE global_players SET athlete_types = '{}' WHERE athlete_types IS NULL;
