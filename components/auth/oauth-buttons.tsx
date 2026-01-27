"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Provider } from "@supabase/supabase-js";
import { Facebook } from "lucide-react";
import { useLocale } from "next-intl";


export function OAuthButtons() {
    const locale = useLocale();

    const handleLogin = async (provider: Provider) => {
        const supabase = createClient();
        
        // ใช้ window.location.origin เพื่อความชัวร์ (Browser Only)
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                // 1. ระบุปลายทางให้ชัดเจน (ตามที่คุณเขียนถูกแล้ว)
                redirectTo: `${origin}/${locale}/auth/callback?next=/${locale}/dashboard`,
                
                // 2. ⚠️ เพิ่มส่วนนี้ครับ! (สำคัญมากสำหรับ Google)
                queryParams: {
                    access_type: 'offline', // บังคับขอ Refresh Token (เพื่อให้ Server จัดการ Session ได้)
                    prompt: 'consent',      // บังคับขึ้นหน้าเลือกบัญชีทุกครั้ง (ป้องกันการ Login ค้าง)
                },
            },
        });

        if (error) {
            console.error("OAuth error:", error);
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full max-w-sm">
            <Button
                variant="outline"
                onClick={() => handleLogin("google")}
                className="w-full flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Google
            </Button>

            <Button
                variant="outline"
                onClick={() => handleLogin("facebook")}
                className="w-full flex items-center justify-center gap-2"
            >
                <Facebook className="w-5 h-5 text-blue-600" />
                Facebook
            </Button>
        </div>
    );
}