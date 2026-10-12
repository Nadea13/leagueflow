-- Force add document_deadline, deleted_at, and sports if missing
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS document_deadline DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS sport_id INTEGER;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport_id INTEGER;
ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create sports table if missing
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

DO $$ BEGIN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
