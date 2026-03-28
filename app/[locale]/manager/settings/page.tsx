import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <div className="flex flex-col gap-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
                <div>
                    <Badge variant="secondary" className="mb-4">Account Control</Badge>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">{t("title")}</h1>
                    <p className="text-muted-foreground mt-3 text-sm max-w-xl font-medium tracking-tight">
                        {t("subtitle") || "Manage your account preferences, profile, and security settings."}
                    </p>
                </div>
            </div>

            {/* Profile Settings */}
            <div className="relative group transition-all duration-500">
                <div className="absolute -inset-1 bg-secondary/5 blur-xl group-hover:bg-secondary/10 transition-all" />
                <ProfileForm user={user} />
            </div>

            {/* Preferences */}
            <div className="space-y-8 border border-border rounded-none p-10 bg-muted/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary/20" />
                <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-foreground mb-2 flex flex-row items-center gap-3">
                        <div className="p-1.5 bg-muted border border-border">
                            <Sliders className="h-5 w-5 text-secondary" />
                        </div>
                        {t("preferences")}
                    </h3>
                </div>
                <div className="grid gap-8 sm:grid-cols-2">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/40">{tCommon("language")}</Label>
                        <LanguageSelect />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/40">{tCommon("theme")}</Label>
                        <ModeToggle />
                    </div>
                </div>
            </div>

            {/* Legal Links */}
            <div className="space-y-8 border border-border rounded-none p-10 bg-muted/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary/20" />
                <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-foreground mb-2 flex flex-row items-center gap-3">
                        <div className="p-1.5 bg-muted border border-border">
                            <Scale className="h-5 w-5 text-secondary" />
                        </div>
                        {t("legal")}
                    </h3>
                    <p className="text-sm text-muted-foreground/60 font-medium">{t("legal_desc")}</p>
                </div>
                <div className="grid gap-2">
                    <Link href="/privacy-policy" className="flex items-center justify-between p-5 border border-border bg-muted/20 hover:bg-secondary/10 hover:border-secondary/30 transition-all group/link">
                        <div className="flex items-center gap-4">
                            <Shield className="h-5 w-5 text-muted-foreground/40 group-hover/link:text-secondary transition-colors" />
                            <span className="font-black italic uppercase tracking-widest text-[11px] text-foreground/80">{tLegal("privacy")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover/link:text-secondary group-hover/link:translate-x-1 transition-all" />
                    </Link>
                    <Link href="/terms-of-service" className="flex items-center justify-between p-5 border border-border bg-muted/20 hover:bg-secondary/10 hover:border-secondary/30 transition-all group/link">
                        <div className="flex items-center gap-4">
                            <FileText className="h-5 w-5 text-muted-foreground/40 group-hover/link:text-secondary transition-colors" />
                            <span className="font-black italic uppercase tracking-widest text-[11px] text-foreground/80">{tLegal("terms")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover/link:text-secondary group-hover/link:translate-x-1 transition-all" />
                    </Link>
                    <Link href="/refund-policy" className="flex items-center justify-between p-5 border border-border bg-muted/20 hover:bg-secondary/10 hover:border-secondary/30 transition-all group/link">
                        <div className="flex items-center gap-4">
                            <CreditCard className="h-5 w-5 text-muted-foreground/40 group-hover/link:text-secondary transition-colors" />
                            <span className="font-black italic uppercase tracking-widest text-[11px] text-foreground/80">{tLegal("refund")}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover/link:text-secondary group-hover/link:translate-x-1 transition-all" />
                    </Link>
                </div>
            </div>

            {/* Danger Zone */}
            <Card className="border-red-500/20 bg-red-500/[0.02] p-0 overflow-hidden">
                <div className="bg-red-500/10 px-10 py-6 border-b border-red-500/10">
                    <CardHeader className="p-0">
                        <CardTitle className="text-red-500 flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter">
                            <AlertTriangle className="h-6 w-6" />
                            {t("danger_zone")}
                        </CardTitle>
                        <CardDescription className="text-red-500/50 font-medium">{t("delete_account_desc")}</CardDescription>
                    </CardHeader>
                </div>
                <CardContent className="p-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                        <div>
                            <h4 className="font-black italic uppercase tracking-widest text-xs text-red-500/80 mb-1">{t("delete_account")}</h4>
                            <p className="text-sm text-muted-foreground/60 font-medium">Permanently remove all your data and access.</p>
                        </div>
                        <DeleteAccountButton email={user?.email || ""} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}