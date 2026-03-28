"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { PaymentSection } from "@/components/billing/payment-section";
import { BillingHistory } from "@/components/billing/billing-history";
import { Separator } from "@/components/ui/separator";
import { PaymentRecord } from "@/app/[locale]/dashboard/billing/actions";
import { Plan } from "@/types";
import { CreditCard, AlertCircle } from "lucide-react";

interface BillingPageContentProps {
    tournaments: { id: string; name: string; status: string; plan?: string | null; }[] | null;
    initialHistory: PaymentRecord[];
    onRefreshHistory: () => Promise<PaymentRecord[]>;
    userPlan: string;
    plans: Plan[];
    daysRemaining?: number | null;
    isExpired?: boolean;
}

export function BillingPageContent({ tournaments, initialHistory, onRefreshHistory, userPlan, plans, daysRemaining, isExpired }: BillingPageContentProps) {
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
        const newHistory = await onRefreshHistory();
        setHistory(newHistory);
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
        <div className="space-y-8">
            <section>
                {(isExpired || (daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7 && daysRemaining > 0)) && (
                    <div className="mb-6 p-4 rounded-xl border flex gap-3 items-start bg-red-50 text-red-900 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900">
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
                <h4 className="text-md font-semibold mb-4">{t("plansTitle")}</h4>
                
                <div className="space-y-10">
                    <div className="space-y-4">
                        <PricingCards
                            plans={plans}
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

            <Separator />

            <div className="grid gap-10 md:grid-cols-2">
                <section id="payment-section">
                    <h4 className="text-md font-semibold mb-4">
                        {selectedPlanId ? t("payment_details") : t("paymentMethodTitle")}
                    </h4>
                    {selectedPlanId && plans.find(p => p.id === selectedPlanId) ? (
                        <PaymentSection
                            plan={plans.find(p => p.id === selectedPlanId)!}
                            tournaments={tournaments}
                            onCancel={() => setSelectedPlanId(null)}
                            onSuccess={handlePaymentSuccess}
                            externalSelectedTournament={selectedTournamentId}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                            <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                                <CreditCard className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-medium text-muted-foreground">{t("select_plan_prompt")}</h3>
                        </div>
                    )}
                </section>
                <section>
                    <h4 className="text-md font-semibold mb-4">{t("historyTitle")}</h4>
                    <BillingHistory history={history} />
                </section>
            </div>
        </div>
    );
}
