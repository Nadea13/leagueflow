-- Ensure all team columns exist and sync user_id with created_by
ALTER TABLE teams ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_img TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_roster_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sport_id INTEGER;

-- Sync user_id and created_by
UPDATE teams SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE teams SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
