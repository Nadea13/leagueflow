-- Fix missing tables and sync schema for tournaments, sports, age_categories, master_players
-- 1. Sports table & types
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

-- 2. Add sport_id column to tournaments and teams if not exists
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

-- 3. Age categories table
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

-- 4. Tournament categories columns
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS age_category_id INTEGER;
DO $$ BEGIN
    ALTER TABLE tournament_categories ADD CONSTRAINT fk_tc_age_category_id FOREIGN KEY (age_category_id) REFERENCES age_categories(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS gender_type VARCHAR(50) DEFAULT 'open';
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS max_teams INT DEFAULT 16;
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS rules_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 5. Master Players Table
DO $$ BEGIN
    CREATE TYPE player_status_enum AS ENUM ('active', 'injury', 'retire');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other', 'unspecified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS master_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name_th VARCHAR(255),
    middle_name_th VARCHAR(255),
    last_name_th VARCHAR(255),
    first_name_en VARCHAR(255),
    middle_name_en VARCHAR(255),
    last_name_en VARCHAR(255),
    first_name_local VARCHAR(255),
    middle_name_local VARCHAR(255),
    last_name_local VARCHAR(255),
    first_name_intl VARCHAR(255),
    middle_name_intl VARCHAR(255),
    last_name_intl VARCHAR(255),
    gender gender_enum NOT NULL DEFAULT 'unspecified',
    birthday DATE,
    tel VARCHAR(50),
    photo_url TEXT,
    profile_img TEXT,
    favorite_sport_id INTEGER REFERENCES sports(id) ON DELETE SET NULL,
    status player_status_enum NOT NULL DEFAULT 'active',
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. Player sports table
CREATE TABLE IF NOT EXISTS player_sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    position VARCHAR(100),
    shirt_number VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 7. Tournament team extra columns
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS slip_img TEXT;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS registration_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS roster_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS is_roster_locked BOOLEAN DEFAULT false;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS unlock_requested BOOLEAN DEFAULT false;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 8. Tournament extra columns & Soft Deletes
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS document_deadline DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
