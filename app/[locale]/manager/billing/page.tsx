import { getTranslations } from "next-intl/server";
import { BillingPageContent } from "@/components/billing/billing-page-content";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Billing & Subscription",
    description: "Manage your subscription plan, upgrade to Pro, and view payment history.",
};

// ==========================================
// EDIT PLANS HERE
// ==========================================
const HARDCODED_PLANS = [
    {
        id: 'fallback-starter',
        name: 'Manager Starter',
        description: ['1 Team limit', 'Basic Player Management', 'Community Support'],
        price: 0,
        discounted_price: null,
        duration: 'lifetime',
        max_teams: 1,
        max_players_per_team: 14,
        support_level: 'Community',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-manager-pro',
        name: 'Manager Pro',
        description: ['Unlimited team creation', 'Manage multiple squads', 'Advanced Team Management', 'Standard Support'],
        price: 190,
        discounted_price: null,
        duration: 'monthly',
        max_teams: 0,
        max_players_per_team: 0,
        support_level: 'Standard',
        recommended: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

const SAMPLE_TOURNAMENTS: any[] = [];

// ==========================================
// EDIT HISTORY HERE
// ==========================================
const SAMPLE_HISTORY: any[] = [];

export default async function BillingPage() {
    const t = await getTranslations("Billing");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // 1. Fetch real payment history
    const { data: history } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Hardcoded logic
    const userPlan = 'free'; // Set to 'manager_pro' to test Pro state
    const daysRemaining = null;
    const isExpired = false;

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-secondary/20 pb-4 md:pb-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase leading-none">{t("title")}</h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">{t("description")}</p>
                </div>
            </div>

            <BillingPageContent
                tournaments={[]}
                initialHistory={history || []}
                userPlan={userPlan}
                plans={HARDCODED_PLANS as any}
                daysRemaining={daysRemaining}
                isExpired={isExpired}
            />
        </div>
    );
}
