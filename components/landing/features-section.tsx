"use client";

import React from "react";
import { motion } from "motion/react";
import {
  QrCode,
  ShieldCheck,
  Trophy,
  Flame,
} from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28 border-b relative overflow-hidden bg-background" id="features">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 lg:mb-18 space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground"
          >
            ทุกเครื่องมือที่ผู้จัดต้องการ รวมไว้ในที่เดียว
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto"
          >
            ออกแบบมาเพื่อเปลี่ยนงานจัดการแข่งขันที่ซับซ้อน ให้กลายเป็นเรื่องง่าย สะดวกรวดเร็ว และดูเป็นมืออาชีพที่สุด
          </motion.p>
        </div>

        {/* Unified Single Card Container with 6 Compartments (2 Columns x 3 Rows) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-sm border border-border bg-border overflow-hidden shadow-2xl shadow-primary/5 grid grid-cols-1 md:grid-cols-2 gap-[1px] backdrop-blur-md"
        >
          {/* Slot 1: React Flow Bracket Builder */}
          <div className="group relative flex flex-col justify-between bg-card p-6 sm:p-8 hover:bg-card/90 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

            {/* Visual Demo 1: Interactive Bracket */}
            <div
              className="h-44 w-full border border-border rounded-sm bg-background/80 relative overflow-hidden flex items-center justify-center p-3 select-none mb-6"
              style={{
                backgroundImage: `radial-gradient(color-mix(in srgb, var(--muted-foreground) 12%, transparent) 1px, transparent 1px)`,
                backgroundSize: "12px 12px",
              }}
            >
              <div className="relative w-full max-w-[270px] h-[95px] flex items-center justify-between">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M 94 22 C 135 22, 135 48, 176 48"
                    stroke="var(--color-node-2, #00C692)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 3"
                    className="opacity-70"
                  />
                  <path
                    d="M 94 72 C 135 72, 135 48, 176 48"
                    stroke="var(--color-node-2, #00C692)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 3"
                    className="opacity-70"
                  />
                </svg>

                <div className="flex flex-col justify-between h-full z-10 w-[94px]">
                  <div className="bg-card border border-primary/40 rounded-sm p-1.5 shadow-xs text-[10px] font-bold flex items-center justify-between relative">
                    <span className="truncate text-foreground">Thunder FC</span>
                    <span className="text-primary font-black ml-1 px-1 rounded-sm bg-primary/10">3</span>
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                  </div>
                  <div className="bg-card border border-border rounded-sm p-1.5 shadow-xs text-[10px] font-medium flex items-center justify-between relative text-muted-foreground">
                    <span className="truncate">Phoenix SC</span>
                    <span className="font-bold ml-1 px-1 rounded-sm bg-muted">1</span>
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border border-2 border-background" />
                  </div>
                </div>

                <div className="z-10 w-[94px]">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary rounded-sm p-2 shadow-xs flex flex-col gap-1 relative">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase text-primary tracking-wider">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> Finals
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    </div>
                    <div className="text-[10px] font-bold text-foreground flex items-center justify-between">
                      <span>Thunder FC</span>
                      <span className="text-primary font-black">ADV</span>
                    </div>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                จัดสายแข่งแบบ Interactive Node
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                สร้าง Tournament Bracket ด้วยระบบลากวาง Node จัดสายแข่ง Single/Double Elimination และแบ่งกลุ่มได้อิสระ
              </p>
            </div>
          </div>

          {/* Slot 2: PromptPay QR Payments */}
          <div className="group relative flex flex-col justify-between bg-card p-6 sm:p-8 hover:bg-card/90 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

            {/* Visual Demo 2: PromptPay Checkout Widget */}
            <div className="h-44 w-full border border-border rounded-sm bg-background/80 p-3.5 flex items-center gap-4 select-none relative overflow-hidden mb-6">
              <div className="relative w-20 h-20 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-border shadow-2xs">
                <QrCode className="w-full h-full text-slate-900" />
                <motion.div
                  animate={{ y: [0, 56, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981]"
                />
              </div>

              <div className="flex-1 flex flex-col justify-between h-full py-1 min-w-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-semibold">ค่าสมัครทัวร์นาเมนต์</span>
                    <span className="text-xs font-black text-foreground">฿2,500</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>PromptPay Instant</span>
                  </div>
                </div>

                <div className="mt-1 bg-emerald-500/10 border border-emerald-500/20 rounded-sm p-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">ตรวจสอบสลิปอัตโนมัติ</span>
                    <span className="text-[8px] text-muted-foreground">ยืนยันสิทธิ์เข้าแข่งขันทันที</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                รับสมัครพร้อมชำระ PromptPay
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                ระบบชำระเงินค่าสมัครอัตโนมัติผ่าน PromptPay QR Code ตรวจสอบสลิปและยืนยันทีมเข้าแข่งได้ทันที
              </p>
            </div>
          </div>

          {/* Slot 3: Team & Squad Management */}
          <div className="group relative flex flex-col justify-between bg-card p-6 sm:p-8 hover:bg-card/90 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

            {/* Visual Demo 3: Squad Roster Cards */}
            <div className="h-44 w-full border border-border rounded-sm bg-background/80 p-2.5 flex flex-col justify-between gap-1.5 select-none overflow-hidden mb-6">
              {[
                { no: "10", name: "กฤษดา วงศ์แก้ว", pos: "MF", role: "Captain", color: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
                { no: "09", name: "ศุภชัย ใจเด็ด", pos: "FW", role: "Starter", color: "bg-primary/10 text-primary border-primary/30" },
                { no: "01", name: "ปฏิวัติ คำไหม", pos: "GK", role: "Starter", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
              ].map((player, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 rounded-sm bg-card border border-border hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-sm bg-muted flex items-center justify-center font-black text-xs text-foreground font-mono">
                      {player.no}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground leading-tight">{player.name}</span>
                      <span className="text-[8px] text-muted-foreground">พร้อมลงสนาม • ตรวจสอบแล้ว</span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm border ${player.color}`}>
                    {player.pos}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                จัดการรายชื่อนักกีฬาและทีม
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                ควบคุมรายชื่อตัวจริง ตัวสำรอง กัปตันทีม พร้อมระบบตรวจสอบคุณสมบัตินักกีฬาและประวัติอย่างเป็นระบบ
              </p>
            </div>
          </div>

          {/* Slot 4: Match Logs & Realtime Events */}
          <div className="group relative flex flex-col justify-between bg-card p-6 sm:p-8 hover:bg-card/90 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

            {/* Visual Demo 4: Timeline Feed */}
            <div className="h-44 w-full border border-border rounded-sm bg-background/80 p-3 flex flex-col justify-between select-none overflow-hidden mb-6">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">LIVE 68&apos;</span>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground">Match #14 • Group A</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[9px] font-black text-primary w-5">64&apos;</span>
                  <div className="flex-1 bg-card border border-primary/30 rounded-sm px-2 py-0.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-foreground">⚽ GOAL! ชนาธิป สรงกระสินธ์</span>
                    <span className="text-[9px] font-black text-primary">2 - 1</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[9px] font-black text-yellow-500 w-5">51&apos;</span>
                  <div className="flex-1 bg-card border border-border rounded-sm px-2 py-0.5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">🟨 Yellow Card (Foul)</span>
                    <span className="text-[9px] text-muted-foreground">#4 Def</span>
                  </div>
                </div>
              </div>

              <div className="text-[8px] text-center text-muted-foreground bg-muted/30 py-0.5 rounded-sm">
                ⚡ อัปเดต Standings และสถิติส่วนตัวอัตโนมัติ
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                บันทึกเหตุการณ์สด Real-time
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                กดบันทึกประตู ใบเหลือง/แดง การเปลี่ยนตัวได้สดๆ จากข้างสนาม ข้อมูลอัปเดตตารางคะแนนทันที
              </p>
            </div>
          </div>

          {/* Slot 5: OBS Scoreboard Overlay */}
          <div className="group relative flex flex-col justify-between bg-card p-6 sm:p-8 hover:bg-card/90 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />

            {/* Visual Demo 5: Broadcast HUD */}
            <div className="h-44 w-full border border-border rounded-sm bg-slate-950 p-3 flex flex-col justify-between select-none relative overflow-hidden mb-6">
              <div className="flex items-center justify-between text-[8px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  OBS BROWSER SOURCE
                </span>
                <span className="font-mono text-slate-500">1080p 60FPS</span>
              </div>

              <div className="my-auto flex items-center justify-center">
                <div className="flex items-center bg-slate-900/90 border border-border rounded-sm overflow-hidden shadow-2xl scale-95">
                  <div className="px-2.5 py-1 bg-slate-800">
                    <span className="text-[11px] font-black text-white">BANGKOK FC</span>
                  </div>
                  <div className="px-2.5 py-1 bg-primary text-slate-950 text-xs font-black">
                    2
                  </div>
                  <div className="px-2 py-1 bg-slate-950 text-[9px] font-mono font-bold text-amber-400">
                    84:12
                  </div>
                  <div className="px-2.5 py-1 bg-blue-600 text-white text-xs font-black">
                    1
                  </div>
                  <div className="px-2.5 py-1 bg-slate-800">
                    <span className="text-[11px] font-black text-white">CHIANG MAI</span>
                  </div>
                </div>
              </div>

              <div className="text-[8px] text-center text-slate-400">
                ปรับแต่งสี โลโก้ และสไตล์สกอร์บอร์ดตามธีมงานได้อิสระ
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                Live Scoreboard สำหรับ OBS
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                คัดลอกลิงก์ Overlay ไปวางใน OBS Studio หรือ vMix เพื่อแสดงกราฟิกสกอร์บอร์ดสดระดับบรอดแคสต์ฟรี
              </p>
            </div>
          </div>

          {/* Slot 6: Player Statistics & Leaderboard */}
          <div className="group relative flex flex-col justify-between bg-card p-6 sm:p-8 hover:bg-card/90 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

            {/* Visual Demo 6: Leaderboard & Stat Bars */}
            <div className="h-44 w-full border border-border rounded-sm bg-background/80 p-3 flex flex-col justify-between select-none overflow-hidden mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-sm bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black">
                    <Flame className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">Top Scorer Leader</span>
                    <span className="text-[8px] text-muted-foreground">Premier Division</span>
                  </div>
                </div>
                <span className="text-xs font-black text-primary">12 Goals</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-card border border-border rounded-sm p-1.5 text-center">
                  <span className="text-[8px] text-muted-foreground block">ประตู</span>
                  <span className="text-xs font-black text-foreground">12</span>
                </div>
                <div className="bg-card border border-border rounded-sm p-1.5 text-center">
                  <span className="text-[8px] text-muted-foreground block">แอสซิสต์</span>
                  <span className="text-xs font-black text-foreground">8</span>
                </div>
                <div className="bg-card border border-border rounded-sm p-1.5 text-center">
                  <span className="text-[8px] text-muted-foreground block">ลงเล่น (นัด)</span>
                  <span className="text-xs font-black text-foreground">6</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[8px] text-muted-foreground border-t border-border pt-1">
                <span>ส่งออกรายงาน PDF / Excel</span>
                <span className="text-primary font-bold">1-Click Export</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
                สรุปสถิติ & ทำเนียบดาวซัลโว
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                รวบรวมสถิตินักกีฬารายบุคคล อันดับ Top Scorer ตารางแอสซิสต์ อัปเดตอัตโนมัติพร้อมส่งออก Excel
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
