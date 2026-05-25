-- Add contact_email to teams (global)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_email TEXT;
