CREATE TABLE IF NOT EXISTS public.tournament_roster_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shirt_number VARCHAR(10),
    position VARCHAR(100),
    tel VARCHAR(20),
    photo_url TEXT,
    status public.registration_status_enum NOT NULL DEFAULT 'pending'::public.registration_status_enum,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tournament_roster_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow authenticated users to read submissions" ON public.tournament_roster_submissions;
CREATE POLICY "Allow authenticated users to read submissions"
    ON public.tournament_roster_submissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow team owners to manage their submissions" ON public.tournament_roster_submissions;
CREATE POLICY "Allow team owners to manage their submissions"
    ON public.tournament_roster_submissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tournament_teams tt
            JOIN public.teams t ON t.id = tt.team_id
            WHERE tt.id = tournament_roster_submissions.tournament_team_id
              AND t.user_id = auth.uid()
        )
    );

GRANT ALL ON TABLE public.tournament_roster_submissions TO anon;
GRANT ALL ON TABLE public.tournament_roster_submissions TO authenticated;
GRANT ALL ON TABLE public.tournament_roster_submissions TO service_role;

-- Create tournament_players table
CREATE TABLE IF NOT EXISTS public.tournament_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    master_player_id UUID NOT NULL REFERENCES public.master_players(id) ON DELETE CASCADE,
    shirt_number VARCHAR(10),
    position VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

-- Policies for tournament_players
DROP POLICY IF EXISTS "Allow authenticated users to read tournament players" ON public.tournament_players;
CREATE POLICY "Allow authenticated users to read tournament players"
    ON public.tournament_players FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service role or team owners to manage tournament players" ON public.tournament_players;
CREATE POLICY "Allow service role or team owners to manage tournament players"
    ON public.tournament_players FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tournament_teams tt
            JOIN public.teams t ON t.id = tt.team_id
            WHERE tt.id = tournament_players.tournament_team_id
              AND t.user_id = auth.uid()
        )
    );

-- Grants
GRANT ALL ON TABLE public.tournament_players TO anon;
GRANT ALL ON TABLE public.tournament_players TO authenticated;
GRANT ALL ON TABLE public.tournament_players TO service_role;

