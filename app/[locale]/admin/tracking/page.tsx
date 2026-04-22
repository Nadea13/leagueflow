import { getAuditLogsWithUsers } from "@/app/[locale]/admin/actions";
import { TrackingDashboard } from "@/components/admin/tracking-dashboard";
import { TrackingAnalytics } from "@/components/admin/tracking-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Customer Tracking | Admin Dashboard",
    description: "Monitor customer behavior and feature usage.",
};

export default async function AdminTrackingPage() {
    const auditLogs = await getAuditLogsWithUsers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-foreground">
                        User Activity Insights
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Analytics & Behavior Monitoring
                    </p>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-muted/50 border border-border p-1 h-12">
                    <TabsTrigger value="overview" className="gap-2 px-6">
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Overview Analytics</span>
                    </TabsTrigger>
                    <TabsTrigger value="journey" className="gap-2 px-6">
                        <Users className="h-4 w-4" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Individual Journey</span>
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <TrackingAnalytics logs={auditLogs} />
                </TabsContent>
                
                <TabsContent value="journey" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <TrackingDashboard initialLogs={auditLogs} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
