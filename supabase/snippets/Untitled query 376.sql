-- 1. สั่งเปิดสวิตช์ระบบความปลอดภัย Row Level Security ให้กับตาราง team_claims
ALTER TABLE team_claims ENABLE ROW LEVEL SECURITY;

-- 2. เคลียร์นโยบายเก่า (ถ้ามี)
DROP POLICY IF EXISTS team_claims_select_policy ON team_claims;
DROP POLICY IF EXISTS team_claims_all_policy ON team_claims;

-- 3. นโยบายที่ 1: อนุญาตให้ดึงข้อมูล (SELECT) ได้เฉพาะผู้จัดงานหลัก (Organizer), Admin หรือผู้ใช้ที่มีอีเมลตรงกันเท่านั้น
CREATE POLICY team_claims_select_policy ON team_claims 
FOR SELECT TO authenticated 
USING (
    email = (SELECT email FROM users WHERE id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM teams t 
        JOIN tournaments tr ON t.sport_id = tr.sport_id -- หรือเชื่อมตามโครงสร้างทัวร์หลักของคุณ
        WHERE t.id = team_id AND tr.organizer_id = auth.uid()
    ) OR
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- 4. นโยบายที่ 2: จำกัดสิทธิ์ควบคุมทั้งหมด (ALL) ให้กับฝั่ง Service Role (ระบบหลังบ้าน / Server-side) 
-- หรือ Admin แพลตฟอร์มเท่านั้น เพื่อป้องกันไม่ให้ผู้ใช้ทั่วไปแอบมายิง API เพื่อปลอมแปลง Token
CREATE POLICY team_claims_admin_all ON team_claims 
FOR ALL TO authenticated 
USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);