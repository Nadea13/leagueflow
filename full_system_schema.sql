-- LeagueFlow Comprehensive Database Schema
-- Idempotent Version (Safe to run multiple times)

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (User Data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_organizer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Ensure profiles table has correct columns (Migration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT false;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper function to check if user is a tournament manager (owner or editor/admin member)
DROP FUNCTION IF EXISTS public.is_tournament_manager(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.is_tournament_manager(tourney_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tournaments WHERE id = tourney_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.tournament_members 
        WHERE tournament_id = tourney_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'editor')
        AND status = 'accepted'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Manager Plans (Team Manager Subscription Plans)
CREATE TABLE IF NOT EXISTS public.manager_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT[], -- Array of features
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    discounted_price NUMERIC(10,2),
    duration TEXT, -- 'monthly', 'yearly', 'lifetime'
    max_teams INTEGER DEFAULT 0, -- 0 for unlimited
    max_players_per_team INTEGER DEFAULT 0, -- 0 for unlimited
    support_level TEXT DEFAULT 'Standard',
    recommended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Organizer Plans (Tournament Organizer Subscription Plans)
CREATE TABLE IF NOT EXISTS public.organizer_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT[], -- Array of features
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    discounted_price NUMERIC(10,2),
    duration TEXT, -- 'monthly', 'yearly', 'lifetime'
    max_tournaments INTEGER DEFAULT 0, -- 0 for unlimited
    max_teams_per_tournament INTEGER DEFAULT 0, -- 0 for unlimited
    format_support TEXT DEFAULT 'Basic',
    invite_enabled BOOLEAN DEFAULT FALSE,
    register_enabled BOOLEAN DEFAULT FALSE,
    stats_support TEXT DEFAULT 'Basic',
    support_level TEXT DEFAULT 'Standard',
    recommended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Manager Plans
INSERT INTO public.manager_plans (name, description, price, discounted_price, duration, max_teams, max_players_per_team, support_level, recommended)
VALUES 
('Manager Starter', ARRAY['1 Team limit', 'Basic Player Management', 'Community Support'], 0, NULL, 'lifetime', 1, 14, 'Community', FALSE),
('Manager Pro', ARRAY['Unlimited team creation', 'Manage multiple squads', 'Advanced Team Management', 'Standard Support'], 190, NULL, 'monthly', 0, 0, 'Standard', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Seed Default Organizer Plans
INSERT INTO public.organizer_plans (name, description, price, discounted_price, duration, max_tournaments, max_teams_per_tournament, format_support, invite_enabled, register_enabled, stats_support, support_level, recommended)
VALUES 
('Single Tournament', ARRAY['Single tournament use', 'All tournament formats', 'Advanced Stats & Goals', 'Standard Support', 'Custom Branding'], 990, 590, 'lifetime', 1, 0, 'All', TRUE, TRUE, 'Advanced', 'Standard', FALSE),
('Organizer Monthly Pro', ARRAY['Unlimited tournaments', 'All pro features included', 'Priority 24/7 Support', 'Cancel anytime'], 1290, 890, 'monthly', 0, 0, 'All', TRUE, TRUE, 'Advanced', 'Priority', FALSE),
('Organizer Yearly Pro', ARRAY['Save 2 months', 'Unlimited everything', 'VIP Priority Support', 'Advance Analytics'], 12900, 8900, 'yearly', 0, 0, 'All', TRUE, TRUE, 'Advanced', 'Priority', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 4. Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'league', -- league, knockout, group_knockout
    status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed
    start_date DATE,
    end_date DATE,
    number_of_pitches INTEGER DEFAULT 1,
    max_teams INTEGER DEFAULT 8,
    advancing_teams INTEGER,
    is_registration_open BOOLEAN DEFAULT FALSE,
    registration_fee NUMERIC DEFAULT 0,
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    plan TEXT DEFAULT 'free', -- free, tournament, monthly, yearly
    payment_status TEXT,
    payment_id TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration: Ensure tournaments has all required columns (Safe for existing DBs)
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 8;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS advancing_teams INTEGER;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS document_deadline TIMESTAMPTZ;

-- 4. Tournament Members (Collaborators)
CREATE TABLE IF NOT EXISTS public.tournament_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'viewer', -- admin, editor, viewer
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, email),
    UNIQUE(tournament_id, user_id)
);

-- 6. Global Teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_roster_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tournament Participation (Formerly Teams)
CREATE TABLE IF NOT EXISTS public.tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Link to global team
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Owner/Manager
    name TEXT NOT NULL, -- Snapshot name
    description TEXT,
    group_name TEXT,
    logo_url TEXT, -- Snapshot logo
    is_roster_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure old references to teams are handled (This is mostly for the schema doc)
-- In a live DB, we'd run: ALTER TABLE teams RENAME TO tournament_teams;

-- 6. Global Players
CREATE TABLE IF NOT EXISTS public.global_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    photo_url TEXT,
    id_card_url TEXT,
    date_of_birth DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Players (Tournament-specific squad membership OR global master roster)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.tournament_teams(id) ON DELETE CASCADE, -- Nullable for global master roster
    global_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, -- Link to global master team
    name TEXT NOT NULL,
    number INTEGER,
    position TEXT,
    global_player_id UUID REFERENCES public.global_players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT players_team_context_check CHECK (
        (team_id IS NOT NULL AND global_team_id IS NULL) OR 
        (team_id IS NULL AND global_team_id IS NOT NULL)
    )
);

-- Migration: Add global_team_id to existing players table if it doesn't exist
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS global_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.players ALTER COLUMN team_id DROP NOT NULL;

-- 8. Venues
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    google_maps_url TEXT,
    capacity INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Matches
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    round INTEGER NOT NULL DEFAULT 1,
    stage TEXT NOT NULL DEFAULT 'league', -- league, group, round_of_64, etc.
    winner_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
    is_manual BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, live, finished
    match_date DATE,
    match_time TIME,
    venue TEXT, -- New column for display-only venue names (e.g. "Pitch 1")
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    penalty_home_score INTEGER DEFAULT 0,
    penalty_away_score INTEGER DEFAULT 0,
    pitch_number INTEGER,
    match_index INTEGER,
    timer_status TEXT DEFAULT 'stopped', -- playing, paused, stopped
    elapsed_before_pause INTEGER DEFAULT 0,
    current_minute INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Match Events
CREATE TABLE IF NOT EXISTS public.match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- goal, yellow_card, red_card, etc.
    minute INTEGER NOT NULL,
    extra_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Goals (Can be a table or view, but referenced as table in code)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    goal_time TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Registrations (Public signup)
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    logo_url TEXT,
    slip_url TEXT,
    payment_status TEXT DEFAULT 'PENDING',
    trans_ref TEXT,
    existing_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    tournament_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL, -- Link to created participation
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
 );

-- 13. Team Payments (Finance tracking)
CREATE TABLE IF NOT EXISTS public.team_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, team_id)
);

