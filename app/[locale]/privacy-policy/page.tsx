import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/legal/back-button";
import { PublicFooter } from "@/components/layout/public-footer";
import { getPlans } from "@/actions/admin/plans";

export default async function PrivacyPolicyPage() {
    const t = await getTranslations("PrivacyPolicy");

    // Fetch plans for footer
    const [
        { data: managerPlans },
        { data: organizerPlans }
    ] = await Promise.all([
        getPlans({ role: 'manager' }),
        getPlans({ role: 'organizer' })
    ]);
    
    return (
        <div className="flex flex-col min-h-screen">
            <div className="container mx-auto max-w-4xl py-8 space-y-8 md:py-12 flex-1">
                <BackButton />
                <div className="space-y-2 border-b-2 border-secondary/20 pb-6">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-foreground leading-none">
                        {t("title")}
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                        {t("last_updated")}: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("intro_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("intro_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("data_collect_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <ul className="grid gap-3 pl-5 border-l-2 border-border/40 py-1">
                            {[
                                t("data_identity"),
                                t("data_contact"),
                                t("data_technical"),
                                t("data_usage")
                            ].map((item, index) => (
                                <li key={index} className="flex items-center gap-3 text-sm font-medium text-muted-foreground group/item">
                                    <div className="w-1.5 h-1.5 bg-secondary/40 rounded-none transform rotate-45 group-hover/item:bg-secondary transition-colors" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("how_use_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("how_use_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("cookies_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("cookies_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("retention_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("retention_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("rights_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("rights_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("security_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("security_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("contact_title")}
                    </h2>
                    <div className="pl-5 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("contact_desc")}
                        </p>
                    </div>
                </section>
            </div>
            <PublicFooter managerPlans={managerPlans || []} organizerPlans={organizerPlans || []} />
        </div>
    );
}
