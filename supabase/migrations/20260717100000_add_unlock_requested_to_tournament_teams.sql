ALTER TABLE public.tournament_teams 
ADD COLUMN IF NOT EXISTS unlock_requested BOOLEAN DEFAULT false NOT NULL;