-- 14. Payments (Global billing)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    payment_method TEXT NOT NULL,
    plan TEXT NOT NULL,
    provider_id TEXT, 
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Tournament Rules
CREATE TABLE IF NOT EXISTS public.tournament_rules (
    tournament_id UUID PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
    half_duration INTEGER DEFAULT 45,
    extra_time_duration INTEGER DEFAULT 15,
    max_squad_size INTEGER,
    min_squad_size INTEGER,
    max_substitutions INTEGER DEFAULT 5,
    yellow_card_ban_threshold INTEGER DEFAULT 3,
    red_card_ban_matches INTEGER DEFAULT 1,
    points_for_win INTEGER DEFAULT 3,
    points_for_draw INTEGER DEFAULT 1,
    points_for_loss INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Penalty Shootouts
CREATE TABLE IF NOT EXISTS public.penalty_shootouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    round INTEGER NOT NULL,
    scored BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- invite, payment, system
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE RLS ON ALL TABLES
DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(row.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- POLICIES (Example logic, adjust as needed)
-- Instead of individual policy logic, we'll use DROP POLICY IF EXISTS for safety

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Tournaments
DROP POLICY IF EXISTS "Tournaments viewable by everyone" ON tournaments;
CREATE POLICY "Tournaments viewable by everyone" ON tournaments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can manage tournaments" ON tournaments;
CREATE POLICY "Owners can manage tournaments" ON tournaments FOR ALL USING (auth.uid() = user_id);

-- Manager Plans
DROP POLICY IF EXISTS "Manager plans viewable by everyone" ON manager_plans;
CREATE POLICY "Manager plans viewable by everyone" ON manager_plans FOR SELECT USING (true);

-- Organizer Plans
DROP POLICY IF EXISTS "Organizer plans viewable by everyone" ON organizer_plans;
CREATE POLICY "Organizer plans viewable by everyone" ON organizer_plans FOR SELECT USING (true);

-- Matches
DROP POLICY IF EXISTS "Viewable by everyone" ON matches;
CREATE POLICY "Viewable by everyone" ON matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage matches" ON matches;
CREATE POLICY "Managers can manage matches" ON matches FOR ALL USING (is_tournament_manager(tournament_id));

-- Global Teams
DROP POLICY IF EXISTS "Viewable by everyone" ON teams;
CREATE POLICY "Viewable by everyone" ON teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own global teams" ON teams;
CREATE POLICY "Users can manage own global teams" ON teams FOR ALL USING (auth.uid() = user_id);

-- Tournament Teams (Participation)
DROP POLICY IF EXISTS "Viewable by everyone" ON tournament_teams;
CREATE POLICY "Viewable by everyone" ON tournament_teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage tournament teams" ON tournament_teams;
CREATE POLICY "Managers can manage tournament teams" ON tournament_teams FOR ALL USING (
    is_tournament_manager(tournament_id) OR 
    auth.uid() = user_id -- Allow team owners/managers
);

-- Players
DROP POLICY IF EXISTS "Viewable by everyone" ON players;
CREATE POLICY "Viewable by everyone" ON players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage players" ON players;
CREATE POLICY "Managers can manage players" ON players FOR ALL USING (
    (global_team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM teams WHERE id = global_team_id AND user_id = auth.uid()
    )) OR
    (team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM tournament_teams 
        WHERE id = team_id AND (is_tournament_manager(tournament_id) OR auth.uid() = user_id)
    ))
);

