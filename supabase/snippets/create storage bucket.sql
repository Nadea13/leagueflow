-- 1. Update/Redefine initialize_leagueflow_storage_blueprints to insert buckets
CREATE OR REPLACE FUNCTION "public"."initialize_leagueflow_storage_blueprints"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Insert buckets if not exists
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
      ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('team-logos', 'team-logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('player-photos', 'player-photos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('slips', 'slips', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('logos', 'logos', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('announcements', 'announcements', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('tournaments', 'tournaments', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('teams', 'teams', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']),
      ('players', 'players', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif'])
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    RAISE NOTICE 'LeagueFlow Storage buckets configuration initialized.';
END;
$$;

-- 2. Call the function to initialize them
SELECT "public"."initialize_leagueflow_storage_blueprints"();

-- 3. Set up RLS policies on storage.objects


DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'team-logos', 'player-photos', 'slips', 'logos', 'announcements', 'tournaments', 'teams', 'players'));

CREATE POLICY "Public Upload Access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'team-logos', 'player-photos', 'slips', 'logos', 'announcements', 'tournaments', 'teams', 'players'));

CREATE POLICY "Public Update Access" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('avatars', 'team-logos', 'player-photos', 'slips', 'logos', 'announcements', 'tournaments', 'teams', 'players'));

CREATE POLICY "Public Delete Access" ON storage.objects
  FOR DELETE USING (bucket_id IN ('avatars', 'team-logos', 'player-photos', 'slips', 'logos', 'announcements', 'tournaments', 'teams', 'players'));
