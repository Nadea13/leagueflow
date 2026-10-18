-- Clean tournament_status enum to have strictly 4 statuses: draft, ongoing, completed, cancelled

-- 1. Temporarily convert column to varchar to break enum dependency
ALTER TABLE tournaments ALTER COLUMN status TYPE varchar USING status::varchar;

-- 2. Normalize existing values to the 4 canonical statuses
UPDATE tournaments
SET status = CASE
    WHEN status IN ('draft', 'published', 'registration_open', 'registration_closed', 'upcoming') THEN 'draft'
    WHEN status IN ('ongoing', 'active', 'live') THEN 'ongoing'
    WHEN status IN ('completed', 'finished', 'closed') THEN 'completed'
    WHEN status IN ('cancelled', 'canceled') THEN 'cancelled'
    ELSE 'draft'
END;

-- 3. Drop existing enum types if any
DROP TYPE IF EXISTS tournament_status CASCADE;
DROP TYPE IF EXISTS tournament_status_enum CASCADE;

-- 4. Recreate tournament_status and tournament_status_enum with strictly 4 values
CREATE TYPE tournament_status AS ENUM ('draft', 'ongoing', 'completed', 'cancelled');
CREATE TYPE tournament_status_enum AS ENUM ('draft', 'ongoing', 'completed', 'cancelled');

-- 5. Re-alter tournaments.status to the new enum type
ALTER TABLE tournaments ALTER COLUMN status TYPE tournament_status USING status::tournament_status;
ALTER TABLE tournaments ALTER COLUMN status SET DEFAULT 'draft'::tournament_status;
