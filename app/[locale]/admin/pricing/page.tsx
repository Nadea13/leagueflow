import { getPlans } from "@/actions/admin/plans";
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
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
                        {t("plan_management")}
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Pricing Administration
                    </p>
                </div>
            </div>

            <Tabs defaultValue="organizer" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/30 border border-border rounded-none p-1 h-auto">
                        <TabsTrigger value="organizer" className="rounded-none text-[10px] font-black tracking-[0.15em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_15px_rgba(0,196,154,0.2)] px-4 py-2">
                            {t("organizer_plans")}
                        </TabsTrigger>
                        <TabsTrigger value="manager" className="rounded-none text-[10px] font-black tracking-[0.15em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_15px_rgba(0,196,154,0.2)] px-4 py-2">
                            {t("manager_plans")}
                        </TabsTrigger>
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
