-- 1. master_players cleanups
UPDATE master_players SET photo_url = profile_img WHERE photo_url IS NULL AND profile_img IS NOT NULL;
ALTER TABLE master_players DROP COLUMN IF EXISTS profile_img;
ALTER TABLE master_players DROP COLUMN IF EXISTS middle_name;
ALTER TABLE master_players ALTER COLUMN birthday DROP NOT NULL;

-- 2. player_sports fix
ALTER TABLE player_sports DROP CONSTRAINT IF EXISTS player_sports_sport_id_fkey;
ALTER TABLE player_sports DROP COLUMN IF EXISTS sport_id;
ALTER TABLE player_sports ADD COLUMN sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE;

-- 3. players table sync
ALTER TABLE players ADD COLUMN IF NOT EXISTS shirt_number VARCHAR(20);
UPDATE players SET shirt_number = jersey_number::varchar WHERE shirt_number IS NULL AND jersey_number IS NOT NULL;
