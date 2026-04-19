import { getTranslations } from "next-intl/server";

import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { LanguageSelect } from "@/components/layout/language-select";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { DeleteAccountButton } from "./delete-account-button";
import { ChevronRight, FileText, Shield, CreditCard, Sliders, Scale, AlertTriangle } from "lucide-react";


import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/profile-form";

export default async function SettingsPage() {
    // Use DashboardSettings to avoid conflict
    const t = await getTranslations("DashboardSettings");
    const tCommon = await getTranslations("Common");
    const tLegal = await getTranslations("Legal");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-secondary/20 pb-4 md:pb-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-foreground leading-none">{t("title")}</h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">{t("subtitle")}</p>
                </div>
            </div>

            {/* Profile Settings */}
            <ProfileForm user={user} />

            <div className="flex flex-col">
                {/* Preferences */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <Sliders className="h-5 w-5 text-secondary" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                            {t("preferences")}
                        </h3>
                    </div>
                    
                    <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors p-4 md:p-6 shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{tCommon("language")}</Label>
                                    <p className="text-[11px] text-muted-foreground/60 font-medium">{t("language_desc", { defaultValue: "Select your preferred language" })}</p>
                                </div>
                                <LanguageSelect />
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase italic tracking-widest text-secondary/70">{tCommon("theme")}</Label>
                                    <p className="text-[11px] text-muted-foreground/60 font-medium">{t("theme_desc", { defaultValue: "Choose between light and dark mode" })}</p>
                                </div>
                                <ModeToggle />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legal Links */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 my-4 md:my-6">
                        <Scale className="h-5 w-5 text-secondary" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                            {t("legal")}
                        </h3>
                    </div>
                    
                    <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                        <div className="grid gap-2">
                            <Link href="/privacy-policy" className="group/item flex items-center justify-between p-4 border border-transparent hover:border-border/40 bg-muted/5 hover:bg-background transition-all">
                                <div className="flex items-center gap-4">
                                    <Shield className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-secondary transition-colors" />
                                    <span className="font-black uppercase italic text-xs tracking-tight">{tLegal("privacy")}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-secondary group-hover/item:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/terms-of-service" className="group/item flex items-center justify-between p-4 border border-transparent hover:border-border/40 bg-muted/5 hover:bg-background transition-all">
                                <div className="flex items-center gap-4">
                                    <FileText className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-secondary transition-colors" />
                                    <span className="font-black uppercase italic text-xs tracking-tight">{tLegal("terms")}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-secondary group-hover/item:translate-x-1 transition-all" />
                            </Link>
                            <Link href="/refund-policy" className="group/item flex items-center justify-between p-4 border border-transparent hover:border-border/40 bg-muted/5 hover:bg-background transition-all">
                                <div className="flex items-center gap-4">
                                    <CreditCard className="h-5 w-5 text-muted-foreground/60 group-hover/item:text-secondary transition-colors" />
                                    <span className="font-black uppercase italic text-xs tracking-tight">{tLegal("refund")}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-secondary group-hover/item:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 my-4 md:my-6">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-destructive">
                            {t("danger_zone")}
                        </h3>
                    </div>
                    
                    <div className="bg-destructive/[0.02] border border-destructive/10 rounded-none relative overflow-hidden group hover:bg-destructive/[0.04] transition-colors p-4 md:p-6">
                        <div className="absolute top-0 left-0 w-1 h-full bg-destructive/20 group-hover:bg-destructive/40 transition-colors" />
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h4 className="text-lg font-black uppercase italic tracking-tight text-destructive/90">{t("delete_account")}</h4>
                                <p className="text-xs font-medium text-muted-foreground max-w-md">{t("delete_account_desc")}</p>
                            </div>
                            <DeleteAccountButton email={user?.email || ""} />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Version Info */}
            <div className="mt-8 mb-4 flex justify-center items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                    {t("version")} 0.1.1
                </span>
            </div>
        </div>
    );
}
