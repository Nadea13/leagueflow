-- safe_reset_data.sql
-- Use this to clear ALL DATA while keeping the table structures (Schema) intact.
-- WARNING: Only run this in Development or Staging environments.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers to avoid foreign key constraints during deletion
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE TRIGGER USER';
    END LOOP;

    -- Delete data from all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Re-enable triggers
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE TRIGGER USER';
    END LOOP;
END $$;
