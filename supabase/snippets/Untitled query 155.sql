-- -------------------------------------------------------------------------
-- 1. สร้างตารางเก็บรหัสตั๋วสำหรับเคลมโอนสิทธิ์สโมสร (Team Claim Tokens)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS team_claims CASCADE;

CREATE TABLE team_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    claim_code VARCHAR(50) NOT NULL UNIQUE, -- รหัสลับ เช่น LF-TEAM-XXXX
    is_used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- หมดอายุใน 7 วัน
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- เปิดใช้งาน RLS ให้ตารางใบเคลม
ALTER TABLE team_claims ENABLE ROW LEVEL SECURITY;

-- นโยบาย RLS ของตาราง team_claims: อนุญาตให้เฉพาะ Organizer เจ้าของทีมนั้นมา SELECT ดูโค้ดเพื่อเอาไปแจกได้
CREATE POLICY team_claims_select_policy ON team_claims
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = team_id AND t.user_id = auth.uid()
    ) OR
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);


-- -------------------------------------------------------------------------
-- 2. ปรับปรุงสิทธิ์ RLS ของตารางสโมสร (teams) ใหม่ทั้งหมด
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;

-- นโยบายที่ 1: ทุกคนในโลกเปิดดูรายชื่อทีมและโลโก้ได้ (Public Read)
CREATE POLICY teams_select_policy ON teams 
FOR SELECT USING (true);

-- นโยบายที่ 2: คนทั่วไปสร้างทีมตัวเองได้ ( user_id ต้องตรงกับคนล็อกอิน และห้ามแอบอ้างสิทธิ์ใคร )
CREATE POLICY teams_insert_policy ON teams 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- นโยบายที่ 3: คนที่มีสิทธิ์ UPDATE แก้ไขทีม ต้องเป็นเจ้าของตัวจริง (user_id) เท่านั้น!
-- (ปลอดภัย 100% ไม่มีช่องโหว่ให้คนนอกรุมกดแก้ข้อมูล เพราะเราตัดคำว่า user_id IS NULL ทิ้งเด็ดขาด)
CREATE POLICY teams_update_policy ON teams 
FOR UPDATE TO authenticated USING (
    auth.uid() = user_id OR
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);