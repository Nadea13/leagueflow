import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
    const t = useTranslations('ResetPassword');

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4">
            {/* Background gradient effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-none blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-secondary/10 rounded-none blur-3xl -z-10" />

            <Card className="w-full max-w-sm backdrop-blur-sm bg-background/80 shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="space-y-4">
                    <div className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                            {t('title')}
                        </CardTitle>
                        <CardDescription>
                            {t('subtitle')}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <ResetPasswordForm />
                </CardContent>
            </Card>
        </div>
    );
}
