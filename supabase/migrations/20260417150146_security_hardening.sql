-- 1. Fix Privilege Escalation (Profile Role)
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger AS $function$
BEGIN
  -- Check if the request comes from the Supabase API (JWT token is present)
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    NEW.role = OLD.role;
    NEW.is_organizer = OLD.is_organizer;
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 2. Fix Bug Reports Spam
DROP POLICY IF EXISTS "Anyone can create bug reports" ON public.bug_reports;
CREATE POLICY "Anyone can create bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK ( auth.role() = 'authenticated'::text );

-- 3. Fix Registrations Spam
DROP POLICY IF EXISTS "Public can submit registrations" ON public.registrations;
CREATE POLICY "Public can submit registrations"
ON public.registrations FOR INSERT
TO authenticated
WITH CHECK ( auth.role() = 'authenticated'::text );

-- 4. Fix Storage IDOR (update/delete any files)
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid() = owner );

DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( auth.uid() = owner );

-- 5. Fix Unauthenticated Storage Uploads
DROP POLICY IF EXISTS "Anyone can upload slips" ON storage.objects;
CREATE POLICY "Anyone can upload slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'slips'::text AND auth.role() = 'authenticated'::text );

DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'team-logos'::text AND auth.role() = 'authenticated'::text );
