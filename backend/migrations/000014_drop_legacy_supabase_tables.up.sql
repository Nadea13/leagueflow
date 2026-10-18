-- Drop legacy Supabase tables and schemas that are no longer used
DROP TABLE IF EXISTS storage.objects CASCADE;
DROP TABLE IF EXISTS storage.buckets CASCADE;
DROP TABLE IF EXISTS auth.users CASCADE;

-- Drop legacy schemas if they exist
DROP SCHEMA IF EXISTS storage CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
