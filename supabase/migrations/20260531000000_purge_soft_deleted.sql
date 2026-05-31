-- Create the purge function
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    delete_interval INTERVAL;
BEGIN
    -- Loop through all tables in the public schema that have a column named 'deleted_at'
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'deleted_at'
    LOOP
        -- Determine the retention interval based on the table name
        -- 30 days for users, profiles, tournaments, teams, and master_players.
        -- 14 days for any other table with a deleted_at column.
        IF r.table_name IN ('users', 'profiles', 'tournaments', 'teams', 'master_players') THEN
            delete_interval := INTERVAL '30 days';
        ELSE
            delete_interval := INTERVAL '14 days';
        END IF;

        -- Execute dynamic SQL to delete expired rows
        EXECUTE format(
            'DELETE FROM public.%I WHERE deleted_at < now() - %L',
            r.table_name,
            delete_interval
        );
    END LOOP;
END;
$$;

-- Schedule the purge function using pg_cron to run every day at midnight
-- Note: pg_cron is enabled by default in Supabase under the pg_catalog/extensions schema.
SELECT cron.schedule(
    'purge-soft-deleted-job',
    '0 0 * * *',
    'SELECT public.purge_soft_deleted_records()'
);
