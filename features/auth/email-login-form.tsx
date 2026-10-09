"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiClient } from "@/lib/api-client";

export function EmailLoginForm() {
    const t = useTranslations('Login');
    const _tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();

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
            const resp = await ApiClient.fetch<{
                access_token: string;
                refresh_token: string;
                user: any;
            }>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            if (resp.access_token) {
                ApiClient.setToken(resp.access_token);
                toast({
                    title: t('login_success') || "เข้าสู่ระบบสำเร็จ",
                    description: `ยินดีต้อนรับ ${resp.user?.full_name || ''}`,
                });

                router.push(`/${locale}/dashboard`);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || t('invalid_credentials') || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 w-full">
            {error && (
                <div className="text-sm rounded-sm text-destructive text-center p-2 bg-destructive/5 border border-destructive/20">
                    {error}
                </div>
            )}
            <div className="space-y-1">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder={t('email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="space-y-1">
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
                        placeholder={t('password_placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('signing_in') || "กำลังเข้าสู่ระบบ..."}
                    </>
                ) : (
                    t('sign_in') || "เข้าสู่ระบบ"
                )}
            </Button>
        </form>
    );
}
