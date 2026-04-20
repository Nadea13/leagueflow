-- Add 'organizer' to the allowed roles in the profiles table check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'organizer'::text]));
