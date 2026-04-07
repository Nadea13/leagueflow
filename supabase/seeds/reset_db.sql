-- LeagueFlow Database Reset Script
-- WARNING: This will DELETE ALL DATA and TABLES in the public schema.
-- Use this for testing and development only.

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- 2. Drop all custom functions in public schema (optional)
    FOR r IN (SELECT proname FROM pg_proc JOIN pg_namespace n ON n.oid = pg_proc.pronamespace WHERE n.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || ' CASCADE';
    END LOOP;

    -- 3. Drop all custom types in public schema (optional)
    FOR r IN (SELECT typname FROM pg_type JOIN pg_namespace n ON n.oid = pg_type.typnamespace WHERE n.nspname = 'public' AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;
