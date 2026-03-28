import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { LanguageSelect } from "@/components/language-select";
import { ModeToggle } from "@/components/mode-toggle";
import { DeleteAccountButton } from "./delete-account-button";
import { ChevronRight, FileText, Shield, CreditCard, Sliders, Scale, AlertTriangle } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "@/components/dashboard/profile-form";

export default async function SettingsPage() {
    // Use DashboardSettings to avoid conflict
    const t = await getTranslations("DashboardSettings");
    const tCommon = await getTranslations("Common");
    const tLegal = await getTranslations("Legal");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>

            {/* Profile Settings */}
            <ProfileForm user={user} />

            {/* Preferences */}
            <div className="space-y-6 border rounded-none p-6 bg-background shadow-sm">
                <div>
                    <h3 className="font-semibold leading-none tracking-tight mb-2 flex flex-row items-center gap-2">
                        <Sliders className="h-5 w-5 text-muted-foreground" />
                        {t("preferences")}
                    </h3>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label>{tCommon("language")}</Label>
                        <LanguageSelect />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>{tCommon("theme")}</Label>
                        <ModeToggle />
                    </div>
                </div>
            </div>

            {/* Legal Links */}
            <div className="space-y-6 border rounded-none p-6 bg-background shadow-sm">
                <div>
                    <h3 className="font-semibold leading-none tracking-tight mb-2 flex flex-row items-center gap-2">
                        <Scale className="h-5 w-5 text-muted-foreground" />
                        {t("legal")}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t("legal_desc")}</p>
                </div>
                <div className="grid gap-1">
                    <Link href="/privacy-policy" className="flex items-center justify-between p-3 rounded-none hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{tLegal("privacy")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="/terms-of-service" className="flex items-center justify-between p-3 rounded-none hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{tLegal("terms")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="/refund-policy" className="flex items-center justify-between p-3 rounded-none hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{tLegal("refund")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                </div>
            </div>

            {/* Danger Zone */}
            <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {t("danger_zone")}
                    </CardTitle>
                    <CardDescription className="text-destructive/80">{t("delete_account_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-destructive">{t("delete_account")}</h4>
                            <p className="text-sm text-destructive/80">{t("delete_account_desc")}</p>
                        </div>
                        <DeleteAccountButton email={user?.email || ""} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}