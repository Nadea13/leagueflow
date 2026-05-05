-- Migration: Visual Bracket Builder Support
-- Adds canvas_data to tournaments and custom flow support to matches

-- 1. Add canvas_data to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS canvas_data JSONB DEFAULT '{}';

-- 2. Update matches to support custom flows
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS placeholder_a TEXT,
ADD COLUMN IF NOT EXISTS placeholder_b TEXT,
ADD COLUMN IF NOT EXISTS winner_to_node_id TEXT;

-- 3. Create groups table if it doesn't exist (requested by user for GroupNode mapping)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    team_count INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for groups
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'groups' AND policyname = 'Managers can manage their groups'
    ) THEN
        CREATE POLICY "Managers can manage their groups" ON public.groups
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM tournaments 
                WHERE tournaments.id = groups.tournament_id 
                AND tournaments.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'groups' AND policyname = 'Public can view groups'
    ) THEN
        CREATE POLICY "Public can view groups" ON public.groups
        FOR SELECT USING (true);
    END IF;
END $$;
