import React from 'react';
import { HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface FaqSectionProps {
  locale: string;
}

export function FaqSection({ locale }: FaqSectionProps) {
  const isThai = locale === 'th';

  const faqs = isThai
    ? [
        {
          q: 'League Flow คืออะไร และช่วยจัดการแข่งขันอย่างไร?',
          a: 'League Flow คือแพลตฟอร์มจัดการแข่งขันกีฬาและฟุตบอลครบวงจร ช่วยให้ผู้จัดการแข่งขันสร้างสายแข่ง (Tournament Bracket) และตารางแข่งลีกแบบพบกันหมด (Round Robin) อัตโนมัติ พร้อมระบบรับสมัครทีมออนไลน์และบันทึกสกอร์สดแบบเรียลไทม์',
          highlights: [
            'สร้างตารางแข่งอัตโนมัติภายใน 1 นาที',
            'ระบบรับสมัครทีมและจ่ายเงิน PromptPay',
            'บันทึกผลการแข่งขันแบบเรียลไทม์',
          ],
        },
        {
          q: 'รองรับกีฬาประเภทใดบ้าง?',
          a: 'League Flow ออกแบบมาให้ยืดหยุ่นรองรับกีฬายอดนิยมทุกประเภท เช่น ฟุตบอล (Football), ฟุตซอล (Futsal), บาสเกตบอล (Basketball), วอลเลย์บอล (Volleyball), แบดมินตัน (Badminton), เซปักตะกร้อ และคริกเก็ต',
          highlights: [
            'ฟุตบอล และ ฟุตซอล (11 คน, 7 คน, 5 คน)',
            'บาสเกตบอล และ วอลเลย์บอล',
            'กีฬาแร็กเก็ตและประเภทคู่/เดี่ยว',
          ],
        },
        {
          q: 'ระบบสร้างตารางแข่งขันและสายแข่ง (Bracket) ทำงานอย่างไร?',
          a: 'เพียงเลือกรูปแบบการแข่งขัน (น็อคเอาท์เดี่ยว, น็อคเอาท์สองสาย หรือ แบ่งกลุ่มพบกันหมด) จากนั้นระบุจำนวนทีม ระบบจะคำนวณรอบการแข่งขัน วันที่ เวลา และจับคู่ประกบคู่อัตโนมัติทันที',
          highlights: [
            'Single & Double Elimination Bracket',
            'ระบบ Group Stage + Knockout รอบชิง',
            'ตารางคะแนน (Standings) คำนวณอัตโนมัติตามกฎสากล',
          ],
        },
        {
          q: 'OBS Live Scoreboard Overlay ใช้งานอย่างไร มีค่าใช้จ่ายไหม?',
          a: 'เรามีระบบ Free Live Overlay ให้ใช้งานฟรี โดยนำ URL หน้า Overlay ไปใส่เป็น Browser Source ใน OBS Studio หรือ vMix เพื่อแสดงสกอร์บอร์ดชื่อทีม เวลา และคะแนนสดบนหน้าจอไลฟ์สดโดยอัตโนมัติ',
          highlights: [
            'ใช้งานฟรีผ่าน Browser Source',
            'อัปเดตคะแนนทันทีเมื่อกดบันทึกผลในระบบ',
            'ดีไซน์สวยงามระดับ Broadcast มืออาชีพ',
          ],
        },
        {
          q: 'มีระบบรับสมัครทีมและแจ้งเตือนนักกีฬาหรือไม่?',
          a: 'มีครบครัน ผู้จัดสามารถสร้างแบบฟอร์มรับสมัครทีม กำหนดค่าสมัคร และเปิดให้นักกีฬาแนบสลิป PromptPay พร้อมระบบตรวจสอบสลิปและแจ้งเตือนสถานะการรับสมัคร',
          highlights: [
            'ฟอร์มรับสมัครออนไลน์พร้อม QR PromptPay',
            'จัดการรายชื่อนักกีฬาและสตาฟโค้ช',
            'แชร์ลิงก์ให้ทีมสมัครได้ทันทีผ่านโซเชียลมีเดีย',
          ],
        },
      ]
    : [
        {
          q: 'What is League Flow and how does it help manage tournaments?',
          a: 'League Flow is an all-in-one sports tournament management platform that automates bracket generation, round-robin scheduling, online team registrations, and real-time live scoring.',
          highlights: [
            'Automated bracket generation in under 1 minute',
            'Online team registration with instant checkout',
            'Live real-time match scoring and standings',
          ],
        },
        {
          q: 'Which sports are supported?',
          a: 'League Flow supports Football, Futsal, Basketball, Volleyball, Badminton, Sepak Takraw, and Cricket with custom rules.',
          highlights: [
            'Football & Futsal (11v11, 7v7, 5v5)',
            'Basketball & Volleyball',
            'Racket sports and individual/team tournaments',
          ],
        },
        {
          q: 'How does the automated tournament bracket generator work?',
          a: 'Simply choose your tournament format (Single Elimination, Double Elimination, or Round Robin groups) and add your teams. The system automatically computes seeds, matches, schedule times, and progression.',
          highlights: [
            'Single & Double Elimination brackets',
            'Group stage round-robin + playoff brackets',
            'Auto-calculated standings table with goal difference',
          ],
        },
        {
          q: 'How do I use the OBS Live Scoreboard Overlay?',
          a: 'Copy your tournament match overlay link into OBS Studio or vMix as a Browser Source. The graphics update live whenever scores or match timers change.',
          highlights: [
            'Free to use for live streaming',
            'Instant live synchronization',
            'Broadcast-grade clean design',
          ],
        },
      ];

  return (
    <section className="py-16 lg:py-24 border-t bg-muted/10 relative" id="faq">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isThai ? 'คำถามที่พบบ่อย (FAQ)' : 'Frequently Asked Questions'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            {isThai
              ? 'ทุกคำตอบเกี่ยวกับการจัดแข่งขันด้วย League Flow'
              : 'Everything you need to know about League Flow'}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isThai
              ? 'รวมคำถามยอดฮิตและข้อมูลสำคัญสำหรับการสร้างทัวร์นาเมนต์และจัดลีกกีฬาของคุณ'
              : 'Common questions and detailed answers for tournament organizers.'}
          </p>
        </div>

        {/* FAQ Grid / Cards */}
        <div className="grid gap-6">
          {faqs.map((faq, idx) => (
            <article
              key={idx}
              className="bg-card border rounded-lg p-6 sm:p-8 shadow-sm hover:border-primary/40 transition-all duration-200"
            >
              <h3 className="text-lg sm:text-xl font-bold flex items-start gap-3 text-foreground mb-3">
                <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed pl-8 mb-4">
                {faq.a}
              </p>
              <ul className="pl-8 grid sm:grid-cols-3 gap-2">
                {faq.highlights.map((item, hIdx) => (
                  <li key={hIdx} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
