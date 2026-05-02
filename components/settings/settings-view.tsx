import { getTranslations } from "next-intl/server";
import { User } from "@supabase/supabase-js";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DeleteAccountButton } from "./delete-account-button";
import { ChevronRight, FileText, Shield, CreditCard, Sliders, Scale, AlertTriangle } from "lucide-react";
import { ProfileForm } from "./profile-form";

interface SettingsViewProps {
    user: User;
}

export async function SettingsView({ user }: SettingsViewProps) {
    const t = await getTranslations("DashboardSettings");
    const tCommon = await getTranslations("Common");
    const tLegal = await getTranslations("Legal");

    return (
        <div className="flex flex-col gap-2 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-none">{t("title")}</h1>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-muted-foreground mt-2 opacity-70">{t("subtitle")}</p>
                </div>
            </div>

            {/* Profile Settings */}
            <ProfileForm user={user} />

            <div className="flex flex-col space-y-2 md:space-y-6">
                {/* Preferences */}
                <div className="bg-card border p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Sliders className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-black tracking-tighter text-foreground">
                            {t("preferences")}
                        </h3>
                    </div>
                    
                    <div className="relative overflow-hidden group transition-colors">
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <Label className="text-xs font-black tracking-widest text-primary">{tCommon("language")}</Label>
                                    <p className="text-xs text-muted-foreground/60 font-medium">{t("language_desc", { defaultValue: "Select your preferred language" })}</p>
                                </div>
                                <LanguageToggle />
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <Label className="text-xs font-black tracking-widest text-primary">{tCommon("theme")}</Label>
                                    <p className="text-xs text-muted-foreground/60 font-medium">{t("theme_desc", { defaultValue: "Choose between light and dark mode" })}</p>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legal Links */}
                <div className="bg-card border p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Scale className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-black tracking-tighter text-foreground">
                            {t("legal")}
                        </h3>
                    </div>
                    
                    <div className="relative overflow-hidden group transition-colors">
                        <div className="grid gap-2">
                            <Link href="/privacy-policy" className="group/item flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                <div className="flex items-center gap-4">
                                    <Shield className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                                    <span className="font-black text-xs tracking-tight">{tLegal("privacy")}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                            </Link>
                            <Link href="/terms-of-service" className="group/item flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                <div className="flex items-center gap-4">
                                    <FileText className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                                    <span className="font-black text-xs tracking-tight">{tLegal("terms")}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                            </Link>
                            <Link href="/refund-policy" className="group/item flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                <div className="flex items-center gap-4">
                                    <CreditCard className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                                    <span className="font-black text-xs tracking-tight">{tLegal("refund")}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-destructive/10 border border-destructive/40 p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-2 md:gap-3">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <h3 className="text-2xl font-black tracking-tighter text-destructive">
                            {t("danger_zone")}
                        </h3>
                    </div>
                    
                    <div className="relative overflow-hidden group transition-colors">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h4 className="text-xs font-black tracking-widest text-destructive">{t("delete_account")}</h4>
                                <p className="text-xs text-muted-foreground/60 font-medium">{t("delete_account_desc")}</p>
                            </div>
                            <DeleteAccountButton email={user?.email || ""} />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Version Info */}
            <div className="flex justify-center items-center gap-2">
                <span className="text-xs font-black tracking-widest text-muted-foreground">
                    {t("version")} 0.2.1
                </span>
            </div>
        </div>
    );
}
