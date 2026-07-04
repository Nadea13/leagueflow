import { getTranslations } from "next-intl/server";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/types";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DeleteAccountButton } from "./delete-account-button";
import { ChevronRight, FileText, Shield, CreditCard, Sliders, Scale, AlertTriangle, User as UserIcon } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
    user: User;
    profile?: Profile;
    activeTab?: string;
}

export async function SettingsView({ user, profile, activeTab = "profile" }: SettingsViewProps) {
    const t = await getTranslations("DashboardSettings");
    const tCommon = await getTranslations("Common");
    const tLegal = await getTranslations("Legal");
    const tNav = await getTranslations("Nav");
    return (
        <div className="flex flex-col gap-2 md:gap-4 max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        {t("title")}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col gap-2 md:gap-4 ">
                {/* Settings Tabs Navigation */}
                <div className="flex p-1 rounded-sm gap-1 border border-border h-auto w-full md:w-max bg-card">
                    <Link
                        href="/dashboard/settings?tab=profile"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black transition-all border-none flex-1 md:flex-none whitespace-nowrap",
                            activeTab === 'profile'
                                ? "bg-primary text-primary-foreground rounded hover:text-primary-foreground hover:bg-primary"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <UserIcon className="h-3.5 w-3.5" />
                        <span>{tNav("profile") || "Profile"}</span>
                    </Link>

                    <Link
                        href="/dashboard/settings?tab=preferences"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black transition-all border-none flex-1 md:flex-none whitespace-nowrap",
                            activeTab === 'preferences'
                                ? "bg-primary text-primary-foreground rounded hover:text-primary-foreground hover:bg-primary"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>{t("preferences")}</span>
                    </Link>

                    <Link
                        href="/dashboard/settings?tab=legal"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black transition-all border-none flex-1 md:flex-none whitespace-nowrap",
                            activeTab === 'legal'
                                ? "bg-primary text-primary-foreground rounded hover:text-primary-foreground hover:bg-primary"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <Scale className="h-3.5 w-3.5" />
                        <span>{t("legal")}</span>
                    </Link>

                    <Link
                        href="/dashboard/settings?tab=danger"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black transition-all border-none flex-1 md:flex-none whitespace-nowrap",
                            activeTab === 'danger'
                                ? "bg-destructive text-destructive-foreground rounded hover:text-destructive-foreground hover:bg-destructive"
                                : "text-destructive hover:text-destructive"
                        )}
                    >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{t("danger_zone")}</span>
                    </Link>
                </div>

                {/* Settings Content Area */}
                <main className="flex-1 w-full space-y-2 md:space-y-4">
                    <div>
                        {activeTab === 'profile' && (
                            <ProfileForm user={user} profile={profile} />
                        )}

                        {activeTab === 'preferences' && (
                            <div className="space-y-1 md:space-y-2 bg-card p-2 md:p-4 rounded-xl border">                                
                                <div className="space-y-1 md:space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-black tracking-widest text-primary">{tCommon("language")}</Label>
                                            <p className="text-xs text-muted-foreground/60 font-medium">{t("language_desc", { defaultValue: "Select your preferred language" })}</p>
                                        </div>
                                        <LanguageToggle />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-black tracking-widest text-primary">{tCommon("theme")}</Label>
                                            <p className="text-xs text-muted-foreground/60 font-medium">{t("theme_desc", { defaultValue: "Choose between light and dark mode" })}</p>
                                        </div>
                                        <ThemeToggle />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'legal' && (
                            <div className="space-y-1 md:space-y-2 bg-card p-2 md:p-4 rounded-xl border">                                
                                <div className="grid gap-1 md:gap-2">
                                    <Link href="/privacy-policy" className="group/item rounded-sm flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className="w-full h-full rounded-full flex items-center justify-center bg-muted/10 text-muted-foreground/60 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all">
                                                    <Shield className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <span className="font-black text-xs tracking-tight">{tLegal("privacy")}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                                    </Link>
                                    <Link href="/terms-of-service" className="group/item rounded-sm flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className="w-full h-full rounded-full flex items-center justify-center bg-muted/10 text-muted-foreground/60 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <span className="font-black text-xs tracking-tight">{tLegal("terms")}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                                    </Link>
                                    <Link href="/refund-policy" className="group/item rounded-sm flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className="w-full h-full rounded-full flex items-center justify-center bg-muted/10 text-muted-foreground/60 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all">
                                                    <CreditCard className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <span className="font-black text-xs tracking-tight">{tLegal("refund")}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div className=" bg-card p-2 md:p-4 rounded-xl border">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black tracking-widest text-destructive">{t("delete_account")}</h4>
                                        <p className="text-xs text-muted-foreground/60 font-medium">{t("delete_account_desc")}</p>
                                    </div>
                                    <DeleteAccountButton email={user?.email || ""} />
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            {/* Version Info */}
            <div className="flex justify-center items-center gap-2 mt-6">
                <span className="text-xs font-black tracking-widest text-muted-foreground">
                    {t("version")} 0.1.0
                </span>
            </div>
        </div>
    );
}
