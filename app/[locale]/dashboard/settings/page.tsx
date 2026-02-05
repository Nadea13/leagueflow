import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { LanguageSelect } from "@/components/language-select";
import { ModeToggle } from "@/components/mode-toggle";
import { DeleteAccountButton } from "./delete-account-button";
import { ChevronRight, FileText, Shield, CreditCard } from "lucide-react";

export default function SettingsPage() {
    // Use DashboardSettings to avoid conflict
    const t = useTranslations("DashboardSettings");
    const tCommon = useTranslations("Common");
    const tLegal = useTranslations("Legal");

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>

            {/* Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("preferences")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label>{tCommon("language")}</Label>
                        <LanguageSelect />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>{tCommon("theme")}</Label>
                        <ModeToggle />
                    </div>
                </CardContent>
            </Card>

            {/* Legal Links */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("legal")}</CardTitle>
                    <CardDescription>{t("legal_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1">
                    <Link href="/privacy-policy" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{tLegal("privacy")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="/terms-of-service" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{tLegal("terms")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="/refund-policy" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{tLegal("refund")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive">{t("danger_zone")}</CardTitle>
                    <CardDescription className="text-destructive/80">{t("delete_account_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <DeleteAccountButton />
                </CardContent>
            </Card>
        </div>
    );
}