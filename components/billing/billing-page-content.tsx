"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { PaymentSection } from "@/components/billing/payment-section";
import { BillingHistory } from "@/components/billing/billing-history";
import { Separator } from "@/components/ui/separator";
import { PaymentRecord } from "@/app/[locale]/dashboard/billing/actions";
import { Product } from "@/types";
import { CreditCard } from "lucide-react";

interface BillingPageContentProps {
    tournaments: { id: string; name: string; status: string; }[] | null;
    initialHistory: PaymentRecord[];
    onRefreshHistory: () => Promise<PaymentRecord[]>;
    userPlan: string;
    products: Product[];
}

export function BillingPageContent({ tournaments, initialHistory, onRefreshHistory, userPlan, products }: BillingPageContentProps) {
    const t = useTranslations("Billing");
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
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
                <h4 className="text-md font-semibold mb-4">{t("plansTitle")}</h4>
                <PricingCards
                    products={products}
                    onSelectPlan={handleSelectPlan}
                    currentPlan={selectedPlanId}
                    activePlan={userPlan}
                />
            </section>

            <Separator />

            <div className="grid gap-10 md:grid-cols-2">
                <section id="payment-section">
                    <h4 className="text-md font-semibold mb-4">
                        {selectedPlanId ? t("payment_details") : t("paymentMethodTitle")}
                    </h4>
                    {selectedPlanId && products.find(p => p.id === selectedPlanId) ? (
                        <PaymentSection
                            product={products.find(p => p.id === selectedPlanId)!}
                            tournaments={tournaments}
                            onCancel={() => setSelectedPlanId(null)}
                            onSuccess={handlePaymentSuccess}
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
