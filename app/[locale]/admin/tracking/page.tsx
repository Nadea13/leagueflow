import { getAuditLogsWithUsers } from "@/app/[locale]/admin/actions";
import { TrackingDashboard } from "@/components/admin/tracking-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Customer Tracking | Admin Dashboard",
    description: "Monitor customer behavior and feature usage.",
};

export default async function AdminTrackingPage() {
    const auditLogs = await getAuditLogsWithUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                        Customer Tracking
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Behavior & Usage Analytics
                    </p>
                </div>
            </div>

            <TrackingDashboard initialLogs={auditLogs} />
        </div>
    );
}
