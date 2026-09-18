import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { EmailLoginForm } from "@/features/auth/email-login-form";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { HeroDotBackground } from "@/components/landing/hero-dot-background";

export default function SignInPage() {
    const t = useTranslations('Login');

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 pt-24 md:pt-20">
            <PublicNavbar />

            {/* Interactive Canvas Dot Background */}
            <HeroDotBackground />

            {/* Ambient Fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-background/50 pointer-events-none z-[1]" />

            <Card className="w-full py-2 md:py-4 max-w-sm bg-card/50 backdrop-blur-md rounded-sm shadow-xl border relative z-10">
                <CardHeader className="text-center mb-1 md:mb-2 px-4">
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

                <CardContent className="space-y-1 md:space-y-2 px-4">
                    <OAuthButtons />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-2 text-muted-foreground">
                                {t('or')}
                            </span>
                        </div>
                    </div>

                    <EmailLoginForm />

                    <div className="text-center text-sm text-muted-foreground">
                        {t('no_account')}{" "}
                        <Link
                            href="/sign-up"
                            className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
                        >
                            {t('create_account')}
                        </Link>
                    </div>
                </CardContent>

                <CardFooter className="px-4">
                    <p className="text-center text-xs text-muted-foreground w-full mt-2 lg:mt-4">
                        {t('agreement')}{" "}
                        <Link
                            href="/terms-of-service"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                        >
                            {t('terms')}
                        </Link>{" "}
                        {t('and')}{" "}
                        <Link
                            href="/privacy-policy"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                        >
                            {t('privacy')}
                        </Link>
                        .
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
