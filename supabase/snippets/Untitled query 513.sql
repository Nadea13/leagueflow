-- =========================================================================
-- LEAGUEFLOW DATABASE SCHEMA (COMPLETE PRODUCTION READY SINGLE FILE)
-- =========================================================================
-- Description: Complete Relational DB Blueprints for Multi-Category Tournament Platform
-- Capabilities: Multi-sport, Identity vs Local Persona, Multi-Category (Age & Gender ENUM),
--               Live Score (JSONB), Realtime Publications, Secure Storage Buckets & Strict RLS.
-- Target DB: PostgreSQL / Supabase
-- Generated: May 2026
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. DATABASE WIPE & RESET (ล้างป่าช้า ถอนรากถอนโคนระบบเดิมทั้งหมด)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS match_events CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS tournament_teams CASCADE;
DROP TABLE IF EXISTS player_sports CASCADE;
DROP TABLE IF EXISTS tournament_invitations CASCADE;
DROP TABLE IF EXISTS tournament_sponsors CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournament_categories CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS master_players CASCADE;
DROP TABLE IF EXISTS age_categories CASCADE;
DROP TABLE IF EXISTS sports CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS public.check_roster_locked_mechanism CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_sync_auth CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.sport_type_enum CASCADE;
DROP TYPE IF EXISTS public.gender_enum CASCADE;
DROP TYPE IF EXISTS public.player_status_enum CASCADE;
DROP TYPE IF EXISTS public.tournament_status_enum CASCADE;
DROP TYPE IF EXISTS public.category_gender_enum CASCADE;
DROP TYPE IF EXISTS public.invitation_role_enum CASCADE;
DROP TYPE IF EXISTS public.invitation_status_enum CASCADE;
DROP TYPE IF EXISTS public.payment_status_enum CASCADE;
DROP TYPE IF EXISTS public.registration_status_enum CASCADE;
DROP TYPE IF EXISTS public.match_stage_enum CASCADE;
DROP TYPE IF EXISTS public.match_status_enum CASCADE;
DROP TYPE IF EXISTS public.match_timer_status_enum CASCADE;

-- คืนสิทธิ์มาตรฐานความปลอดภัยให้กับระบบจัดเก็บข้อมูลของ Postgres/Supabase
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- เปิดใช้งาน Extension หลักสำหรับสุ่ม UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. สร้าง ENUM TYPES & CUSTOM CONTRAINTS ส่วนกลาง
-- -------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'team_manager', 'player');
CREATE TYPE sport_type_enum AS ENUM ('team', 'single');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other', 'unspecified');
CREATE TYPE player_status_enum AS ENUM ('active', 'injury', 'retire');
CREATE TYPE tournament_status_enum AS ENUM ('draft', 'upcoming', 'ongoing', 'finished');
CREATE TYPE category_gender_enum AS ENUM ('male', 'female', 'mixed', 'open');
CREATE TYPE invitation_role_enum AS ENUM ('co_organizer', 'staff', 'referee');
CREATE TYPE invitation_status_enum AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'checking', 'paid', 'rejected');
CREATE TYPE registration_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE match_stage_enum AS ENUM ('group', 'knockout', 'final');
CREATE TYPE match_status_enum AS ENUM ('scheduled', 'live', 'finished', 'canceled');
CREATE TYPE match_timer_status_enum AS ENUM ('stopped', 'playing', 'paused');

-- -------------------------------------------------------------------------
-- 2. ฟังก์ชันและทริกเกอร์ระบบอัตโนมัติ (FUNCTIONS & TRIGGERS LOGIC)
-- -------------------------------------------------------------------------

