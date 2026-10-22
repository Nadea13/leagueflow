"use client";

import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MailIcon, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Header } from "../ui/header";

interface ConnectedAccountsProps {
    email?: string;
    className?: string;
}

export function ConnectedAccounts({ email, className }: ConnectedAccountsProps) {
    const locale = useLocale();
    const isThai = locale === "th";

    return (
        <div className={cn("p-4 space-y-4", className)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <Header level={4}>
                        {isThai ? "บัญชีที่เชื่อมต่อ" : "Connected Accounts"}
                    </Header>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isThai
                            ? "จัดการการเชื่อมต่อบัญชีโซเชียลเพื่อเข้าสู่ระบบและรับการแจ้งเตือน"
                            : "Manage your connected social accounts for sign-in and notifications."}
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="self-start sm:self-auto text-xs font-bold text-amber-500 bg-amber-500/10 border-amber-500/50 py-1 px-2.5 flex items-center gap-1.5 shadow-2xs"
                >
                    <AlertCircle className="size-3.5" />
                    <span>{isThai ? "ยังไม่เปิดให้บริการ" : "Feature Unavailable"}</span>
                </Badge>
            </div>

            {/* Prominent Warning Callout */}
            <div className="flex items-start gap-3 p-3.5 rounded-sm border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-1">
                    <p className="font-bold text-foreground">
                        {isThai ? "ระบบเชื่อมต่อบัญชีภายนอกยังไม่พร้อมใช้งาน" : "Social Account Integration Not Yet Available"}
                    </p>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {isThai
                            ? "ฟีเจอร์การเชื่อมต่อบัญชี Google, Facebook และ LINE กำลังอยู่ในระหว่างการพัฒนาและยังไม่สามารถใช้งานได้ในขณะนี้ กรุณาเข้าสู่ระบบและใช้งานผ่านอีเมลหลักของท่านตามปกติ"
                            : "Connecting Google, Facebook, and LINE accounts is currently under development. Please continue using your primary email address to log in."}
                    </p>
                </div>
            </div>

            {/* Accounts List */}
            <div className="divide-y divide-border/60 rounded-sm border bg-card">
                {/* 1. Primary Email (Active & Working) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                    <div className="flex items-start gap-3 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                            <MailIcon className="size-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6}>
                                    {isThai ? "อีเมลบัญชีหลัก" : "Primary Email"}
                                </Header>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 py-0 flex items-center gap-1 font-bold">
                                    <CheckCircle2 className="size-3" />
                                    {isThai ? "ใช้งานอยู่" : "Active"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                                {email || "-"}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-1/3 flex justify-start sm:justify-end">
                        <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border bg-muted/30">
                            {isThai ? "บัญชีหลัก" : "Primary"}
                        </Badge>
                    </div>
                </div>

                {/* 2. Google (Unavailable) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-muted/20 opacity-70">
                    <div className="flex items-start gap-3 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
                            <svg className="size-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6} className="text-muted-foreground">
                                    Google
                                </Header>
                                <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-amber-500/50 bg-amber-500/10 font-bold flex items-center gap-1">
                                    <Lock className="size-2.5" />
                                    {isThai ? "ยังไม่เปิดใช้งาน" : "Unavailable"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isThai
                                    ? "เชื่อมต่อบัญชี Google เพื่อการเข้าสู่ระบบแบบ Single Sign-On"
                                    : "Connect your Google account for single sign-on access."}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-1/3 flex justify-start sm:justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-xs font-semibold opacity-60 cursor-not-allowed shrink-0 border-dashed"
                        >
                            <Lock className="size-3 mr-1.5" />
                            {isThai ? "ยังไม่เปิดใช้งาน" : "Unavailable"}
                        </Button>
                    </div>
                </div>

                {/* 3. Facebook (Unavailable) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-muted/20 opacity-70">
                    <div className="flex items-start gap-3 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
                            <svg className="size-4 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6} className="text-muted-foreground">
                                    Facebook
                                </Header>
                                <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-amber-500/50 bg-amber-500/10 font-bold flex items-center gap-1">
                                    <Lock className="size-2.5" />
                                    {isThai ? "ยังไม่เปิดใช้งาน" : "Unavailable"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isThai
                                    ? "เชื่อมต่อเพื่อเข้าสู่ระบบด้วย Facebook และแชร์ผลการแข่งขัน"
                                    : "Connect for Facebook login and tournament sharing."}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-1/3 flex justify-start sm:justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-xs font-semibold opacity-60 cursor-not-allowed shrink-0 border-dashed"
                        >
                            <Lock className="size-3 mr-1.5" />
                            {isThai ? "ยังไม่เปิดใช้งาน" : "Unavailable"}
                        </Button>
                    </div>
                </div>

                {/* 4. LINE (Unavailable) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-muted/20 opacity-70">
                    <div className="flex items-start gap-3 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
                            <svg className="size-4 fill-current text-[#06C755]" viewBox="0 0 24 24">
                                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.646 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.589-3.885 2.589-5.993z" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6} className="text-muted-foreground">
                                    LINE
                                </Header>
                                <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-amber-500/50 bg-amber-500/10 font-bold flex items-center gap-1">
                                    <Lock className="size-2.5" />
                                    {isThai ? "ยังไม่เปิดใช้งาน" : "Unavailable"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isThai
                                    ? "เชื่อมต่อกับ LINE เพื่อรับแจ้งเตือนตารางแข่งและการเปลี่ยนแปลงแบบเรียลไทม์"
                                    : "Connect with LINE to receive real-time match schedules and alerts."}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-1/3 flex justify-start sm:justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-xs font-semibold opacity-60 cursor-not-allowed shrink-0 border-dashed"
                        >
                            <Lock className="size-3 mr-1.5" />
                            {isThai ? "ยังไม่เปิดใช้งาน" : "Unavailable"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
