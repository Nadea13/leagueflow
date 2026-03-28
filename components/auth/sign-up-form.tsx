"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

import { serverSideSignup } from "@/app/[locale]/auth/auth-actions";

export function SignUpForm() {
    const t = useTranslations('SignUp');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: `${window.location.origin}/${locale}/auth/confirm`,
                },
            });

            if (error) {
                setError(error.message);
                return;
            }

            if (data.user) {
                await serverSideSignup(data.user.id, email);
            }

            setIsSuccess(true);
        } catch (err) {
            setError(tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{t('success_title')}</h3>
                    <p className="text-sm text-muted-foreground max-w-[250px]">
                        {t('success_desc')}
                    </p>
                </div>
                <Button variant="outline" onClick={() => router.push(`/${locale}/login`)} className="mt-4">
                    {t('sign_in')}
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {error && (
                <div className="text-sm text-red-500 text-center p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="fullName">{t('full_name')}</Label>
                <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-background/50"
                />
            </div>

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
                <Label htmlFor="password">{t('password')}</Label>
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
                        {t('registering')}
                    </>
                ) : (
                    t('register')
                )}
            </Button>
        </form>
    );
}
