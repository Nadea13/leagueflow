-- 1. สร้าง Storage Buckets ที่จำเป็นทั้งหมด
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('teams', 'teams', true),
  ('team-logos', 'team-logos', true),
  ('slips', 'slips', true),
  ('player-photos', 'player-photos', true),
  ('player-docs', 'player-docs', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. ตั้งค่า RLS (Row Level Security) สำหรับ Storage Objects
-- หมายเหตุ: ในเครื่อง Local เราจะเน้นให้ใช้งานได้ง่าย จึงอนุญาตให้ Authenticated users ทำการจัดการไฟล์ได้ทั้งหมด

-- อนุญาตให้ทุกคนสามารถอ่านไฟล์ได้ (เพราะเป็น Public Buckets)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( true );

-- อนุญาตให้ผู้ที่ Login แล้วสามารถอัปโหลดไฟล์ได้
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK ( true );

-- อนุญาตให้ผู้ที่ Login แล้วสามารถแก้ไขไฟล์ได้
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( true );

-- อนุญาตให้ผู้ที่ Login แล้วสามารถลบไฟล์ได้
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( true );
