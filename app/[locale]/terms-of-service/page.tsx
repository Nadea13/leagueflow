import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/legal/back-button";
import { PublicFooter } from "@/components/layout/public-footer";
import { getPlans } from "@/actions/admin/plans";

export default async function TermsOfServicePage() {
    const t = await getTranslations("TermsOfService");

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
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
                        {t("title")}
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-muted-foreground opacity-70">
                        {t("last_updated")}: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("acceptance_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("acceptance_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("service_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("service_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("accounts_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("accounts_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("content_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("content_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("payments_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("payments_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("ip_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("ip_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("liability_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("liability_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("termination_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("termination_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("law_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("law_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("accuracy_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("accuracy_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("fair_play_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("fair_play_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("availability_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("availability_desc")}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 group">
                    <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-2 h-8 bg-secondary/20 group-hover:bg-secondary transition-colors" />
                        {t("comm_title")}
                    </h2>
                    <div className="pl-5">
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed border-l-2 border-border/40 pl-4 py-1">
                            {t("comm_desc")}
                        </p>
                    </div>
                </section>
            </div>
            <PublicFooter managerPlans={managerPlans || []} organizerPlans={organizerPlans || []} />
        </div>
    );
}
