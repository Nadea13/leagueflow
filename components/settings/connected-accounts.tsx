"use client";

import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MailIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Header } from "../ui/header";

interface ConnectedAccountsProps {
    email?: string;
    className?: string;
}

export function ConnectedAccounts({ email, className }: ConnectedAccountsProps) {
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const handleConnectClick = (platform: string) => {
        toast({
            title: isThai ? `ระบบเชื่อมต่อ ${platform}` : `${platform} Integration`,
            description: isThai
                ? `ระบบเชื่อมต่อบัญชี ${platform} อยู่ในระหว่างการพัฒนาและจะพร้อมใช้งานใน Phase ถัดไปครับ`
                : `${platform} account connection is under development and will be available in the upcoming release.`,
        });
    };

    return (
        <div className={cn("p-4 space-y-4", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <Header level={4}>
                        {isThai ? "บัญชีที่เชื่อมต่อ" : "Connected Accounts"}
                    </Header>
                    <p className="text-xs text-muted-foreground">
                        {isThai
                            ? "เชื่อมต่อกับแพลตฟอร์มโซเชียลเพื่อความสะดวกในการเข้าสู่ระบบและรับการแจ้งเตือน"
                            : "Link your social accounts for seamless sign-in and match notifications."}
                    </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary bg-primary/10 border-primary/50">
                    <span>Phase 2 Ready</span>
                </Badge>
            </div>

            <div>

                {/* 1. Primary Email */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                            <MailIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6}>
                                    {isThai ? "อีเมลบัญชีหลัก" : "Primary Email"}
                                </Header>
                                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0 flex items-center gap-1 font-semibold">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {isThai ? "เชื่อมต่อแล้ว" : "Connected"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {email || "-"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Facebook */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center text-muted-foreground shrink-0">
                            <svg className="size-4 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6}>
                                    Facebook
                                </Header>
                                <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground">
                                    {isThai ? "เร็วๆ นี้" : "Coming Soon"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isThai
                                    ? "เชื่อมต่อเพื่อเข้าสู่ระบบด้วย Facebook และแชร์ผลการแข่งขัน"
                                    : "Connect for Facebook login and tournament sharing."}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 flex justify-start">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold hover:border-[#1877F2] hover:text-[#1877F2] shrink-0"
                            onClick={() => handleConnectClick("Facebook")}
                        >
                            {isThai ? "เชื่อมต่อ Facebook" : "Connect"}
                        </Button>
                    </div>
                </div>

                {/* 3. LINE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center text-muted-foreground shrink-0">
                            <svg className="size-4 fill-current" viewBox="0 0 24 24">
                                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.646 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.589-3.885 2.589-5.993z" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Header level={6}>
                                    LINE
                                </Header>
                                <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground">
                                    {isThai ? "เร็วๆ นี้" : "Coming Soon"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isThai
                                    ? "เชื่อมต่อกับ LINE เพื่อรับแจ้งเตือนตารางแข่งและการเปลี่ยนแปลงแบบเรียลไทม์"
                                    : "Connect with LINE to receive real-time match schedules and alerts."}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 flex justify-start">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold hover:border-[#06C755] hover:text-[#06C755] shrink-0"
                            onClick={() => handleConnectClick("LINE")}
                        >
                            {isThai ? "เชื่อมต่อ LINE" : "Connect"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
