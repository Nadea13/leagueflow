import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthNavbar } from "@/features/auth/auth-navbar";
import { Logo } from "@/components/shared/logo";

export default function ResetPasswordPage() {
    const t = useTranslations('ResetPassword');

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 pt-20 md:pt-16">
            <AuthNavbar />
            <Card className="w-full py-2 md:py-4 max-w-sm bg-card rounded-xl shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="text-center mb-1 md:mb-2">
                    {/* Logo */}
                    <Link href="/" className="flex items-center justify-center gap-1 md:gap-2 group">
                        <Logo className="w-8 h-8" color="#00C49A" />
                        <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
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

                <CardContent className="space-y-1 md:space-y-2">
                    <ResetPasswordForm />
                </CardContent>
            </Card>
        </div>
    );
}
