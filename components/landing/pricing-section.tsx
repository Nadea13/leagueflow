"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      id: "match",
      name: "Match",
      description: "เหมาะสำหรับทัวร์นาเมนต์ขนาดเล็กหรือผู้เริ่มต้นจัดแข่งขัน",
      priceMonthly: 0,
      priceYearly: 0,
      priceLabel: "ตลอดชีพ",
      popular: false,
      ctaText: "เริ่มต้นใช้งานฟรี",
      ctaHref: "/signup",
      ctaVariant: "outline" as const,
      features: [
        "สร้างทัวร์นาเมนต์สูงสุด 1 รายการ",
        "สร้างรุ่นการแข่งขันสูงสุด 1 รุ่น",
        "จำกัดจำนวนทีมสูงสุด 12 ทีม",
        "ระบบรับเงินค่าสมัครผ่าน QR Code",
        "บันทึกเหตุการณ์สดแบบเรียลไทม์",
        "OBS Live Scoreboard Overlay ฟรี",
      ],
    },
    {
      id: "event",
      name: "Event",
      description: "จัดทัวร์นาเมนต์แบบมืออาชีพพร้อมระบบชำระเงินที่สมบูรณ์แบบ",
      priceMonthly: 145,
      originalMonthly: 290,
      priceYearly: 2900,
      priceLabel: "/ เดือน",
      popular: true,
      discountBadge: "-50% โปรเปิดตัว",
      ctaText: "สมัครแพ็คเกจ Event",
      ctaHref: "/signup",
      ctaVariant: "default" as const,
      features: [
        "สร้างทัวร์นาเมนต์สูงสุด 3 รายการ/เดือน",
        "สร้างรุ่นการแข่งขันสูงสุด 3 รุ่น",
        "จำกัดจำนวนทีมสูงสุด 32 ทีม",
        "บันทึกเหตุการณ์สด / ผู้ทำประตู / ฟาวล์",
        "เพิ่มสตาฟดูแลร่วมกัน 3 คน",
        "ระบบลงทะเบียนพร้อมจ่าย PromptPay",
        "OBS Live Scoreboard Overlay HD",
      ],
    },
    {
      id: "cup",
      name: "Cup",
      description: "จัดทัวร์นาเมนต์ขนาดใหญ่และลีกประสิทธิภาพสูง",
      priceMonthly: 1490,
      priceYearly: 14900,
      priceLabel: "/ เดือน",
      popular: false,
      ctaText: "สมัครแพ็คเกจ Cup",
      ctaHref: "/signup",
      ctaVariant: "outline" as const,
      features: [
        "สร้างทัวร์นาเมนต์สูงสุด 10 รายการ/เดือน",
        "สร้างรุ่นการแข่งขันได้ไม่จำกัด",
        "จำกัดจำนวนทีมสูงสุด 128 ทีมต่อรุ่น",
        "บันทึกเหตุการณ์สดแบบเรียลไทม์",
        "เพิ่มสตาฟดูแลได้ไม่จำกัด",
        "ระบบลงทะเบียนพร้อมจ่าย PromptPay",
        "OBS Live Overlay และระบบ Backup",
      ],
    },
    {
      id: "customs",
      name: "Customs",
      description: "สำหรับองค์กร สมาคมกีฬา หรือความต้องการปรับแต่งพิเศษ",
      priceMonthly: null,
      priceYearly: null,
      priceLabel: "ติดต่อสอบถาม",
      popular: false,
      ctaText: "ติดต่อทีมงาน",
      ctaHref: "https://www.facebook.com/profile.php?id=61583928452496",
      ctaVariant: "outline" as const,
      isExternal: true,
      features: [
        "สิทธิ์การเข้าใช้งานฟีเจอร์ Pro ทั้งหมด",
        "ระบบจัดการและโฆษณาสปอนเซอร์หลัก",
        "ส่งออกข้อมูลนักกีฬาและผล (Excel/CSV)",
        "ปรับแต่งระบบด้วย Custom Domain",
        "ทีมงานดูแลและให้คำปรึกษาตลอดงาน",
      ],
    },
  ];

  return (
    <section className="py-20 lg:py-28 border-b relative overflow-hidden bg-background" id="pricing">
      {/* Subtle background gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            แผนราคาที่เหมาะกับขนาดทัวร์นาเมนต์ของคุณ
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            เลือกแพ็กเกจที่ตอบโจทย์ ตั้งแต่ลีกกระชับมิตรขนาดย่อม ไปจนถึงทัวร์นาเมนต์ระดับประเทศ
          </p>

          {/* Billing Toggle Switch */}
          <div className="pt-4 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "relative px-4 sm:px-5 py-2 rounded-sm text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer select-none tracking-tight",
                billingCycle === "monthly"
                  ? "text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="activeBillingCycleTabPill"
                  className="absolute inset-0 bg-primary rounded-sm -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span>ชำระรายเดือน</span>
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "relative flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-sm text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer select-none tracking-tight",
                billingCycle === "yearly"
                  ? "text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {billingCycle === "yearly" && (
                <motion.div
                  layoutId="activeBillingCycleTabPill"
                  className="absolute inset-0 bg-primary rounded-sm -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span>ชำระรายปี</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-sm text-[10px] font-black transition-colors duration-300",
                  billingCycle === "yearly"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/15 text-primary"
                )}
              >
                ประหยัด 2 เดือน
              </span>
            </button>
          </div>
        </div>

        {/* Single Unified Card for Pricing (4 Compartments) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-sm border border-border bg-border overflow-hidden shadow-2xl shadow-primary/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] backdrop-blur-md"
        >
          {plans.map((plan) => {
            const isEvent = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 sm:p-8 transition-colors duration-300 ${
                  isEvent
                    ? "bg-gradient-to-b from-card via-card/95 to-primary/[0.04] shadow-inner"
                    : "bg-card hover:bg-card/90"
                }`}
              >
                {/* Popular Pill */}
                {isEvent && (
                  <div className="inline-flex items-center gap-1 self-start bg-gradient-to-r from-primary via-primary to-emerald-400 text-primary-foreground text-[10px] font-black px-3 py-0.5 rounded-sm tracking-wider shadow-xs mb-3">
                    <Sparkles className="w-3 h-3" /> ยอดนิยม
                  </div>
                )}

                <div>
                  {/* Title & Discount Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl sm:text-2xl font-black text-foreground">{plan.name}</h3>
                    {plan.discountBadge && (
                      <Badge variant="default" className="text-[10px] font-bold rounded-sm">
                        {plan.discountBadge}
                      </Badge>
                    )}
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed mb-6 min-h-[32px]">
                    {plan.description}
                  </p>

                  {/* Price Block */}
                  <div className="mb-6 pb-6 border-b border-border">
                    <AnimatePresence mode="wait">
                      {plan.priceMonthly === null ? (
                        <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                          ติดต่อสอบถาม
                        </div>
                      ) : (
                        <motion.div
                          key={billingCycle}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            {billingCycle === "monthly" && plan.originalMonthly && (
                              <span className="text-base font-bold line-through text-muted-foreground/60">
                                ฿{plan.originalMonthly.toLocaleString()}
                              </span>
                            )}
                            <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                              ฿
                              {billingCycle === "monthly"
                                ? plan.priceMonthly.toLocaleString()
                                : plan.priceYearly.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {billingCycle === "monthly" ? plan.priceLabel : "/ ปี"}
                            </span>
                          </div>
                          {billingCycle === "monthly" && plan.priceYearly > 0 && (
                            <span className="text-[11px] text-primary font-bold block mt-1">
                              หรือรายปี ฿{plan.priceYearly.toLocaleString()}/ปี
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 text-xs sm:text-sm text-foreground/90 mb-8">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  {plan.isExternal ? (
                    <Button
                      variant={plan.ctaVariant}
                      className="w-full h-11 font-bold text-sm cursor-pointer shadow-xs hover:border-primary/40 rounded-sm"
                      asChild
                    >
                      <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer">
                        {plan.ctaText}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant={plan.ctaVariant}
                      className={`w-full h-11 font-bold text-sm cursor-pointer shadow-xs group rounded-sm ${
                        isEvent ? "shadow-md shadow-primary/20" : "hover:border-primary/40"
                      }`}
                      asChild
                    >
                      <Link href={plan.ctaHref}>
                        {plan.ctaText}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
