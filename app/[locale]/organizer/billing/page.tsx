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
        id: 'fallback-free',
        name: 'Free',
        description: ['Limit 8 teams per tournament', 'Basic stats', 'Community Support'],
        price: 0,
        discounted_price: null,
        duration: 'lifetime',
        max_tournaments: 0,
        max_teams_per_tournament: 8,
        format_support: 'Basic',
        invite_enabled: false,
        register_enabled: true,
        stats_support: 'Basic',
        support_level: 'Community',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-tournament',
        name: 'Single Tournament',
        description: ['Single tournament use', 'All tournament formats', 'Advanced Stats & Goals', 'Standard Support', 'Custom Branding'],
        price: 990,
        discounted_price: 590,
        duration: 'lifetime',
        max_tournaments: 1,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Standard',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-monthly',
        name: 'Organizer Monthly Pro',
        description: ['Unlimited tournaments', 'All pro features included', 'Priority 24/7 Support', 'Cancel anytime'],
        price: 1290,
        discounted_price: 890,
        duration: 'monthly',
        max_tournaments: 0,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'fallback-yearly',
        name: 'Organizer Yearly Pro',
        description: ['Save 2 months', 'Unlimited everything', 'VIP Priority Support', 'Advance Analytics'],
        price: 12900,
        discounted_price: 8900,
        duration: 'yearly',
        max_tournaments: 0,
        max_teams_per_tournament: 0,
        format_support: 'All',
        invite_enabled: true,
        register_enabled: true,
        stats_support: 'Advanced',
        support_level: 'Priority',
        recommended: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

const SAMPLE_TOURNAMENTS: any[] = [];
export default async function BillingPage() {
    const t = await getTranslations("Billing");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // 1. Fetch real tournaments
    const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, name, status, plan')
        .eq('organizer_id', user.id);

    // 2. Fetch real payment history
    const { data: history } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // 3. Subscription status logic (can be real or simplified)
    const userPlan = 'free'; // This could also be fetched from profiles if needed
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
                tournaments={tournaments || []}
                initialHistory={history || []}
                userPlan={userPlan}
                plans={HARDCODED_PLANS as any}
                daysRemaining={daysRemaining}
                isExpired={isExpired}
            />
        </div>
    );
}
