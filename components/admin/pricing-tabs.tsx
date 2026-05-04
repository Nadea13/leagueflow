"use client";

import { useState } from "react";
import { Tab } from "@/components/ui/tab";
import { PlansTable } from "@/components/admin/plans-table";
import { PlanDialog } from "@/components/admin/plan-dialog";
import { Shield, User } from "lucide-react";

import { Plan } from "@/types";

interface AdminPricingTabsProps {
    managerPlans: Plan[];
    organizerPlans: Plan[];
    translations: {
        organizer_plans: string;
        manager_plans: string;
    };
}

export function AdminPricingTabs({ managerPlans, organizerPlans, translations }: AdminPricingTabsProps) {
    const [activeTab, setActiveTab] = useState<"organizer" | "manager">("organizer");

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <Tab
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as "organizer" | "manager")}
                    options={[
                        { label: translations.organizer_plans, value: "organizer", icon: Shield },
                        { label: translations.manager_plans, value: "manager", icon: User }
                    ]}
                />
                
                <div className="flex gap-2">
                    {activeTab === "organizer" ? (
                        <PlanDialog role="organizer" />
                    ) : (
                        <PlanDialog role="manager" />
                    )}
                </div>
            </div>

            {activeTab === "organizer" ? (
                <div className="space-y-4">
                    <PlansTable plans={organizerPlans} role="organizer" />
                </div>
            ) : (
                <div className="space-y-4">
                    <PlansTable plans={managerPlans} role="manager" />
                </div>
            )}
        </div>
    );
}
