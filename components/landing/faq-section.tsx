"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, Sparkles, CheckCircle2, ChevronDown } from "lucide-react";

interface FaqSectionProps {
  locale: string;
}

export function FaqSection({ locale }: FaqSectionProps) {
  const isThai = locale === "th";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = isThai
    ? [
        {
          q: "League Flow คืออะไร และช่วยจัดการแข่งขันอย่างไร?",
          a: "League Flow คือแพลตฟอร์มจัดการแข่งขันกีฬาและฟุตบอลครบวงจร ช่วยให้ผู้จัดการแข่งขันสร้างสายแข่ง (Tournament Bracket) และตารางแข่งลีกแบบพบกันหมด (Round Robin) อัตโนมัติ พร้อมระบบรับสมัครทีมออนไลน์และบันทึกสกอร์สดแบบเรียลไทม์",
          highlights: [
            "สร้างตารางแข่งอัตโนมัติภายใน 1 นาที",
            "ระบบรับสมัครทีมและจ่ายเงิน PromptPay",
            "บันทึกผลการแข่งขันแบบเรียลไทม์",
          ],
        },
        {
          q: "รองรับกีฬาประเภทใดบ้าง?",
          a: "League Flow ออกแบบมาให้ยืดหยุ่นรองรับกีฬายอดนิยมทุกประเภท เช่น ฟุตบอล (Football), ฟุตซอล (Futsal), บาสเกตบอล (Basketball), วอลเลย์บอล (Volleyball), แบดมินตัน (Badminton), เซปักตะกร้อ และคริกเก็ต",
          highlights: [
            "ฟุตบอล และ ฟุตซอล (11 คน, 7 คน, 5 คน)",
            "บาสเกตบอล และ วอลเลย์บอล",
            "กีฬาแร็กเก็ตและประเภทคู่/เดี่ยว",
          ],
        },
        {
          q: "ระบบสร้างตารางแข่งขันและสายแข่ง (Bracket) ทำงานอย่างไร?",
          a: "เพียงเลือกรูปแบบการแข่งขัน (น็อคเอาท์เดี่ยว, น็อคเอาท์สองสาย หรือ แบ่งกลุ่มพบกันหมด) จากนั้นระบุจำนวนทีม ระบบจะคำนวณรอบการแข่งขัน วันที่ เวลา และจับคู่ประกบคู่อัตโนมัติทันที",
          highlights: [
            "Single & Double Elimination Bracket",
            "ระบบ Group Stage + Knockout รอบชิง",
            "ตารางคะแนน (Standings) คำนวณอัตโนมัติตามกฎสากล",
          ],
        },
        {
          q: "OBS Live Scoreboard Overlay ใช้งานอย่างไร มีค่าใช้จ่ายไหม?",
          a: "เรามีระบบ Free Live Overlay ให้ใช้งานฟรี โดยนำ URL หน้า Overlay ไปใส่เป็น Browser Source ใน OBS Studio หรือ vMix เพื่อแสดงสกอร์บอร์ดชื่อทีม เวลา และคะแนนสดบนหน้าจอไลฟ์สดโดยอัตโนมัติ",
          highlights: [
            "ใช้งานฟรีผ่าน Browser Source",
            "อัปเดตคะแนนทันทีเมื่อกดบันทึกผลในระบบ",
            "ดีไซน์สวยงามระดับ Broadcast มืออาชีพ",
          ],
        },
        {
          q: "มีระบบรับสมัครทีมและแจ้งเตือนนักกีฬาหรือไม่?",
          a: "มีครบครัน ผู้จัดสามารถสร้างแบบฟอร์มรับสมัครทีม กำหนดค่าสมัคร และเปิดให้นักกีฬาแนบสลิป PromptPay พร้อมระบบตรวจสอบสลิปและแจ้งเตือนสถานะการรับสมัคร",
          highlights: [
            "ฟอร์มรับสมัครออนไลน์พร้อม QR PromptPay",
            "จัดการรายชื่อนักกีฬาและสตาฟโค้ช",
            "แชร์ลิงก์ให้ทีมสมัครได้ทันทีผ่านโซเชียลมีเดีย",
          ],
        },
      ]
    : [
        {
          q: "What is League Flow and how does it help manage tournaments?",
          a: "League Flow is an all-in-one sports tournament management platform that automates bracket generation, round-robin scheduling, online team registrations, and real-time live scoring.",
          highlights: [
            "Automated bracket generation in under 1 minute",
            "Online team registration with instant checkout",
            "Live real-time match scoring and standings",
          ],
        },
        {
          q: "Which sports are supported?",
          a: "League Flow supports Football, Futsal, Basketball, Volleyball, Badminton, Sepak Takraw, and Cricket with custom rules.",
          highlights: [
            "Football & Futsal (11v11, 7v7, 5v5)",
            "Basketball & Volleyball",
            "Racket sports and individual/team tournaments",
          ],
        },
        {
          q: "How does the automated tournament bracket generator work?",
          a: "Simply choose your tournament format (Single Elimination, Double Elimination, or Round Robin groups) and add your teams. The system automatically computes seeds, matches, schedule times, and progression.",
          highlights: [
            "Single & Double Elimination brackets",
            "Group stage round-robin + playoff brackets",
            "Auto-calculated standings table with goal difference",
          ],
        },
        {
          q: "How do I use the OBS Live Scoreboard Overlay?",
          a: "Copy your tournament match overlay link into OBS Studio or vMix as a Browser Source. The graphics update live whenever scores or match timers change.",
          highlights: [
            "Free to use for live streaming",
            "Instant live synchronization",
            "Broadcast-grade clean design",
          ],
        },
      ];

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-20 lg:py-28 border-b bg-muted/10 relative overflow-hidden" id="faq">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16 space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            {isThai
              ? "ทุกคำตอบเกี่ยวกับการจัดแข่งขันด้วย League Flow"
              : "Everything you need to know about League Flow"}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isThai
              ? "รวมคำถามยอดฮิตและข้อมูลสำคัญสำหรับการสร้างทัวร์นาเมนต์และจัดลีกกีฬาของคุณ"
              : "Common questions and detailed answers for tournament organizers."}
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className={`rounded-sm border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-card border-primary/40 shadow-lg shadow-primary/5"
                    : "bg-card/70 hover:bg-card border-border/70 shadow-xs"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 transition-colors ${
                        isOpen ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-base sm:text-lg text-foreground leading-snug">
                      {faq.q}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="shrink-0 text-muted-foreground"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-muted-foreground leading-relaxed space-y-4 border-t border-border/40">
                        <p>{faq.a}</p>
                        <div className="grid sm:grid-cols-3 gap-2.5 pt-2">
                          {faq.highlights.map((item, hIdx) => (
                            <div
                              key={hIdx}
                              className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground bg-muted/40 p-2.5 rounded-sm border border-border/40"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
