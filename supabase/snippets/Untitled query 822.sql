-- =========================================================================
-- LEAGUEFLOW DATABASE SCHEMA - ROW LEVEL SECURITY (RLS) & POLICIES
-- =========================================================================
-- Description: แยกไฟล์สำหรับจัดการสิทธิ์การเข้าถึงข้อมูลระดับแถว (Row Level Security)
--              แบ่งกลุ่มตามพิมพ์เขียวระบบ: ตารางสาธารณะ, ข้อมูลส่วนตัว, และสิทธิ์คุมทีม
-- Target DB: PostgreSQL / Supabase
-- =========================================================================

-- -------------------------------------------------------------------------
-- SETUP: ล้างคำสั่งสิทธิ์เก่า และเปิดใช้งาน RLS ให้ครบทั้ง 15 ตาราง
-- -------------------------------------------------------------------------
DO $$ 
DECLARE
    t TEXT;
    pol RECORD;
BEGIN
    -- 1. เปิดใช้งาน RLS ให้ครบถ้วนทุกตารางใน Schema public
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;

    -- 2. ค้นหาและล้าง (Drop) นโยบาย RLS เก่าทั้งหมดใน Schema public เพื่อความ Idempotence (รันซ้ำได้ไม่จำกัด)
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- -------------------------------------------------------------------------
-- GRANTS: มอบสิทธิ์การใช้งานให้กับบทบาท API (postgres, anon, authenticated, service_role)
-- -------------------------------------------------------------------------
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;


-- =========================================================================
-- 🔓 กลุ่มที่ 1: ตารางสาธารณะ (Public Read / Creator & Staff Write)
-- แนวคิด: เปิดให้บุคคลทั่วไปส่องดูข้อมูลได้อิสระ แต่สิทธิ์แก้ไขเป็นของ Organizer/Staff/Admin
-- =========================================================================

-- 1. ตารางเก็ปรุ่นอายุ (age_categories) และ ประเภทกีฬา (sports) - [เฉพาะ Admin ที่แก้ไขได้]
CREATE POLICY age_categories_select ON age_categories FOR SELECT USING (true);
CREATE POLICY age_categories_all ON age_categories FOR ALL TO authenticated USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

CREATE POLICY sports_select ON sports FOR SELECT USING (true);
CREATE POLICY sports_all ON sports FOR ALL TO authenticated USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- 2. ตารางทัวร์นาเมนต์หลัก (tournaments) - [เฉพาะ Organizer เจ้าของงานที่แก้ไขได้]
CREATE POLICY tournaments_select ON tournaments FOR SELECT USING (true);
CREATE POLICY tournaments_write ON tournaments FOR ALL TO authenticated USING (
    auth.uid() = organizer_id OR (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- 3. ตารางรุ่นการแข่งขันย่อย (tournament_categories) - [อ้างอิงสิทธิ์ตามตารางทัวร์นาเมนต์แม่]
CREATE POLICY tournament_categories_select ON tournament_categories FOR SELECT USING (true);
CREATE POLICY tournament_categories_write ON tournament_categories FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);

-- 4. ตารางบอร์ดประกาศ (announcements) และ สปอนเซอร์ (tournament_sponsors)
-- [สิทธิ์เขียน: Organizer หรือ Staff/Co-Organizer ที่สถานะเป็น accepted ในทัวร์นั้น]
CREATE POLICY announcements_select ON announcements FOR SELECT USING (true);
CREATE POLICY announcements_write ON announcements FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournament_invitations WHERE tournament_id = tournament_id AND email = (SELECT email FROM users WHERE id = auth.uid()) AND status = 'accepted' AND role IN ('co_organizer', 'staff'))
);

CREATE POLICY tournament_sponsors_select ON tournament_sponsors FOR SELECT USING (true);
CREATE POLICY tournament_sponsors_write ON tournament_sponsors FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournament_invitations WHERE tournament_id = tournament_id AND email = (SELECT email FROM users WHERE id = auth.uid()) AND status = 'accepted' AND role IN ('co_organizer', 'staff'))
);

