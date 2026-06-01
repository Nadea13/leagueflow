-- -------------------------------------------------------------------------
-- 1. สร้างตารางเก็บรหัสตั๋วสำหรับเคลมโอนสิทธิ์สโมสร (Team Claim Tokens)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS team_claims CASCADE;

-- -------------------------------------------------------------------------
-- 2. ปรับปรุงสิทธิ์ RLS ของตารางสโมสร (teams) ใหม่ทั้งหมด
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;