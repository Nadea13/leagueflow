import { getPlans } from "@/actions/admin/plans";
import { getTranslations } from "next-intl/server";
import { PlanDialog } from "@/components/admin/plan-dialog";
import { PlansTable } from "@/components/admin/plans-table";
import { AdminPricingTabs } from "@/components/admin/pricing-tabs";

export default async function AdminPricingPage() {
    const [managerPlansRes, organizerPlansRes] = await Promise.all([
        getPlans({ role: 'manager' }),
        getPlans({ role: 'organizer' })
    ]);

    const managerPlans = managerPlansRes.data || [];
    const organizerPlans = organizerPlansRes.data || [];
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
                        {t("plan_management")}
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Pricing Administration
                    </p>
                </div>
            </div>

            <AdminPricingTabs 
                managerPlans={managerPlans} 
                organizerPlans={organizerPlans} 
                translations={{
                    organizer_plans: t("organizer_plans"),
                    manager_plans: t("manager_plans")
                }}
            />
        </div>
    );
}
