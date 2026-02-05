"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PricingTable } from "@/components/billing/pricing-table";
import { PaymentSection } from "@/components/billing/payment-section";
import { BillingHistory } from "@/components/billing/billing-history";
import { Separator } from "@/components/ui/separator";
import { PaymentRecord } from "@/app/[locale]/dashboard/billing/actions";

interface BillingPageContentProps {
    tournaments: { id: string; name: string; status: string; }[] | null;
    initialHistory: PaymentRecord[];
    onRefreshHistory: () => Promise<PaymentRecord[]>;
    userPlan: string;
}

export function BillingPageContent({ tournaments, initialHistory, onRefreshHistory, userPlan }: BillingPageContentProps) {
    const t = useTranslations("Billing");
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'tournament' | 'monthly' | 'yearly' | null>(null);
    const [history, setHistory] = useState<PaymentRecord[]>(initialHistory);

    const handleSelectPlan = (plan: 'free' | 'tournament' | 'monthly' | 'yearly') => {
        if (plan === 'free') return;
        setSelectedPlan(plan);
        setTimeout(() => {
            document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handlePaymentSuccess = async () => {
        const newHistory = await onRefreshHistory();
        setHistory(newHistory);
    };

    return (
        <div className="space-y-8">
            <section>
                <h4 className="text-md font-semibold mb-4">{t("plansTitle")}</h4>
                <PricingTable
                    tournaments={tournaments}
                    onSelectPlan={handleSelectPlan}
                    currentPlan={selectedPlan}
                    activePlan={userPlan}
                />
            </section>

            <Separator />

            <div className="grid gap-10 md:grid-cols-2">
                <section id="payment-section">
                    <h4 className="text-md font-semibold mb-4">
                        {selectedPlan ? t("payment_details") || "Payment Details" : t("paymentMethodTitle")}
                    </h4>
                    {selectedPlan && selectedPlan !== 'free' ? (
                        <PaymentSection
                            plan={selectedPlan}
                            tournaments={tournaments}
                            onCancel={() => setSelectedPlan(null)}
                            onSuccess={handlePaymentSuccess}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/10 text-center text-muted-foreground border-dashed">
                            <p>{t("select_plan_prompt") || "Select a plan above to view payment options."}</p>
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
