"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

import { serverSideLogin } from "@/app/[locale]/auth/auth-actions";

export function EmailLoginForm() {
    const t = useTranslations('Login');
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(t('invalid_credentials'));
                setIsLoading(false);
                return;
            }

            // Log activity via server action to capture IP
            await serverSideLogin(email);

            // Redirect on success
            router.push(`/${locale}/dashboard`);
            router.refresh();
        } catch (err) {
            setError(t('invalid_credentials'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {error && (
                <div className="text-sm text-red-500 text-center p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                    {error}
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-background/50"
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('password')}</Label>
                    <Link
                        href="/forgot-password"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                    >
                        {t('forgot_password')}
                    </Link>
                </div>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-background/50"
                />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('signing_in')}
                    </>
                ) : (
                    t('sign_in_email')
                )}
            </Button>
        </form>
    );
}
