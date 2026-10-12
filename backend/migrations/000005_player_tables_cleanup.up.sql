-- 1. master_players table & cleanups (Fail-safe)
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
    gender gender_enum NOT NULL DEFAULT 'unspecified',
    birthday DATE,
    tel VARCHAR(50),
    photo_url TEXT,
    favorite_sport_id INTEGER REFERENCES sports(id) ON DELETE SET NULL,
    status player_status_enum NOT NULL DEFAULT 'active',
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. player_sports fix (Fail-safe)
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

-- 3. players table sync
ALTER TABLE players ADD COLUMN IF NOT EXISTS shirt_number VARCHAR(20);
DO $$ BEGIN
    UPDATE players SET shirt_number = jersey_number::varchar WHERE shirt_number IS NULL AND jersey_number IS NOT NULL;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;
