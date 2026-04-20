"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { signIn } from "@/actions/common/auth";

export function EmailLoginForm() {
    const t = useTranslations('Login');
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Use Server Action for better security and cookie handling
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);

            const result = await signIn(formData, locale);

            if (!result.success) {
                setError(t('invalid_credentials'));
                setIsLoading(false);
                return;
            }

            // Redirect on success
            router.push(`/${locale}/dashboard`);
            router.refresh();
        } catch (_err) {
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
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="bg-background/50 pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
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
