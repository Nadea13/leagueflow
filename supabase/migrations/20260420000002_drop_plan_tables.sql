-- Drop organizer_plans and manager_plans tables as they are no longer used
-- (Pricing is now managed directly in the codebase)

DROP TABLE IF EXISTS public.organizer_plans CASCADE;
DROP TABLE IF EXISTS public.manager_plans CASCADE;