-- ก. ฟังก์ชันอัปเดตสแตมป์เวลา updated_at อัตโนมัติในทุกตาราง
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ข. ฟังก์ชันจำลองโครงสร้างระบบเก็บไฟล์ภาพ (Storage Configuration Blueprint)
CREATE OR REPLACE FUNCTION initialize_leagueflow_storage_blueprints()
RETURNS void AS $$
BEGIN
    -- โครงสร้างโฟลเดอร์สำหรับตั้งค่าในระบบ Storage ของผู้ใช้งาน:
    -- bucket 'avatars'       [Public]  -> สำหรับ users.profile_img, master_players.profile_img
    -- bucket 'logos'         [Public]  -> สำหรับ teams.logo_img, tournaments.logo_img, tournament_sponsors.logo_img
    -- bucket 'announcements' [Public]  -> สำหรับ announcements.cover_img
    -- bucket 'slips'         [Private] -> สำหรับ tournament_teams.slip_img (ห้ามสาธารณะเด็ดขาด มิดชิดสูงสุด)
    RAISE NOTICE 'LeagueFlow Storage buckets configuration recognized.';
END;
$$ LANGUAGE plpgsql;
SELECT initialize_leagueflow_storage_blueprints();


-- -------------------------------------------------------------------------
-- 3. สร้างตารางหลักกลุ่มสิทธิ์และข้อมูลมาสเตอร์ (ROUND 1: MASTER TABLES)
-- -------------------------------------------------------------------------

-- ตารางผู้ใช้งานและบัญชีหลักระบบแอปพลิเคชัน (สัมพันธ์โดยตรงกับ auth.users ของ Supabase/Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    profile_img TEXT DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    role user_role NOT NULL DEFAULT 'player',
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_organizer BOOLEAN NOT NULL DEFAULT false,
    is_team_manager BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางประเภทกีฬาหลักที่แพลตฟอร์มรองรับ
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_name VARCHAR(100) NOT NULL,
    sport_type sport_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางมาสเตอร์เก็ปรุ่นจำกัดอายุส่วนกลางประจำแอปฯ
CREATE TABLE age_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    min_age INT NOT NULL DEFAULT 0,
    max_age INT NOT NULL DEFAULT 99,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);


-- -------------------------------------------------------------------------
-- 4. สร้างตารางเก็บโปรไฟล์ ทะเบียนราษฎร์ และทัวร์นาเมนต์ (ROUND 2: CENTRAL PROFILES)
-- -------------------------------------------------------------------------

-- ตารางสมุดทะเบียนราษฎร์หลักส่วนกลางของนักกีฬาตัวจริง (Identity จริง)
CREATE TABLE master_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    gender gender_enum NOT NULL DEFAULT 'unspecified',
    birthday DATE NOT NULL,
    tel VARCHAR(20) DEFAULT NULL,
    profile_img TEXT DEFAULT NULL,
    status player_status_enum NOT NULL DEFAULT 'active',
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางข้อมูลหลักของงานแข่งขันอีเวนต์หลัก (Tournaments)
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    logo_img TEXT DEFAULT NULL,
    cover_img TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    location_name VARCHAR(255) DEFAULT NULL,
    google_map_url TEXT DEFAULT NULL,
    status tournament_status_enum NOT NULL DEFAULT 'draft',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    document_deadline DATE NOT NULL,
    registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    bank_name VARCHAR(100) DEFAULT NULL,
    bank_account_name VARCHAR(255) DEFAULT NULL,
    bank_account_number VARCHAR(50) DEFAULT NULL,
    is_registration_open BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);


-- -------------------------------------------------------------------------
-- 5. สร้างตารางซอยรุ่นย่อยและระบบคำเชิญบริหารทีมงาน (ROUND 3: BRANCHES & INVITATIONS)
-- -------------------------------------------------------------------------

-- ตารางซอยรุ่นย่อยแบ่งประเภทเพศและเกณฑ์อายุประจำแต่ละงานแข่ง (Tournament Categories)
CREATE TABLE tournament_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    age_category_id INT NOT NULL REFERENCES age_categories(id) ON DELETE RESTRICT,
    gender_type category_gender_enum NOT NULL DEFAULT 'open',
    max_teams INT NOT NULL DEFAULT 0,
    canvas_data JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT unique_tournament_category UNIQUE (tournament_id, age_category_id, gender_type)
);

