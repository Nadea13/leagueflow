"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { PaymentSection } from "@/components/billing/payment-section";
import { BillingHistory } from "@/components/billing/billing-history";
import { Separator } from "@/components/ui/separator";
import { PaymentRecord } from "@/actions/common/billing/general";
import { Plan } from "@/types";
import { CreditCard, AlertCircle, Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface BillingPageContentProps {
    tournaments: { id: string; name: string; status: string; plan?: string | null; }[] | null;
    initialHistory: PaymentRecord[];
    userPlan: string;
    plans: Plan[];
    daysRemaining?: number | null;
    isExpired?: boolean;
}

export function BillingPageContent({ tournaments, initialHistory, userPlan, plans, daysRemaining, isExpired }: BillingPageContentProps) {
    const t = useTranslations("Billing");
    const router = useRouter();
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
    const [history, setHistory] = useState<PaymentRecord[]>(initialHistory);

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        setTimeout(() => {
            document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handlePaymentSuccess = async () => {
        // Since data is hardcoded, we just refresh the router state
        router.refresh();
    };

    // Find selected product to pass plan details if needed (simplified for now as PaymentSection handles its own logic usually, 
    // or we might need to update PaymentSection to take a product ID instead of 'free'|'monthly' etc)
    // NOTE: PaymentSection currently expects a specific string enum. We need to check if we need to refactor PaymentSection.
    // For now, let's pass the product ID and see if we can adapt PaymentSection later or if it needs to change.

    // Assuming PaymentSection needs 'monthly' | 'yearly' | 'tournament' strings.
    // We should probably map the selected product back to these if possible, OR refactor PaymentSection.
    // Given the constraints, let's see what PaymentSection expects. 
    // If I cannot check PaymentSection code right now, I will assume I need to pass the selected product object or ID.
    // Update: I will cast or handle it. For now, let's update this file.

    // Actually, let's map the product to the type PaymentSection expects if we can, or just pass the ID if we update PaymentSection.
    // Let's assume for this step we just render the PricingCards.

    return (
        <div className="space-y-4 md:space-y-6">
            <section>
                {(isExpired || (daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7 && daysRemaining > 0)) && (
                    <div className="mb-4 md:mb-6 p-4 rounded-xl border flex gap-3 items-start bg-red-50 text-red-900 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900">
                        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-600 dark:text-red-500" />
                        <div className="flex flex-col gap-1">
                            <h5 className="font-semibold leading-none tracking-tight">
                                {isExpired ? t("subscription_expired_title", { defaultValue: "Subscription Expired" }) : t("subscription_expiring_title", { defaultValue: "Subscription Expiring Soon" })}
                            </h5>
                            <p className="text-sm leading-relaxed opacity-90">
                                {isExpired
                                    ? t("subscription_expired_desc", { defaultValue: "Your subscription has expired. Please manual renew your plan by generating a new PromptPay QR code below." })
                                    : t("subscription_expiring_desc", { defaultValue: `Your subscription will expire in ${daysRemaining} days. Since we switched to manual PromptPay Verification, please manually renew your plan below.` })}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <Trophy className="h-5 w-5 text-secondary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">
                        {t("plansTitle")}
                    </h3>
                </div>
                
                <div className="space-y-4 md:space-y-6">
                    <div className="space-y-2 md:space-y-3">
                        <PricingCards
                            plans={plans as any[]}
                            onSelectPlan={handleSelectPlan}
                            currentPlan={selectedPlanId}
                            activePlan={userPlan}
                            tournaments={tournaments}
                            selectedTournamentId={selectedTournamentId}
                            onTournamentChange={setSelectedTournamentId}
                        />
                    </div>
                </div>
            </section>

            <Separator className="bg-border/40" />

            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                <section id="payment-section">
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <CreditCard className="h-5 w-5 text-secondary" />
                        <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">
                            {selectedPlanId ? t("payment_details") : t("paymentMethodTitle")}
                        </h3>
                    </div>
                    {selectedPlanId && plans.find(p => p.id === selectedPlanId) ? (
                        <PaymentSection
                            plan={plans.find(p => p.id === selectedPlanId)!}
                            tournaments={tournaments}
                            onCancel={() => setSelectedPlanId(null)}
                            onSuccess={handlePaymentSuccess}
                            externalSelectedTournament={selectedTournamentId}
                        />
                    ) : (
                        <EmptyState
                            title={t("select_plan_title", { defaultValue: "Select a Plan" })}
                            description={t("select_plan_prompt")}
                            icon={CreditCard}
                            action={<div />}
                        />
                    )}
                </section>
                <section>
                    <BillingHistory history={history} />
                </section>
            </div>
        </div>
    );
}
