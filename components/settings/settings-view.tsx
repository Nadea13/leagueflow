import { getTranslations } from "next-intl/server";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/types";
import { Link } from "@/i18n/routing";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DeleteAccountButton } from "./delete-account-button";
import { ChevronRight, CreditCard, Sliders, Scale, AlertTriangle, User as UserIcon } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { BillingTab } from "./billing-tab";
import { cn } from "@/lib/utils";
import { SettingsTourButton } from "./settings-tour-button";
import { Header } from "../ui/header";

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
            <div className="flex items-center justify-between" id="tour-settings-header">
                <div>
                    <Header level={2} className="text-2xl md:text-3xl font-black tracking-tight">
                        {t("title")}
                    </Header>
                </div>
                <SettingsTourButton />
            </div>

            <div className="flex flex-col gap-2 md:gap-4 ">
                {/* Settings Tabs Navigation */}
                <div className="flex p-1 rounded-sm gap-1 border border-border h-auto w-full md:w-max bg-card overflow-x-auto scrollbar-hide" id="tour-settings-tabs">
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
                        href="/dashboard/settings?tab=billing"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black transition-all border-none flex-1 md:flex-none whitespace-nowrap",
                            activeTab === 'billing'
                                ? "bg-primary text-primary-foreground rounded hover:text-primary-foreground hover:bg-primary"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{t("billing")}</span>
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
                <main className="flex-1 w-full space-y-2 md:space-y-4" id="tour-settings-content">
                    <div>
                        {activeTab === 'profile' && (
                            <ProfileForm user={user} profile={profile} />
                        )}

                        {activeTab === 'billing' && (
                            <BillingTab />
                        )}

                        {activeTab === 'preferences' && (
                            <div className="space-y-1 md:space-y-2 bg-card p-2 md:p-4 rounded-sm border">                                
                                <div className="space-y-1 md:space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Header level={4}>{tCommon("language")}</Header>
                                            <p className="text-xs text-muted-foreground/60 font-medium">{t("language_desc", { defaultValue: "Select your preferred language" })}</p>
                                        </div>
                                        <LanguageToggle />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Header level={4}>{tCommon("theme")}</Header>
                                            <p className="text-xs text-muted-foreground/60 font-medium">{t("theme_desc", { defaultValue: "Choose between light and dark mode" })}</p>
                                        </div>
                                        <ThemeToggle />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'legal' && (
                            <div className="space-y-1 md:space-y-2 bg-card p-2 md:p-4 rounded-sm border">                                
                                <div className="grid gap-1 md:gap-2">
                                    <Link href="/privacy-policy" className="group/item rounded-sm flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                        <div className="flex items-center gap-4">
                                            <Header level={4}>{tLegal("privacy")}</Header>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                                    </Link>
                                    <Link href="/terms-of-service" className="group/item rounded-sm flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                        <div className="flex items-center gap-4">
                                            <Header level={4}>{tLegal("terms")}</Header>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                                    </Link>
                                    <Link href="/refund-policy" className="group/item rounded-sm flex items-center justify-between border hover:border-primary/40 p-2 md:p-3 transition-all">
                                        <div className="flex items-center gap-4">
                                            <Header level={4}>{tLegal("refund")}</Header>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover/item:text-primary transition-all" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div className=" bg-card p-2 md:p-4 rounded-sm border">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                    <div className="space-y-1">
                                        <Header level={4} className="text-destructive">{t("delete_account")}</Header>
                                        <p className="text-xs text-muted-foreground font-medium">{t("delete_account_desc")}</p>
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
                    {t("version")} 1.0.1
                </span>
            </div>
        </div>
    );
}