-- Venues
DROP POLICY IF EXISTS "Viewable by everyone" ON venues;
CREATE POLICY "Viewable by everyone" ON venues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage venues" ON venues;
CREATE POLICY "Managers can manage venues" ON venues FOR ALL USING (is_tournament_manager(tournament_id));

-- Match Events
DROP POLICY IF EXISTS "Viewable by everyone" ON match_events;
CREATE POLICY "Viewable by everyone" ON match_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage match events" ON match_events;
CREATE POLICY "Managers can manage match events" ON match_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id AND is_tournament_manager(tournament_id)
    )
);

-- Penalty Shootouts
DROP POLICY IF EXISTS "Viewable by everyone" ON penalty_shootouts;
CREATE POLICY "Viewable by everyone" ON penalty_shootouts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage penalty shootouts" ON penalty_shootouts;
CREATE POLICY "Managers can manage penalty shootouts" ON penalty_shootouts FOR ALL USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id AND is_tournament_manager(tournament_id)
    )
);

-- Goals
DROP POLICY IF EXISTS "Goals viewable by everyone" ON goals;
CREATE POLICY "Goals viewable by everyone" ON goals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage goals" ON goals;
CREATE POLICY "Managers can manage goals" ON goals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id AND is_tournament_manager(tournament_id)
    )
);

-- Announcements
DROP POLICY IF EXISTS "Announcements viewable by everyone" ON announcements;
CREATE POLICY "Announcements viewable by everyone" ON announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Managers can manage announcements" ON announcements;
CREATE POLICY "Managers can manage announcements" ON announcements FOR ALL USING (is_tournament_manager(tournament_id));

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Global Players
DROP POLICY IF EXISTS "Global players viewable by everyone" ON global_players;
CREATE POLICY "Global players viewable by everyone" ON global_players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own global players" ON global_players;
CREATE POLICY "Users can manage own global players" ON global_players FOR ALL USING (auth.uid() = created_by);

-- Registrations
DROP POLICY IF EXISTS "Tournament owners can view registrations" ON registrations;
CREATE POLICY "Tournament owners can view registrations" ON registrations FOR SELECT USING (is_tournament_manager(tournament_id));
DROP POLICY IF EXISTS "Public can submit registrations" ON registrations;
CREATE POLICY "Public can submit registrations" ON registrations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Managers can update registrations" ON registrations;
CREATE POLICY "Managers can update registrations" ON registrations FOR UPDATE USING (is_tournament_manager(tournament_id));
DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
CREATE POLICY "Users can view own registrations" ON registrations FOR SELECT USING (auth.uid() = user_id);

-- Team Payments
DROP POLICY IF EXISTS "Authenticated users can see team payments" ON team_payments;
CREATE POLICY "Authenticated users can see team payments" ON team_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers can handle team payments" ON team_payments;
CREATE POLICY "Managers can handle team payments" ON team_payments FOR ALL USING (is_tournament_manager(tournament_id));

