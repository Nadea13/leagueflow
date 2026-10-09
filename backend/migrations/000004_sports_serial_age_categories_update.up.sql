-- 1. Sports table migration
ALTER TABLE IF EXISTS tournaments DROP CONSTRAINT IF EXISTS tournaments_sport_id_fkey;
ALTER TABLE IF EXISTS teams DROP CONSTRAINT IF EXISTS fk_teams_sport_id;
ALTER TABLE IF EXISTS master_players DROP CONSTRAINT IF EXISTS master_players_favorite_sport_id_fkey;
ALTER TABLE IF EXISTS player_sports DROP CONSTRAINT IF EXISTS player_sports_sport_id_fkey;

DROP TABLE IF EXISTS sports CASCADE;
DROP TYPE IF EXISTS sport_type_enum CASCADE;
CREATE TYPE sport_type_enum AS ENUM ('team', 'racket', 'individual', 'dual', 'combat', 'esports');

CREATE TABLE sports (
    id SERIAL PRIMARY KEY,
    sport_name VARCHAR(100) NOT NULL,
    sport_type sport_type_enum NOT NULL DEFAULT 'team',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

INSERT INTO sports (id, sport_name, sport_type) VALUES
(1, 'Football', 'team'),
(2, 'Volleyball', 'team'),
(3, 'Basketball', 'team'),
(4, 'Futsal', 'team'),
(5, 'Badminton', 'racket'),
(6, 'Tennis', 'racket'),
(7, 'Sepak Takraw', 'team'),
(8, 'Cricket', 'team');

SELECT setval('sports_id_seq', (SELECT MAX(id) FROM sports));

ALTER TABLE tournaments ALTER COLUMN sport_id TYPE integer USING NULL;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;

ALTER TABLE teams ALTER COLUMN sport_id TYPE integer USING NULL;
ALTER TABLE teams ADD CONSTRAINT fk_teams_sport_id FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;

ALTER TABLE master_players ALTER COLUMN favorite_sport_id TYPE integer USING NULL;
ALTER TABLE master_players ADD CONSTRAINT master_players_favorite_sport_id_fkey FOREIGN KEY (favorite_sport_id) REFERENCES sports(id) ON DELETE SET NULL;

UPDATE tournaments SET sport_id = CASE WHEN LOWER(name) LIKE '%volleyball%' OR LOWER(name) LIKE '%วอลเลย์บอล%' THEN 2 ELSE 1 END WHERE sport_id IS NULL;
UPDATE teams SET sport_id = 1 WHERE sport_id IS NULL;

-- 2. Age categories table migration
UPDATE tournament_categories SET age_category_id = NULL;
TRUNCATE TABLE age_categories RESTART IDENTITY CASCADE;
ALTER TABLE age_categories DROP COLUMN IF EXISTS gender;
ALTER TABLE age_categories DROP CONSTRAINT IF EXISTS age_categories_category_name_unique;
ALTER TABLE age_categories ADD CONSTRAINT age_categories_category_name_unique UNIQUE (category_name);

-- 3. Tournament categories table migration
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS age_min;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS age_max;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS settings;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS format;
