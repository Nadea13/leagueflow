-- Allow service_role to bypass the profile role protection trigger
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger AS $function$
BEGIN
  -- Check if the request comes from the Supabase API
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    -- If the role is 'service_role', allow the update to proceed
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Otherwise, prevent role and is_organizer changes
    NEW.role = OLD.role;
    NEW.is_organizer = OLD.is_organizer;
  END IF;
  
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;
