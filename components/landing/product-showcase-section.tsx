"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitFork,
  Radio,
  FileCheck2,
  TableProperties,
  Trophy,
  CheckCircle2,
  Eye,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowcaseItem {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  image: string;
}

const showcaseList: ShowcaseItem[] = [
  {
    id: "bracket",
    title: "จัดสายการแข่งขัน",
    titleEn: "Visual Drag & Drop Bracket Engine",
    category: "Tournament Engine",
    description: "สร้างสายแข่งแบบ Single / Double Elimination และรอบแบ่งกลุ่มด้วยระบบ Node Canvas ลากเส้นเชื่อมต่อแมตช์อัตโนมัติ",
    badge: "Auto-Advancement",
    icon: GitFork,
    image: "/img_1_landing.png",
  },
  {
    id: "team-management",
    title: "จัดการทีม",
    titleEn: "Team & Player Management",
    category: "Team Management",
    description: "ตรวจสอบรายชื่อทีมและนักกีฬา กำหนดเบอร์เสื้อ ตรวจสอบเอกสาร และจัดการสถานะผู้เล่นในแต่ละทีมอย่างเป็นระเบียบ",
    badge: "Roster Control",
    icon: Users,
    image: "/img_2_landing.png",
  },
  {
    id: "scoring",
    title: "จดคะแนน",
    titleEn: "Match Scoring & Live Control",
    category: "Match Control",
    description: "แผงควบคุมการแข่งขัน บันทึกคะแนนสด ผู้ทำประตู ใบเหลือง/แดง สถิติการแข่งขัน และอัปเดตผลสดทันที",
    badge: "Live Score",
    icon: Radio,
    image: "/img_4_landing.png",
  },
  {
    id: "registration",
    title: "ระบบรับสมัครทีมและสแกนจ่ายเงิน",
    titleEn: "Team Registration & PromptPay QR",
    category: "Registration & Payments",
    description: "เปิดรับสมัครทีมออนไลน์ ตรวจสอบรายชื่อนักกีฬา พร้อม QR Code พร้อมเพย์สร้างให้อัตโนมัติและตรวจสลิปโอนเงินแม่นยำ",
    badge: "PromptPay QR",
    icon: FileCheck2,
    image: "/img_5_landing.png",
  },
];