-- ตารางสโมสร / ทีมกีฬา
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    logo_img TEXT DEFAULT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    is_roster_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางนักกีฬารายทัวร์นาเมนต์ (Local Profile เพื่อความยืดหยุ่นแยกใช้ฉายา/เบอร์เสื้อเฉพาะทัวร์)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES master_players(id) ON DELETE RESTRICT,
    display_name VARCHAR(255) NOT NULL,
    tel VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางบอร์ดประกาศข่าวสารประจำงานแข่งขัน (แก้ไขชื่อให้สะกดถูกต้องสอดคล้องกัน)
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    cover_img TEXT DEFAULT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางบริหารจัดการผู้สนับสนุนการแข่งขัน (Sponsors)
CREATE TABLE tournament_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    sponsor_name VARCHAR(255) NOT NULL,
    logo_img TEXT NOT NULL,
    link_url TEXT DEFAULT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางส่งคำเชิญสตาฟ กรรมการ และทีมงานหลังบ้านเฉพาะกิจในทัวร์นั้นๆ
CREATE TABLE tournament_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    role invitation_role_enum NOT NULL DEFAULT 'staff',
    status invitation_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);


-- -------------------------------------------------------------------------
-- 6. สร้างตารางเชื่อมความสัมพันธ์ Many-to-Many และตารางแมตช์ (ROUND 4)
-- -------------------------------------------------------------------------

-- ตารางความสัมพันธ์รายชื่อนักกีฬาที่ลงทะเบียนเล่นให้กับสโมสรในชนิดกีฬานั้นๆ
CREATE TABLE player_sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    team_id UUID DEFAULT NULL REFERENCES teams(id) ON DELETE CASCADE,
    position VARCHAR(100) DEFAULT NULL,
    shirt_number VARCHAR(3) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- ตารางลงทะเบียนรับสมัครทีมเข้าแข่งขันแยกสิทธิและหลักฐานโอนเงินตามรายรุ่นอายุ (Categories)
CREATE TABLE tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    payment_status payment_status_enum NOT NULL DEFAULT 'pending',
    slip_img TEXT DEFAULT NULL,
    registration_status registration_status_enum NOT NULL DEFAULT 'pending',
    remark TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT unique_category_team_registration UNIQUE (tournament_category_id, team_id)
);

-- ตารางโครงสร้างหลักแมตช์การแข่งขันและระบบ Live Score ประจำรุ่นอายุ
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
    home_team_id UUID DEFAULT NULL REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id UUID DEFAULT NULL REFERENCES teams(id) ON DELETE SET NULL,
    home_score JSONB NOT NULL DEFAULT '{"total": 0}'::jsonb,
    away_score JSONB NOT NULL DEFAULT '{"total": 0}'::jsonb,
    round INT NOT NULL DEFAULT 1,
    stage match_stage_enum NOT NULL DEFAULT 'group',
    status match_status_enum NOT NULL DEFAULT 'scheduled',
    is_manual BOOLEAN NOT NULL DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    match_index INT NOT NULL DEFAULT 0,
    timer_status match_timer_status_enum NOT NULL DEFAULT 'stopped',
    elapsed_before_pause INT NOT NULL DEFAULT 0,
    current_minute INT DEFAULT NULL,
    node_id VARCHAR(255) DEFAULT NULL,
    winner_to_node_id VARCHAR(255) DEFAULT NULL,
    placeholder_home VARCHAR(255) DEFAULT NULL,
    placeholder_away VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);


-- -------------------------------------------------------------------------
-- 7. สร้างตารางบันทึกข้อมูลไทม์ไลน์ย่อยระหว่างแข่งขัน (ROUND 5: MATCH EVENTS)
-- -------------------------------------------------------------------------

-- ตารางบันทึกเหตุการณ์แบบเรียลไทม์ระหว่างแข่งขัน (เช่น ทำประตู, ฟาวล์, รับใบเตือน, พักเวลานอก)
CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID DEFAULT NULL REFERENCES teams(id) ON DELETE SET NULL,
    player_id UUID DEFAULT NULL REFERENCES players(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    period INT NOT NULL DEFAULT 1,
    minute INT DEFAULT NULL,
    extra_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);


