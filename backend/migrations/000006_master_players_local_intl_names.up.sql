-- Rename name columns from _th / _en to _local / _intl in master_players (Fail-safe)
DO $$ BEGIN
    ALTER TABLE master_players RENAME COLUMN first_name_th TO first_name_local;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE master_players RENAME COLUMN middle_name_th TO middle_name_local;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE master_players RENAME COLUMN last_name_th TO last_name_local;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE master_players RENAME COLUMN first_name_en TO first_name_intl;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE master_players RENAME COLUMN middle_name_en TO middle_name_intl;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE master_players RENAME COLUMN last_name_en TO last_name_intl;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;
