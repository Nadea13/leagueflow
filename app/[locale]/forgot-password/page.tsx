import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Logo } from "@/components/shared/logo";
import { HeroDotBackground } from "@/components/landing/hero-dot-background";

export default function ForgotPasswordPage() {
    const t = useTranslations('ForgotPassword');

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 pt-24 md:pt-20">
            <PublicNavbar />

            {/* Interactive Canvas Dot Background */}
            <HeroDotBackground />

            {/* Ambient Fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-background/50 pointer-events-none z-[1]" />

            <Card className="w-full py-2 md:py-4 max-w-sm bg-card/50 backdrop-blur-md rounded-sm shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                <CardHeader className="text-center mb-1 md:mb-2 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center justify-center gap-1 md:gap-2 group">
                        <Logo className="w-8 h-8" color="#00C49A" />
                        <span className="font-black text-foreground text-xl tracking-tighter">Tourni</span>
                    </Link>

                    <div className="space-y-1 md:space-y-2">
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                            {t('title')}
                        </CardTitle>
                        <CardDescription>
                            {t('subtitle')}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-1 md:space-y-2 px-4">
                    <ForgotPasswordForm />
                </CardContent>
            </Card>
        </div>
    );
}
