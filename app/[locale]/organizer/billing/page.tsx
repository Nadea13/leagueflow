import { getTranslations } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { BillingPageContent } from "@/components/billing/billing-page-content";
import { getPaymentHistory } from "./actions";
import { getDashboardTournaments } from "@/app/[locale]/dashboard/actions";
import { getPlans } from "@/actions/plans";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Billing & Subscription",
    description: "Manage your subscription plan, upgrade to Pro, and view payment history.",
};

export default async function BillingPage() {
    const t = await getTranslations("Billing");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // Fetch user's tournaments (owned only)
    const allTournaments = await getDashboardTournaments();
    const tournaments = allTournaments.filter(t => t.role === 'owner');

    // Fetch plans for organizer
    const { data: plans } = await getPlans({ role: 'organizer' });

    // Fetch payment history
    const history = await getPaymentHistory();

    // Check active subscription
    let userPlan = 'free';
    const { data: subscription } = await supabase
        .from("payments")
        .select("plan, subscription_expires_at")
        .eq("user_id", user.id)
        .eq("status", "success")
        .in("plan", ["monthly", "yearly", "manager_pro"])
        .is("tournament_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    let daysRemaining: number | null = null;
    let isExpired: boolean = false;

    if (subscription) {
        const now = new Date();
        const expiresAt = subscription.subscription_expires_at
            ? new Date(subscription.subscription_expires_at)
            : null;

        if (expiresAt) {
            const diffTime = expiresAt.getTime() - now.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysRemaining <= 0) {
                isExpired = true;
                userPlan = 'free';
            } else {
                userPlan = subscription.plan || 'free';
            }
        }
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-secondary/20 pb-4 md:pb-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">{t("title")}</h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">{t("description")}</p>
                </div>
            </div>

            <BillingPageContent
                tournaments={tournaments}
                initialHistory={history}
                onRefreshHistory={getPaymentHistory}
                userPlan={userPlan}
                plans={plans || []}
                daysRemaining={daysRemaining}
                isExpired={isExpired}
            />
        </div>
    );
}
