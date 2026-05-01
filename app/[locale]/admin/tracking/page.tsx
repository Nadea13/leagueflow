import { getAuditLogsWithUsers } from "@/app/[locale]/admin/actions";
import { TrackingDashboard } from "@/components/admin/tracking-dashboard";
import { TrackingAnalytics } from "@/components/admin/tracking-analytics";
import { AdminTrackingTabs } from "@/components/admin/tracking-tabs";

export default async function AdminTrackingPage() {
    const auditLogs = await getAuditLogsWithUsers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground">
                        User Activity Insights
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Analytics & Behavior Monitoring
                    </p>
                </div>
            </div>

            <AdminTrackingTabs auditLogs={auditLogs} />
        </div>
    );
}
