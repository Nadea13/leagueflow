ALTER TABLE tournament_categories ADD COLUMN IF NOT EXISTS canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb;
