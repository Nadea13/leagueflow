-- Ensure tournament_sponsors table exists before adding cover_url
CREATE TABLE IF NOT EXISTS tournament_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    sponsor_name VARCHAR(255) NOT NULL DEFAULT '',
    logo_img TEXT,
    cover_url TEXT,
    link_url TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE tournament_sponsors ADD COLUMN IF NOT EXISTS cover_url text;
