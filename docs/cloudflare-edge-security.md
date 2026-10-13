# Cloudflare Edge, Security & Rate Limiting Architecture

เอกสารคู่มือสรุปสถาปัตยกรรมความปลอดภัยและการตั้งค่า Cloudflare สำหรับ **LeagueFlow** (0฿ Production Ready)

---

## 1. การทำงานของระบบความปลอดภัยที่ติดตั้งใน Backend (Go Fiber)

### 1.1 Helmet Security Headers
Backend ตอบกลับทุก request พร้อม Security Headers มาตรฐานสากล:
- `X-Content-Type-Options: nosniff` (ป้องกัน MIME type sniffing)
- `X-Frame-Options: SAMEORIGIN` (ป้องกัน Clickjacking)
- `X-XSS-Protection: 0` (เปิด XSS Auditor สมัยใหม่)
- `Cross-Origin-Resource-Policy: same-origin`

### 1.2 Multi-Layer Rate Limiting (จำกัดการยิง Request ป้องกัน Brute-Force & Spam)
ระบบอ่าน IP จริงของผู้ใช้ผ่าน Header `CF-Connecting-IP` (จาก Cloudflare) และ `X-Forwarded-For` (จาก Vercel/Render):
1. **General API Rate Limiter:** 
   - จำกัด **150 requests / นาที ต่อ IP** สำหรับ endpoint ทั่วไป
2. **Strict Auth & OTP Rate Limiter:** 
   - จำกัด **15 requests / นาที ต่อ IP** สำหรับ endpoint สุ่มเสี่ยง:
     - `/api/v1/auth/send-otp` (ป้องกันการยิงสแปมขอรหัส OTP เปลืองโควตาอีเมล)
     - `/api/v1/auth/verify-otp` (ป้องกัน Brute-force สุ่มรหัส 6 หลัก)
     - `/api/v1/auth/login` (ป้องกัน Password Brute-force)
     - `/api/v1/auth/reset-password`

### 1.3 Cloudflare Edge Caching Headers
เพิ่ม `Cache-Control` สำหรับ Public Data:
- `/api/v1/sports`, `/api/v1/age-categories`: Cache นาน **60 วินาที**
- `/api/v1/tournaments`, `/api/v1/tournaments/:id`: Cache นาน **15 วินาที**
- `/api/v1/tournaments/:id/matches`: Cache นาน **10 วินาที**
> **ผลลัพธ์:** เมื่อผู้ชมจำนวนมากเข้ามาดูตารางแข่ง Cloudflare Edge Node (เช่น Bangkok Edge) จะส่งข้อมูลแคชตอบกลับได้ในเวลา **< 20ms** โดยไม่ต้องดึงข้อมูลจาก Database บน Render ซ้ำ

---

## 2. ขั้นตอนการตั้งค่าบน Cloudflare Dashboard (ฟรี 0฿)

### 2.1 เปิดใช้งาน Bot Fight Mode
1. ไปที่ **Cloudflare Dashboard** -> เลือกโดเมนของคุณ
2. เมนู **Security** -> **Bots**
3. เปิดสวิตช์ **Bot Fight Mode: ON** (ระบบจะบล็อก Malicious Bot และ Scraper อัตโนมัติฟรี)

### 2.2 ตั้งค่า Cloudflare Turnstile (CAPTCHA อัจฉริยะแบบไม่มีติ๊กถูก)
โปรเจกต์มี Component Turnstile รองรับเรียบร้อยแล้วใน `components/ui/turnstile.tsx`:
1. ใน Cloudflare ไปที่เมนู **Turnstile** -> กด **Add Site**
2. เลือกโหมด **Managed** (ตรวจจับบอทเงียบๆ โดยผู้ใช้ไม่ต้องคลิก)
3. นำคีย์ไปใส่ใน Environment Variables:
   - `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`
   - `CLOUDFLARE_TURNSTILE_SECRET_KEY`

### 2.3 ตั้งค่า WAF Custom Rate Limiting Rule (ทางเลือกเพิ่มเติม)
1. ใน Cloudflare ไปที่ **Security** -> **WAF** -> แท็บ **Rate limiting rules**
2. กด **Create rule**
   - **Rule name:** `Protect OTP and Auth API`
   - **If incoming requests match:** `URI Path contains "/api/v1/auth"`
   - **Rate:** 20 requests per 10 seconds
   - **Action:** Block หรือ Managed Challenge
