import { getPlans } from "@/actions/plans";
import { getTranslations } from "next-intl/server";
import { PlanDialog } from "@/components/admin/plan-dialog";
import { PlansTable } from "@/components/admin/plans-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
                <h1 className="text-3xl font-bold tracking-tight">{t("plan_management")}</h1>
            </div>

            <Tabs defaultValue="organizer" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="organizer">{t("organizer_plans")}</TabsTrigger>
                        <TabsTrigger value="manager">{t("manager_plans")}</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex gap-2">
                        <TabsContent value="organizer" className="mt-0">
                            <PlanDialog role="organizer" />
                        </TabsContent>
                        <TabsContent value="manager" className="mt-0">
                            <PlanDialog role="manager" />
                        </TabsContent>
                    </div>
                </div>

                <TabsContent value="organizer" className="space-y-4">
                    <PlansTable plans={organizerPlans} role="organizer" />
                </TabsContent>
                
                <TabsContent value="manager" className="space-y-4">
                    <PlansTable plans={managerPlans} role="manager" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
