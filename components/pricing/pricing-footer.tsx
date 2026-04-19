"use client";


import { useTranslations } from "next-intl";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PricingCards } from "./pricing-cards";
import { Plan } from "@/types";


interface PricingFooterProps {
    managerPlans: Plan[];
    organizerPlans: Plan[];
}

export function PricingFooter({ managerPlans, organizerPlans }: PricingFooterProps) {
    const t = useTranslations('Home');
    const tBilling = useTranslations('Billing');
    const tLanding = useTranslations('Landing');

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="hover:text-primary transition-colors flex items-center gap-2">
                    {t('view_pricing')}
                </button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto rounded-none border-border/40">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">
                        {tLanding('pricing_title')}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-12">
                    {/* Manager Plans */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                            <span className="w-2 h-6 bg-primary"></span>
                            {tBilling('manager_plans')}
                        </h3>
                        <PricingCards plans={managerPlans as any[]} landingPageMode={true} />
                    </div>

                    {/* Organizer Plans */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold border-b pb-2 flex items-center gap-2">
                            <span className="w-2 h-6 bg-primary"></span>
                            {tBilling('organizer_plans')}
                        </h3>
                        <PricingCards plans={organizerPlans as any[]} landingPageMode={true} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