export function ProductShowcaseSection() {
  const [activeTab, setActiveTab] = useState<string>(showcaseList[0].id);
  const activeItem = showcaseList.find((item) => item.id === activeTab) || showcaseList[0];

  return (
    <section className="py-16 lg:py-24 border-b relative overflow-hidden bg-background">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 lg:mb-12 space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground"
          >
            สัมผัสหน้าจอระบบจริง
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-muted-foreground text-sm sm:text-base leading-relaxed"
          >
            ออกแบบหน้าจอให้ใช้งานง่าย ตอบโจทย์ทั้งผู้จัดงานแข่งขัน ทีมกีฬา และผู้ชมถ่ายทอดสด
          </motion.p>
        </div>

        {/* Clean Text-Only Navigation with Active Pill/Glow */}
        <div className="flex justify-center items-center gap-2 sm:gap-4 mb-6 sm:mb-8 flex-wrap">
          {showcaseList.map((item, index) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative px-3.5 sm:px-5 py-2 rounded-sm text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer select-none tracking-tight",
                  isActive
                    ? "text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeShowcaseTabPill"
                    className="absolute inset-0 bg-primary rounded-sm -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span>{item.title.split(" (")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* 3D Stacked Windows Container (Cascading Layered Windows) */}
        {/* Height tightly hugs the max-w-5xl 1536:748 aspect ratio card + header */}
        <div className="relative mx-auto max-w-5xl h-[220px] min-[480px]:h-[270px] sm:h-[370px] md:h-[430px] lg:h-[510px] xl:h-[540px] flex justify-center items-start perspective-[1200px]">
          {showcaseList.map((item, index) => {
            const activeIndex = showcaseList.findIndex((it) => it.id === activeTab);
            // Calculate relative offset from active tab
            // e.g. 0 = active (front), 1 = one level behind, 2 = two levels behind
            const diff = (index - activeIndex + showcaseList.length) % showcaseList.length;
            const isFront = diff === 0;

            // Stack order styling
            const scale = isFront ? 1 : Math.max(0.85, 1 - diff * 0.05);
            const translateY = isFront ? 0 : -diff * 20;
            const zIndex = isFront ? 30 : 30 - diff * 5;
            const opacity = isFront ? 1 : Math.max(0.3, 0.85 - diff * 0.22);

            return (
              <motion.div
                key={item.id}
                layout
                animate={{
                  scale,
                  y: translateY,
                  opacity,
                  zIndex,
                }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 26,
                }}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "absolute inset-x-0 mx-auto w-full max-w-5xl rounded-sm border border-border bg-card shadow-2xl overflow-hidden origin-top cursor-pointer transition-shadow",
                  isFront
                    ? "shadow-2xl cursor-default"
                    : "hover:border-primary/40 hover:opacity-90"
                )}
                style={{
                  zIndex,
                }}
              >
                {/* Mock Browser Header Bar */}
                <div className="h-9 sm:h-11 border-b border-border bg-muted/60 px-3 sm:px-4 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-600/30 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-600/30 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/30 inline-block" />
                  </div>

                  <div className="flex items-center gap-2 px-3 py-0.5 rounded-sm bg-background border border-border/60 text-[11px] font-mono text-muted-foreground max-w-[240px] sm:max-w-md truncate">
                    <span>leagueflow.vercel.app/tournaments/bangkok-super-cup/{item.id}</span>
                  </div>

                  <div className="w-12" />
                </div>

                {/* Screen Content View Area (Aspect ratio 1536:748, full width) */}
                <div className="p-0 w-full aspect-[1536/748] flex items-center justify-center bg-background/80 relative overflow-hidden">
                  {/* Real screenshot image (Aspect ratio 1536:748 match) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-top block"
                    onError={(e) => {
                      // If file is not yet dropped into /public, gracefully fallback to interactive mockup
                      (e.currentTarget as HTMLElement).style.display = "none";
                      const fallbackEl = document.getElementById(`fallback-${item.id}`);
                      if (fallbackEl) fallbackEl.style.display = "flex";
                    }}
                  />

                  {/* Interactive fallback mockup container */}
                  <div id={`fallback-${item.id}`} className="w-full h-full p-4 sm:p-8 flex items-center justify-center overflow-y-auto hidden">
                    {item.id === "bracket" && <BracketPreview />}
                    {item.id === "team-management" && <DashboardPreview />}
                    {item.id === "scoring" && <LiveScorePreview />}
                    {item.id === "registration" && <RegistrationPreview />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   1. Interactive Bracket Preview Frame
   ========================================================================= */
function BracketPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl space-y-6"
    >
      {/* Top filter bar in canvas */}
      <div className="flex items-center justify-between pb-3 border-b border-border/70 text-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <span className="px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">รอบน็อคเอาท์ (Knockout Stage)</span>
          <span className="text-muted-foreground">• 8 ทีมสุดท้าย</span>
        </div>
        <div className="text-muted-foreground text-[11px] font-mono hidden sm:block">
          Interactive Canvas • 100% Zoom
        </div>
      </div>

      {/* Bracket Tree Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center relative">
        {/* Column 1: Quarter Finals */}
        <div className="space-y-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">รอบ 8 ทีม (Quarter Finals)</div>
          
          {/* Match 1 */}
          <div className="border border-border rounded-sm bg-card p-2.5 space-y-1.5 shadow-xs relative">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Thunder FC
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-black">3</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" /> Phoenix SC
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-muted font-medium">1</span>
            </div>
          </div>

          {/* Match 2 */}
          <div className="border border-border rounded-sm bg-card p-2.5 space-y-1.5 shadow-xs relative">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" /> Vortex City
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-muted font-medium">0</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Apex United
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-black">2</span>
            </div>
          </div>
        </div>

        {/* Column 2: Semi Finals */}
        <div className="space-y-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">รอบรองชนะเลิศ (Semi Finals)</div>
          
          <div className="border border-primary/40 rounded-sm bg-card p-3 space-y-2 shadow-md relative">
            <div className="text-[9px] font-bold text-primary tracking-widest uppercase">Match #7 • กำลังแข่งขัน (Live)</div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Thunder FC
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-primary text-primary-foreground font-black">2</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Apex United
              </span>
              <span className="px-1.5 py-0.5 rounded-sm bg-primary text-primary-foreground font-black">1</span>
            </div>
          </div>
        </div>

        {/* Column 3: Finals */}
        <div className="space-y-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">รอบชิงชนะเลิศ (Grand Final)</div>
          
          <div className="border-2 border-dashed border-primary/30 rounded-sm bg-primary/5 p-4 text-center space-y-2">
            <Trophy className="w-6 h-6 text-primary mx-auto" />
            <div className="text-xs font-bold text-foreground">ผู้ชนะ Match #7</div>
            <div className="text-[10px] text-muted-foreground">รอพบผู้ชนะสายล่างเพื่อชิงถ้วยแชมป์</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   2. Live Scoring Match Control Preview
   ========================================================================= */
function LiveScorePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl space-y-4"
    >
      {/* Match Banner */}
      <div className="border border-border rounded-sm bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-destructive" /> LIVE 67&apos;
          </span>
          <span className="text-xs font-medium text-muted-foreground">สนาม 1 (Main Stadium)</span>
        </div>

        <div className="grid grid-cols-3 items-center text-center">
          <div className="space-y-1">
            <div className="font-black text-base sm:text-xl text-foreground">Thunder FC</div>
            <div className="text-xs text-muted-foreground">เจ้าบ้าน (Home)</div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl sm:text-5xl font-black text-primary">3</span>
            <span className="text-xl sm:text-2xl font-bold text-muted-foreground">:</span>
            <span className="text-3xl sm:text-5xl font-black text-muted-foreground">1</span>
          </div>

          <div className="space-y-1">
            <div className="font-black text-base sm:text-xl text-foreground">Dragon City</div>
            <div className="text-xs text-muted-foreground">ทีมเยือน (Away)</div>
          </div>
        </div>
      </div>

      {/* Match Events Timeline Log */}
      <div className="border border-border rounded-sm bg-card p-4 space-y-2.5">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">เหตุการณ์สำคัญ (Match Events)</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-sm bg-muted/40 border border-border/50">
            <span className="font-mono font-bold text-primary">62&apos;</span>
            <span className="font-semibold text-foreground">⚽ GOAL! ธีรศิลป์ (Thunder FC)</span>
            <span className="text-[10px] text-muted-foreground">Assisted by สารัช</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-sm bg-muted/40 border border-border/50">
            <span className="font-mono font-bold text-warning">45+1&apos;</span>
            <span className="font-semibold text-foreground">🟨 Yellow Card กฤษดา (Dragon City)</span>
            <span className="text-[10px] text-muted-foreground">Foul</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-sm bg-muted/40 border border-border/50">
            <span className="font-mono font-bold text-primary">24&apos;</span>
            <span className="font-semibold text-foreground">⚽ GOAL! ชนาธิป (Thunder FC)</span>
            <span className="text-[10px] text-muted-foreground">Penalty Kick</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   3. OBS Streaming Live Overlay Preview
   ========================================================================= */
function OverlayPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl space-y-4"
    >
      {/* Broadcast Canvas Simulation */}
      <div className="relative aspect-video rounded-sm border border-border bg-slate-950 overflow-hidden flex flex-col justify-between p-4 sm:p-6 shadow-2xl">
        {/* Subtle camera view background simulator */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none opacity-80" />
        
        {/* Broadcast Score Bug Overlay (Top-Left) */}
        <div className="relative z-10 flex items-center self-start border border-white/10 rounded-sm bg-black/85 backdrop-blur-md text-white shadow-2xl overflow-hidden font-sans">
          {/* League Logo / Tag */}
          <div className="px-2.5 py-1.5 bg-primary text-black font-black text-xs tracking-tighter flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>LEAGUE FLOW</span>
          </div>

          {/* Team 1 */}
          <div className="px-3 py-1.5 flex items-center gap-2 border-r border-white/10 font-bold text-xs sm:text-sm">
            <span>THU</span>
            <span className="text-primary font-black px-1.5 py-0.5 rounded-xs bg-white/10">3</span>
          </div>

          {/* Team 2 */}
          <div className="px-3 py-1.5 flex items-center gap-2 border-r border-white/10 font-bold text-xs sm:text-sm">
            <span className="text-white/80">DRA</span>
            <span className="text-white/80 font-black px-1.5 py-0.5 rounded-xs bg-white/10">1</span>
          </div>

          {/* Timer */}
          <div className="px-3 py-1.5 text-xs font-mono font-bold text-emerald-400">
            78:20
          </div>
        </div>

        {/* Center watermark simulator */}
        <div className="relative z-10 text-center text-white/20 font-bold text-xs uppercase tracking-widest pointer-events-none">
          OBS Studio Browser Source Preview • 1080p 60FPS
        </div>

        {/* Lower Third News / Scorer Card */}
        <div className="relative z-10 self-center sm:self-start bg-black/80 border border-white/10 rounded-sm px-4 py-2 flex items-center gap-3 backdrop-blur-md text-white text-xs">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <div>
            <span className="font-bold text-primary">PLAYER OF THE MATCH:</span>
            <span className="ml-2 font-medium text-white/90">Chanathip S. • 2 Goals • 1 Assist</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   4. Standings & League Table Preview
   ========================================================================= */
function StandingsPreview() {
  const standings = [
    { rank: 1, team: "Thunder FC", p: 7, w: 6, d: 1, l: 0, gd: "+14", pts: 19, form: ["W", "W", "W", "D", "W"] },
    { rank: 2, team: "Apex United", p: 7, w: 5, d: 1, l: 1, gd: "+9", pts: 16, form: ["W", "L", "W", "W", "W"] },
    { rank: 3, team: "Dragon City", p: 7, w: 4, d: 2, l: 1, gd: "+6", pts: 14, form: ["D", "W", "W", "D", "W"] },
    { rank: 4, team: "Vortex FC", p: 7, w: 3, d: 1, l: 3, gd: "-1", pts: 10, form: ["L", "W", "L", "D", "W"] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl border border-border rounded-sm bg-card shadow-sm overflow-hidden"
    >
      <div className="p-3 sm:p-4 border-b border-border bg-muted/20 flex items-center justify-between text-xs">
        <span className="font-bold text-foreground">ตารางคะแนนพรีเมียร์ลีก รุ่นทั่วไป (Premier Division)</span>
        <span className="text-muted-foreground text-[11px]">อัปเดตอัตโนมัติ 1 นาทีที่แล้ว</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground bg-muted/10 font-bold">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">สโมสร / ทีม</th>
              <th className="py-2.5 px-2 text-center">แข่ง</th>
              <th className="py-2.5 px-2 text-center">ชนะ</th>
              <th className="py-2.5 px-2 text-center">เสมอ</th>
              <th className="py-2.5 px-2 text-center">แพ้</th>
              <th className="py-2.5 px-2 text-center">GD</th>
              <th className="py-2.5 px-3 text-center font-black text-foreground">แต้ม</th>
              <th className="py-2.5 px-3 text-center hidden sm:table-cell">ฟอร์ม 5 นัด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standings.map((row) => (
              <tr key={row.rank} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-3 text-center font-bold">
                  <span className={cn(
                    "w-5 h-5 inline-flex items-center justify-center rounded-xs text-[11px]",
                    row.rank === 1 ? "bg-primary text-primary-foreground font-black" : "text-muted-foreground"
                  )}>
                    {row.rank}
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-foreground">{row.team}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{row.p}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{row.w}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{row.d}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{row.l}</td>
                <td className="py-3 px-2 text-center font-mono font-bold text-primary">{row.gd}</td>
                <td className="py-3 px-3 text-center font-black text-foreground text-sm">{row.pts}</td>
                <td className="py-3 px-3 text-center hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    {row.form.map((f, i) => (
                      <span
                        key={i}
                        className={cn(
                          "w-4 h-4 rounded-xs text-[9px] font-black inline-flex items-center justify-center",
                          f === "W" ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" :
                          f === "D" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                          "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                        )}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   5. Team Registration & PromptPay Preview
   ========================================================================= */
function RegistrationPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* Team Info Card */}
      <div className="border border-border rounded-sm bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="text-xs font-bold text-foreground">ฟอร์มสมัครเข้าร่วมแข่งขัน</span>
          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary font-bold">เปิดรับสมัคร</span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <div className="text-[11px] text-muted-foreground">ชื่อสโมสร / ทีม</div>
            <div className="p-2 rounded-sm border border-border bg-background font-bold text-foreground mt-0.5">
              Bangkok Warriors FC
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">ผู้จัดการทีม / เบอร์ติดต่อ</div>
            <div className="p-2 rounded-sm border border-border bg-background text-foreground mt-0.5">
              คุณสมชาย ใจดี • 089-123-4567
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">จำนวนนักกีฬาในรายชื่อ (Roster)</div>
            <div className="p-2 rounded-sm border border-border bg-background text-primary font-bold mt-0.5 flex items-center justify-between">
              <span>ลงทะเบียนแล้ว 14 / 16 คน</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Instant PromptPay Checkout Card */}
      <div className="border border-border rounded-sm bg-card p-4 space-y-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="text-xs font-bold text-foreground">ชำระค่าสมัครออนไลน์</span>
          <span className="text-xs font-bold text-primary">฿2,500.00</span>
        </div>

        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <div className="w-24 h-24 bg-white p-2 rounded-sm border border-border shadow-xs flex items-center justify-center">
            <QrCode className="w-full h-full text-slate-950" />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">สแกนผ่านแอปธนาคารใดก็ได้</span>
        </div>

        <div className="p-2 rounded-sm bg-primary/10 border border-primary/20 text-center text-xs font-bold text-primary">
          ✓ ระบบตรวจจับสลิปและยืนยันสิทธิ์ทันที
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================================
   6. Organizer Dashboard & Tournament Overview Preview
   ========================================================================= */
function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl space-y-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-sm border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">ทีมที่สมัครทั้งหมด</div>
          <div className="text-xl font-black text-foreground mt-1">16 <span className="text-xs text-muted-foreground font-normal">/ 16 ทีม</span></div>
          <div className="text-[10px] text-emerald-500 font-bold mt-1">เต็มโควตา</div>
        </div>
        <div className="p-3 rounded-sm border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">รายรับค่าสมัครรวม</div>
          <div className="text-xl font-black text-primary mt-1">฿40,000</div>
          <div className="text-[10px] text-muted-foreground mt-1">100% ชำระแล้ว</div>
        </div>
        <div className="p-3 rounded-sm border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">แมตช์ที่แข่งขันแล้ว</div>
          <div className="text-xl font-black text-foreground mt-1">18 <span className="text-xs text-muted-foreground font-normal">/ 24</span></div>
          <div className="text-[10px] text-primary font-bold mt-1">เหลือ 6 แมตช์</div>
        </div>
        <div className="p-3 rounded-sm border border-border bg-card">
          <div className="text-[11px] text-muted-foreground">ยอดเข้าชมหน้าเว็บ</div>
          <div className="text-xl font-black text-foreground mt-1">4,820</div>
          <div className="text-[10px] text-emerald-500 font-bold mt-1">↑ 24% วันนี้</div>
        </div>
      </div>

      <div className="border border-border rounded-sm bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-foreground pb-2 border-b border-border">
          <span>ตารางแข่งวันนี้ (Today&apos;s Fixtures)</span>
          <span className="text-xs text-primary font-medium">จัดการตารางทั้งหมด →</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-sm bg-muted/40">
            <span className="font-mono text-muted-foreground">18:00</span>
            <span className="font-bold text-foreground">Thunder FC vs Apex United</span>
            <span className="text-emerald-500 font-bold">สนาม 1 (Live OBS)</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-sm bg-muted/40">
            <span className="font-mono text-muted-foreground">20:00</span>
            <span className="font-bold text-foreground">Dragon City vs Phoenix SC</span>
            <span className="text-muted-foreground font-medium">สนาม 2 (รอแข่ง)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