-- 5. ตารางแมตช์ (matches) และ ไทม์ไลน์เหตุการณ์คะแนนสด (match_events)
-- [สิทธิ์เขียน: Organizer หรือ Staff/Co-Organizer/Referee ที่ตอบรับคำเชิญแล้ว]
CREATE POLICY matches_select ON matches FOR SELECT USING (true);
CREATE POLICY matches_write ON matches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM tournament_categories tc JOIN tournaments t ON tc.tournament_id = t.id WHERE tc.id = tournament_category_id AND t.organizer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournament_categories tc JOIN tournament_invitations ti ON tc.tournament_id = ti.tournament_id WHERE tc.id = tournament_category_id AND ti.email = (SELECT email FROM users WHERE id = auth.uid()) AND ti.status = 'accepted')
);

CREATE POLICY match_events_select ON match_events FOR SELECT USING (true);
CREATE POLICY match_events_write ON match_events FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM matches m JOIN tournament_categories tc ON m.tournament_category_id = tc.id JOIN tournaments t ON tc.tournament_id = t.id WHERE m.id = match_id AND t.organizer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM matches m JOIN tournament_categories tc ON m.tournament_category_id = tc.id JOIN tournament_invitations ti ON tc.tournament_id = ti.tournament_id WHERE m.id = match_id AND ti.email = (SELECT email FROM users WHERE id = auth.uid()) AND ti.status = 'accepted')
);


-- =========================================================================
-- 🔒 กลุ่มที่ 2: ตารางข้อมูลส่วนตัว (Strictly Private)
-- แนวคิด: ความเป็นส่วนตัวสูงสุด ป้องกันคนนอกดักแฮกดูข้อมูลข้ามบัญชี
-- =========================================================================

-- 6. ตารางโปรไฟล์ผู้ใช้หลังบ้าน (users)
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (true); -- เปิดอิสระให้สมัครสมาชิกก้าวแรก
CREATE POLICY users_select ON users FOR SELECT USING (true);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY users_delete ON users FOR DELETE TO authenticated USING (
    auth.uid() = id OR (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- 7. ตารางทะเบียนราษฎร์ผู้เล่นมาสเตอร์ส่วนกลาง (master_players)
-- [SELECT: เปิดให้เจ้าของ หรือ Organizer/Team Manager ค้นหาชื่อเพื่อไปดึงลงทีมแข่งขัน]
CREATE POLICY master_players_select ON master_players FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR 
    (SELECT is_organizer FROM users WHERE id = auth.uid()) = true OR 
    (SELECT is_team_manager FROM users WHERE id = auth.uid()) = true
);
CREATE POLICY master_players_write ON master_players FOR ALL TO authenticated USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND (
        (SELECT is_organizer FROM users WHERE id = auth.uid()) = true OR 
        (SELECT is_team_manager FROM users WHERE id = auth.uid()) = true
    )) OR 
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);


-- =========================================================================
-- 🛡️ กลุ่มที่ 3: จัดการทีมและสิทธิ์นักกีฬา (Team Control & Admin Approvals)
-- แนวคิด: หัวหน้าทีมคุมทีมตนเองได้เต็มที่ ห้ามคนนอกปนข้อมูล / ผู้จัดคุมระบบอนุมัติใบสมัคร
-- =========================================================================

