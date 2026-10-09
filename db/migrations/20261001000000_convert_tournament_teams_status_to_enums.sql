-- Migration: Convert payment_status and registration_status in tournament_teams to Enums

-- 1. Ensure ENUM types exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM ('pending', 'checking', 'paid', 'rejected');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status_enum') THEN
        CREATE TYPE registration_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- 2. Drop existing column defaults if necessary
ALTER TABLE tournament_teams ALTER COLUMN payment_status DROP DEFAULT;
ALTER TABLE tournament_teams ALTER COLUMN registration_status DROP DEFAULT;
ALTER TABLE tournament_teams ALTER COLUMN roster_status DROP DEFAULT;

-- 3. Convert payment_status column to payment_status_enum
ALTER TABLE tournament_teams 
  ALTER COLUMN payment_status TYPE payment_status_enum 
  USING (
    CASE 
      WHEN payment_status::text IN ('pending', 'checking', 'paid', 'rejected') THEN payment_status::text::payment_status_enum
      WHEN payment_status::text = 'success' THEN 'paid'::payment_status_enum
      WHEN payment_status::text = 'failed' THEN 'rejected'::payment_status_enum
      ELSE 'pending'::payment_status_enum
    END
  );

-- 4. Convert registration_status column to registration_status_enum
ALTER TABLE tournament_teams 
  ALTER COLUMN registration_status TYPE registration_status_enum 
  USING (
    CASE 
      WHEN registration_status::text IN ('pending', 'approved', 'rejected') THEN registration_status::text::registration_status_enum
      ELSE 'pending'::registration_status_enum
    END
  );

-- 5. Convert roster_status column to registration_status_enum
ALTER TABLE tournament_teams 
  ALTER COLUMN roster_status TYPE registration_status_enum 
  USING (
    CASE 
      WHEN roster_status::text IN ('pending', 'approved', 'rejected') THEN roster_status::text::registration_status_enum
      ELSE 'pending'::registration_status_enum
    END
  );

-- 6. Set correct default values and NOT NULL
UPDATE tournament_teams SET payment_status = 'pending' WHERE payment_status IS NULL;
UPDATE tournament_teams SET registration_status = 'pending' WHERE registration_status IS NULL;
UPDATE tournament_teams SET roster_status = 'pending' WHERE roster_status IS NULL;

ALTER TABLE tournament_teams ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE tournament_teams ALTER COLUMN registration_status SET NOT NULL;
ALTER TABLE tournament_teams ALTER COLUMN roster_status SET NOT NULL;

ALTER TABLE tournament_teams ALTER COLUMN payment_status SET DEFAULT 'pending'::payment_status_enum;
ALTER TABLE tournament_teams ALTER COLUMN registration_status SET DEFAULT 'pending'::registration_status_enum;
ALTER TABLE tournament_teams ALTER COLUMN roster_status SET DEFAULT 'pending'::registration_status_enum;
