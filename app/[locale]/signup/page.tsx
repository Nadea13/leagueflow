"use client";

import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { AuthNavbar } from "@/features/auth/auth-navbar";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";


export default function SignUpPage() {
    const t = useTranslations('SignUp');

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 pt-20 md:pt-16">
            <AuthNavbar />
            {/* Background gradient effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/10 blur-3xl -z-10" />

            <Card className="w-full py-2 md:py-4 max-w-sm bg-card rounded-sm shadow-md border animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                    <SignUpForm />

                    <div className="text-center text-sm text-muted-foreground">
                        {t('have_account')}{" "}
                        <Link
                            href="/login"
                            className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
                        >
                            {t('sign_in')}
                        </Link>
                    </div>
                </CardContent>

                <CardFooter>
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