-- Payments (Highly Restricted)
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public' AND table_name NOT IN ('plans')) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_trigger ON public.%I', t);
        EXECUTE format('CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t);
    END LOOP;
END $$;

-- 20. Indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id ON registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_payments_tournament_id ON team_payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
-- Match migration script to ensure all columns exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='venue') THEN
        ALTER TABLE public.matches ADD COLUMN venue TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='penalty_away_score') THEN
        ALTER TABLE public.matches ADD COLUMN penalty_away_score INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='logo_url') THEN
        ALTER TABLE public.registrations ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='existing_team_id') THEN
        ALTER TABLE public.registrations ADD COLUMN existing_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='tournament_team_id') THEN
        ALTER TABLE public.registrations ADD COLUMN tournament_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='description') THEN
        ALTER TABLE public.registrations ADD COLUMN description TEXT;
    END IF;

    -- Players Migration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='global_team_id') THEN
        ALTER TABLE public.players ADD COLUMN global_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
    END IF;
    ALTER TABLE public.players ALTER COLUMN team_id DROP NOT NULL;

    -- Registration RLS Policies
    ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.team_payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can submit registrations" ON registrations;
    CREATE POLICY "Public can submit registrations" ON registrations FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Tournament owners can view registrations" ON registrations;
    CREATE POLICY "Tournament owners can view registrations" ON registrations FOR SELECT USING (is_tournament_manager(tournament_id));
    DROP POLICY IF EXISTS "Managers can update registrations" ON registrations;
    CREATE POLICY "Managers can update registrations" ON registrations FOR UPDATE USING (is_tournament_manager(tournament_id));


    -- Tournament Members RLS Policies
    ALTER TABLE public.tournament_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Managers can view tournament members" ON tournament_members;
    CREATE POLICY "Managers can view tournament members" ON tournament_members FOR SELECT USING (
        is_tournament_manager(tournament_id) 
        OR auth.uid() = user_id 
        OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    );
    DROP POLICY IF EXISTS "Managers can insert tournament members" ON tournament_members;
    CREATE POLICY "Managers can insert tournament members" ON tournament_members FOR INSERT WITH CHECK (
        is_tournament_manager(tournament_id)
    );
    DROP POLICY IF EXISTS "Managers can update tournament members" ON tournament_members;
    CREATE POLICY "Managers can update tournament members" ON tournament_members FOR UPDATE USING (
        is_tournament_manager(tournament_id) 
        OR auth.uid() = user_id
        OR (status = 'pending' AND email = (SELECT email FROM profiles WHERE id = auth.uid()))
    );
    DROP POLICY IF EXISTS "Managers can delete tournament members" ON tournament_members;
    CREATE POLICY "Managers can delete tournament members" ON tournament_members FOR DELETE USING (
        is_tournament_manager(tournament_id) 
        OR auth.uid() = user_id
        OR (status = 'pending' AND email = (SELECT email FROM profiles WHERE id = auth.uid()))
    );
END $$;

-- 21. Bug Reports
CREATE TABLE IF NOT EXISTS public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view bug reports" ON public.bug_reports;
CREATE POLICY "Admins can view bug reports" ON public.bug_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
CREATE POLICY "Users can view own bug reports" ON public.bug_reports
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create bug reports" ON public.bug_reports;
CREATE POLICY "Users can create bug reports" ON public.bug_reports
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can create bug reports" ON public.bug_reports;
CREATE POLICY "Anyone can create bug reports" ON public.bug_reports
    FOR INSERT TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update bug reports" ON public.bug_reports;
CREATE POLICY "Admins can update bug reports" ON public.bug_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (true);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);

-- Auth Audit Logs RPC
DROP FUNCTION IF EXISTS public.admin_get_auth_logs();

CREATE OR REPLACE FUNCTION admin_get_auth_logs()
RETURNS TABLE (
    id UUID,
    payload JSON,
    created_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Only allow admins
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.payload,
        a.created_at,
        a.ip_address::VARCHAR
    FROM auth.audit_log_entries a
    ORDER BY a.created_at DESC;
END;
$$;

-- RLS for Tournament Rules
ALTER TABLE public.tournament_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers can manage tournament rules" ON public.tournament_rules;
CREATE POLICY "Managers can manage tournament rules" ON public.tournament_rules FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.tournaments 
        WHERE tournaments.id = tournament_rules.tournament_id AND tournaments.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.tournament_members
        WHERE tournament_members.tournament_id = tournament_rules.tournament_id 
        AND tournament_members.user_id = auth.uid() 
        AND tournament_members.role IN ('admin', 'editor')
        AND tournament_members.status = 'accepted'
    )
);

-- ============================================================
-- Supabase Realtime: Enable for matches and match_events
-- ============================================================
-- Supabase Realtime: Enable for matches and match_events
-- ============================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Ensure matches table foreign keys point to tournament_teams (Migration for existing DBs)
DO $$
BEGIN
    ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_home_team_id_fkey;
    ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_away_team_id_fkey;
    ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_winner_id_fkey;

    ALTER TABLE public.matches 
    ADD CONSTRAINT matches_home_team_id_fkey 
    FOREIGN KEY (home_team_id) 
    REFERENCES public.tournament_teams(id) ON DELETE SET NULL;

    ALTER TABLE public.matches 
    ADD CONSTRAINT matches_away_team_id_fkey 
    FOREIGN KEY (away_team_id) 
    REFERENCES public.tournament_teams(id) ON DELETE SET NULL;

    ALTER TABLE public.matches 
    ADD CONSTRAINT matches_winner_id_fkey 
    FOREIGN KEY (winner_id) 
    REFERENCES public.tournament_teams(id) ON DELETE SET NULL;
END $$;
