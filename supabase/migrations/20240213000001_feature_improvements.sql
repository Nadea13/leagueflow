-- ============================================================
-- LeagueFlow Feature Improvements Migration
-- Adds: global_players, venues, tournament_rules, 
--        penalty_shootouts, announcements, team_payments
-- Modifies: players (add global_player_id), matches (add venue_id, pitch_number)
-- ============================================================

-- 1. Global Players (Central Player Database)
CREATE TABLE IF NOT EXISTS global_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    photo_url TEXT,
    date_of_birth DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE global_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global players are viewable by authenticated users"
    ON global_players FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert global players"
    ON global_players FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own global players"
    ON global_players FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- 2. Add global_player_id to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS global_player_id UUID REFERENCES global_players(id) ON DELETE SET NULL;

-- 3. Venues
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    google_maps_url TEXT,
    capacity INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone"
    ON venues FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage venues"
    ON venues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Add venue_id and pitch_number to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS pitch_number INTEGER;

-- 5. Tournament Rules
CREATE TABLE IF NOT EXISTS tournament_rules (
    tournament_id UUID PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
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

ALTER TABLE tournament_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament rules are viewable by everyone"
    ON tournament_rules FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage tournament rules"
    ON tournament_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Penalty Shootouts
CREATE TABLE IF NOT EXISTS penalty_shootouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    round INTEGER NOT NULL,
    scored BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE penalty_shootouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Penalty shootouts are viewable by everyone"
    ON penalty_shootouts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage penalty shootouts"
    ON penalty_shootouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are viewable by everyone"
    ON announcements FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage announcements"
    ON announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Team Payments (Registration fee tracking per team)
CREATE TABLE IF NOT EXISTS team_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, team_id)
);

ALTER TABLE team_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team payments are viewable by authenticated users"
    ON team_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage team payments"
    ON team_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_players_name ON global_players (name);
CREATE INDEX IF NOT EXISTS idx_players_global_player_id ON players (global_player_id);
CREATE INDEX IF NOT EXISTS idx_venues_tournament_id ON venues (tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_venue_id ON matches (venue_id);
CREATE INDEX IF NOT EXISTS idx_penalty_shootouts_match_id ON penalty_shootouts (match_id);
CREATE INDEX IF NOT EXISTS idx_announcements_tournament_id ON announcements (tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_payments_tournament_id ON team_payments (tournament_id);
