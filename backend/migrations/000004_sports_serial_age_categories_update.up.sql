-- 1. Sports table migration (Fail-safe)
DO $$ BEGIN
    CREATE TYPE sport_type_enum AS ENUM ('team', 'racket', 'individual', 'dual', 'combat', 'esports');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS sports (
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
(8, 'Cricket', 'team')
ON CONFLICT (id) DO NOTHING;

SELECT setval('sports_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sports));

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS sport_id INTEGER;
DO $$ BEGIN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport_id INTEGER;
DO $$ BEGIN
    ALTER TABLE teams ADD CONSTRAINT fk_teams_sport_id FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

UPDATE tournaments SET sport_id = CASE WHEN LOWER(name) LIKE '%volleyball%' OR LOWER(name) LIKE '%วอลเลย์บอล%' THEN 2 ELSE 1 END WHERE sport_id IS NULL;
UPDATE teams SET sport_id = 1 WHERE sport_id IS NULL;

-- 2. Age categories table migration (Fail-safe)
CREATE TABLE IF NOT EXISTS age_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) UNIQUE NOT NULL,
    min_age INT NOT NULL DEFAULT 0,
    max_age INT NOT NULL DEFAULT 99,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

INSERT INTO age_categories (id, category_name, min_age, max_age) VALUES
(1, 'Open / ประชาชนทั่วไป', 0, 99),
(2, 'U-12', 0, 12),
(3, 'U-14', 0, 14),
(4, 'U-16', 0, 16),
(5, 'U-18', 0, 18),
(6, 'Senior / ผู้สูงอายุ', 40, 99)
ON CONFLICT (category_name) DO NOTHING;

SELECT setval('age_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM age_categories));

-- 3. Tournament categories table migration
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS age_category_id INTEGER;
DO $$ BEGIN
    ALTER TABLE tournament_categories ADD CONSTRAINT fk_tc_age_category_id FOREIGN KEY (age_category_id) REFERENCES age_categories(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE tournament_categories DROP COLUMN IF EXISTS age_min;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS age_max;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS settings;
ALTER TABLE tournament_categories DROP COLUMN IF EXISTS format;
