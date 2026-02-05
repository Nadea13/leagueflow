import { getTranslations } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { BillingPageContent } from "@/components/billing/billing-page-content";
import { getPaymentHistory } from "./actions";

export default async function BillingPage() {
    const t = await getTranslations("Billing");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // Fetch user's tournaments
    const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // Fetch payment history
    const history = await getPaymentHistory();

    // Check active subscription
    let userPlan = 'free';
    const { data: subscription } = await supabase
        .from("payments")
        .select("plan, subscription_expires_at")
        .eq("user_id", user.id)
        .eq("status", "success")
        .in("plan", ["monthly", "yearly"])
        .is("tournament_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (subscription) {
        const now = new Date();
        const expiresAt = subscription.subscription_expires_at
            ? new Date(subscription.subscription_expires_at)
            : null;

        userPlan = (expiresAt && now > expiresAt) ? 'free' : (subscription.plan || 'free');
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground">{t("description")}</p>
            </div>

            <BillingPageContent
                tournaments={tournaments || []}
                initialHistory={history}
                onRefreshHistory={getPaymentHistory}
                userPlan={userPlan}
            />
        </div>
    );
}
