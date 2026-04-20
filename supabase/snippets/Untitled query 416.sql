-- อัปเดตฟังก์ชันตรวจสอบสิทธิ์ให้ยอมรับ Service Role
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger AS $function$
BEGIN
  -- ถ้าคำสั่งมาจาก Supabase API (มี JWT)
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    -- ถ้าเป็น Service Role (Admin Client ของเรา) ให้ยอมรับการเปลี่ยนแปลงได้เลย
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- ถ้าไม่ใช่ ให้รีเซ็ตค่ากลับเป็นของเดิม (ป้องกัน User เปลี่ยนเอง)
    NEW.role = OLD.role;
    NEW.is_organizer = OLD.is_organizer;
  END IF;
  
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;
