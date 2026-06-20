"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ResetPasswordForm() {
    const t = useTranslations('ResetPassword');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            await supabase.auth.signOut();
            setIsSuccess(true);
        } catch (_err) {
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
                    {tCommon('back_to_login') || "Back to Login"}
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-1 md:space-y-2 w-full">
            {error && (
                <div className="text-sm rounded-sm text-destructive text-center p-2 bg-destructive/5 border border-destructive/20">
                    {error}
                </div>
            )}

            <div className="space-y-1">
                <Label htmlFor="password">{t('new_password')}</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-1">
                <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t('updating')}
                    </>
                ) : (
                    t('update_password')
                )}
            </Button>
        </form>
    );
}
