import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { EmailLoginForm } from "@/features/auth/email-login-form";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/shared/logo";
import { HeroDotBackground } from "@/components/landing/hero-dot-background";
import { Header } from "@/components/ui/header";
import { Label } from "@/components/ui/label";

interface SignInPageProps {
    searchParams?: Promise<{ error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
    const t = await getTranslations('Login');
    const resolvedParams = searchParams ? await searchParams : undefined;
    const authError = resolvedParams?.error;

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 py-16 md:py-20">
            <PublicNavbar />

            {/* Interactive Canvas Dot Background */}
            <HeroDotBackground />

            {/* Ambient Fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-background/50 pointer-events-none z-[1]" />

            <div className="w-full max-w-[480px] bg-card backdrop-blur-xl rounded-sm shadow-2xl relative z-10 p-4 space-y-4">
                <div className="text-center space-y-4">
                    {/* Logo */}
                    <Link href="/" className="inline-flex items-center justify-center gap-2 mx-auto group transition-transform hover:scale-105">
                        <Logo className="w-9 h-9" color="#00C49A" />
                        <span className="font-black text-foreground text-2xl tracking-tighter">League Flow</span>
                    </Link>

                    <div className="space-y-2">
                        <Header level={2}>{t('title')}</Header>
                        <p className="text-muted-foreground text-sm">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <OAuthButtons />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center uppercase">
                            <Label className="bg-card px-4">
                                {t('or')}
                            </Label>
                        </div>
                    </div>

                    <EmailLoginForm authError={authError} />

                    <div className="text-center text-sm text-muted-foreground">
                        {t('no_account')}{" "}
                        <Link
                            href="/sign-up"
                            className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                        >
                            {t('create_account')}
                        </Link>
                    </div>
                </div>

                <div>
                    <p className="text-center text-xs text-muted-foreground w-full leading-relaxed">
                        {t('agreement')}{" "}
                        <Link
                            href="/terms-of-service"
                            className="underline underline-offset-4 hover:text-foreground transition-colors"
                        >
                            {t('terms')}
                        </Link>{" "}
                        {t('and')}{" "}
                        <Link
                            href="/privacy-policy"
                            className="underline underline-offset-4 hover:text-foreground transition-colors"
                        >
                            {t('privacy')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
