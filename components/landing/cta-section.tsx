"use client";

import React from "react";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export function CtaSection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-sm border border-border bg-gradient-to-b from-card via-card/80 to-background p-8 sm:p-12 lg:p-16 text-center shadow-2xl shadow-primary/5 overflow-hidden"
        >
          {/* Decorative Glowing Orbs */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground max-w-3xl mx-auto mb-5 leading-tight">
            พร้อมที่จะยกระดับทัวร์นาเมนต์ของคุณให้เป็นมืออาชีพแล้วหรือยัง?
          </h2>

          {/* Description */}
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            เข้าร่วมกับ League Flow วันนี้ เพื่อการจัดการแข่งขันกีฬาที่ราบรื่น รวดเร็ว ประหยัดเวลา และสร้างความประทับใจให้กับทั้งนักกีฬาและแฟนบอล
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Button
              size="lg"
              className="w-full sm:w-auto h-13 px-9 font-bold text-base group shadow-xl shadow-primary/25 cursor-pointer rounded-sm"
              asChild
            >
              <Link href="/signup">
                เริ่มต้นสร้างการแข่งขันฟรี
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-13 px-9 font-bold text-base cursor-pointer hover:bg-muted/50 border-border rounded-sm"
              asChild
            >
              <a
                href="https://www.facebook.com/profile.php?id=61583928452496"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                ติดต่อสอบถามทีมงาน
              </a>
            </Button>
          </div>

          {/* Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-muted-foreground font-medium pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>สร้างสายแข่งอัตโนมัติ 1 นาที</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>รองรับ PromptPay QR Instant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>ใช้งาน OBS Overlay สกอร์บอร์ดฟรี</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
