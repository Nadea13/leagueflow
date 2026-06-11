-- Move registration_fee from tournaments to tournament_categories
ALTER TABLE public.tournament_categories ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT 0;

-- Copy existing registration fees
UPDATE public.tournament_categories tc
SET registration_fee = t.registration_fee
FROM public.tournaments t
WHERE tc.tournament_id = t.id;

-- Drop registration_fee column from tournaments
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS registration_fee;