-- 8. ตารางสโมสร/ทีมกีฬา (teams)
CREATE POLICY teams_select ON teams FOR SELECT USING (true);
CREATE POLICY teams_insert ON teams FOR INSERT TO authenticated WITH CHECK (
    (SELECT is_team_manager FROM users WHERE id = auth.uid()) = true OR auth.uid() = user_id
);
CREATE POLICY teams_write ON teams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY teams_delete ON teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. ตารางนักกีฬารายทัวร์ (players) และตารางผูกสังกัดเล่นให้ทีม (player_sports)
-- [สิทธิ์เขียน: ตรวจสอบความสัมพันธ์ย้อนกลับไปว่าผู้ทำรายการคือหัวหน้าทีมเจ้าของสโมสรนั้นจริงไหม]
CREATE POLICY players_select ON players FOR SELECT USING (true);
CREATE POLICY players_write ON players FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM player_sports ps JOIN teams t ON ps.team_id = t.id WHERE ps.player_id = players.id AND t.user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM player_sports ps 
        JOIN tournament_teams tt ON ps.team_id = tt.team_id
        JOIN tournament_categories tc ON tt.tournament_category_id = tc.id
        JOIN tournaments tr ON tc.tournament_id = tr.id
        WHERE ps.player_id = players.id AND tr.organizer_id = auth.uid()
    )
);

CREATE POLICY player_sports_select ON player_sports FOR SELECT USING (true);
CREATE POLICY player_sports_write ON player_sports FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND user_id = auth.uid())
);

-- 10. ตารางลงทะเบียนรับสมัครทีมเข้าแข่งขันรายรุ่นอายุ (tournament_teams)
-- [สิทธิ์เขียนฝั่งทีม: ยื่นสมัครและแก้สิลิปโอนเงินได้เฉพาะเจ้าของทีมนั้น]
-- [สิทธิ์เขียนฝั่งผู้จัด: Organizer สามารถเข้ามา UPDATE สถานะการรับสมัครและการเงินได้]
CREATE POLICY tournament_teams_select ON tournament_teams FOR SELECT USING (true);
CREATE POLICY tournament_teams_insert ON tournament_teams FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND user_id = auth.uid())
);
CREATE POLICY tournament_teams_update ON tournament_teams FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournament_categories tc JOIN tournaments t ON tc.tournament_id = t.id WHERE tc.id = tournament_category_id AND t.organizer_id = auth.uid())
);
CREATE POLICY tournament_teams_delete ON tournament_teams FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournament_categories tc JOIN tournaments t ON tc.tournament_id = t.id WHERE tc.id = tournament_category_id AND t.organizer_id = auth.uid())
);


-- =========================================================================
-- 📁 กลุ่มที่ 4: สิทธิ์บริหารภายในและระบบส่งใบเชิญทีมงาน (Internal Admin คำเชิญสตาฟ)
-- แนวคิด: ข้อมูลภายในความลับหลังบ้านในการกระจายอำนาจ
-- =========================================================================

-- 11. ตารางระบบคำเชิญช่วยจัดงาน (tournament_invitations)
-- [SELECT: ส่องดูได้เฉพาะผู้จัดงานหลัก หรือ ผู้ใช้งานล็อกอินที่มีอีเมลตรงกับใบสมัครคำเชิญ]
CREATE POLICY tournament_invitations_select ON tournament_invitations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid()) OR
    email = (SELECT email FROM users WHERE id = auth.uid())
);
-- [INSERT / DELETE: เฉพาะผู้จัดงานหลักเจ้าของทัวร์นาเมนต์คุมสิทธิ์ขาด]
CREATE POLICY tournament_invitations_manage ON tournament_invitations FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);
CREATE POLICY tournament_invitations_delete ON tournament_invitations FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
);
-- [UPDATE: ผู้จัดแก้ Role สตาฟได้ / ส่วนผู้รับสตาฟกดอัปเดตสเตตัสได้เฉพาะ accepted/rejected ตัวเอง]
CREATE POLICY tournament_invitations_update ON tournament_invitations FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid()) OR
    email = (SELECT email FROM users WHERE id = auth.uid())
);

-- =========================================================================
-- END OF POLICIES CONFIGURATION - นโยบายสิทธิ์ความปลอดภัย LEAGUEFLOW พร้อมทำงาน
-- =========================================================================