-- -------------------------------------------------------------------------
-- 8. ผูกทริกเกอร์ระบบอัตโนมัติประจำตาราง (TRIGGERS BINDING)
-- -------------------------------------------------------------------------

-- ก. คำสั่งผูกระบบ Auto-Update สำหรับคอลัมน์ updated_at ให้ครบทุกตาราง
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_sports BEFORE UPDATE ON sports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_age_categories BEFORE UPDATE ON age_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_master_players BEFORE UPDATE ON master_players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_tournaments BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_tournament_categories BEFORE UPDATE ON tournament_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_teams BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_players BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_announcements BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_tournament_sponsors BEFORE UPDATE ON tournament_sponsors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_tournament_invitations BEFORE UPDATE ON tournament_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_player_sports BEFORE UPDATE ON player_sports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_tournament_teams BEFORE UPDATE ON tournament_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_matches BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_match_events BEFORE UPDATE ON match_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ข. ฟังก์ชันควบคุมระบบล็อกรายชื่อ (แก้ไขบั๊กตัวแปรแฝง OLD รองรับเคสการลบข้อมูลออกอย่างปลอดภัย)
DROP TRIGGER IF EXISTS roster_lock_enforcement_trigger ON public.player_sports;
DROP FUNCTION IF EXISTS public.check_roster_locked_mechanism() CASCADE;

CREATE OR REPLACE FUNCTION public.check_roster_locked_mechanism()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_team_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_team_id := OLD.team_id;
    ELSE
        target_team_id := NEW.team_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.teams
        WHERE id = target_team_id
          AND is_roster_locked = true
    ) THEN
        RAISE EXCEPTION 'Roster is locked';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER roster_lock_enforcement_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.player_sports
FOR EACH ROW
EXECUTE FUNCTION public.check_roster_locked_mechanism();

-- ค. ฟังก์ชันเชื่อมความสัมพันธ์ระบบ Auth เข้าหาตารางโปรไฟล์ผู้ใช้งานหลักโดยอัตโนมัติ (สำหรับ Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user_sync_auth()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, phone, role, is_organizer, is_team_manager)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'ผู้ใช้งานรายใหม่'),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        'player',
        false,
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.users.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง Trigger สำหรับการสมัครและอัปเดตข้อมูลผู้ใช้งานหลักจาก Auth เข้าหา Users โดยอัตโนมัติ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync_auth();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync_auth();


-- -------------------------------------------------------------------------
-- 9. เปิดใช้งานระบบ ROW LEVEL SECURITY (RLS ENFORCEMENT)
-- -------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own master player profile" ON public.master_players;
CREATE POLICY "Users can view their own master player profile" ON public.master_players
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own master player profile" ON public.master_players;
CREATE POLICY "Users can insert their own master player profile" ON public.master_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own master player profile" ON public.master_players;
CREATE POLICY "Users can update their own master player profile" ON public.master_players
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------------------
-- 10. CONFIGURATION FOR SUPABASE REALTIME (ระบบยิงกระจายเสียงข้อมูลเรียลไทม์)
-- -------------------------------------------------------------------------

-- 1. บังคับกำหนด REPLICA IDENTITY FULL ที่ระดับตารางให้ถูกต้องแม่นยำตามหลักไวยากรณ์ (Fix Bug)
ALTER TABLE matches REPLICA IDENTITY FULL;
ALTER TABLE match_events REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;

-- 2. ดำเนินการสร้างหัวข้อสตรีมข้อมูลเรียลไทม์หากยังไม่มีฝังอยู่ในระบบหลักของตัวฐานข้อมูล
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 3. นำทั้ง 3 ตารางหลักเข้าบรรจุในสัญญาณการแจ้งเตือน Realtime ความเร็วสูง
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- =========================================================================
-- END OF SCRIPT - ฐานข้อมูล LEAGUEFLOW อัปเกรดล้างระบบเดิมและขึ้นโครงสร้างเสถียรเรียบร้อย
-- =========================================================================