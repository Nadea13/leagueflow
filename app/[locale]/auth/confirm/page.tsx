"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/shared/logo";
import { HeroDotBackground } from "@/components/landing/hero-dot-background";

export default function AuthConfirmPage() {
    const router = useRouter();
    const t = useTranslations("Common");
    const locale = useLocale();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            const supabase = createClient();

            // First, check if we already have a session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error("AuthConfirmPage: Session error:", sessionError);
                if (isMounted) setError(sessionError.message);
                return;
            }

            if (session) {
                // console.log("AuthConfirmPage: Session found, redirecting to dashboard");
                window.location.href = `/${locale}/dashboard`;
                return;
            }

            // No session yet, listen for auth state changes
            // Supabase client will process the URL hash automatically
            // console.log("AuthConfirmPage: No session, waiting for auth state change...");

            const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
                // console.log("AuthConfirmPage: Auth state changed:", event);
                if (event === 'SIGNED_IN' && session) {
                    window.location.href = `/${locale}/dashboard`;
                }
            });

            // Timeout fallback - if no session after 5 seconds, redirect to login
            setTimeout(() => {
                if (isMounted) {
                    // console.log("AuthConfirmPage: Timeout, redirecting to sign-in");
                    router.push(`/${locale}/sign-in`);
                }
            }, 5000);

            return () => {
                subscription.unsubscribe();
            };
        };

        checkSession();

        return () => {
            isMounted = false;
        };
    }, [locale, router]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4">
                {/* Interactive Canvas Dot Background */}
                <HeroDotBackground />

                {/* Ambient Fade overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-background/50 pointer-events-none z-[1]" />

                <Card className="w-full max-w-sm bg-card/50 backdrop-blur-md shadow-xl border rounded-sm relative z-10">
                    <CardContent className="px-4 pt-6 space-y-6 text-center">
                        {/* Logo */}
                        <Link href="/" className="flex items-center justify-center gap-1 md:gap-2 group">
                            <Logo className="w-8 h-8" color="#00C49A" />
                            <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
                        </Link>

                        <div className="text-destructive font-semibold">Authentication Error</div>
                        <p className="text-muted-foreground text-sm">{error}</p>
                        <button
                            onClick={() => router.push(`/${locale}/sign-in`)}
                            className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Back to Login
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4">
            {/* Interactive Canvas Dot Background */}
            <HeroDotBackground />

            {/* Ambient Fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-background/50 pointer-events-none z-[1]" />

            <Card className="w-full max-w-sm bg-card/50 backdrop-blur-md shadow-xl border rounded-sm relative z-10">
                <CardContent className="px-4 pt-6 space-y-6 text-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center justify-center gap-1 md:gap-2 group">
                        <Logo className="w-8 h-8" color="#00C49A" />
                        <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
                    </Link>

                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">{t("loading")}</p>
                </CardContent>
            </Card>
        </div>
    );
}
