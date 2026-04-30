import { getTranslations } from "next-intl/server";
import { AdminAuditLogs } from "@/components/admin/audit-logs-table";
import { getAuditLogsWithUsers, getSupabaseAuthAuditLogs, getAdminStats } from "@/app/[locale]/admin/actions";
import { AdminStatsOverview } from "@/components/admin/admin-stats-overview";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Dashboard",
    description: "Platform administration — audit logs, user management, and system health.",
};

export default async function AdminDashboardPage() {
    // Parallel fetch for performance
    const [auditLogs, authLogs, stats] = await Promise.all([
        getAuditLogsWithUsers(),
        getSupabaseAuthAuditLogs(),
        getAdminStats()
    ]);

    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
                        {t("overview") || "Dashboard Overview"}
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Platform Administration
                    </p>
                </div>
            </div>

            <AdminStatsOverview stats={stats} />

            <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-secondary" />
                    <h2 className="text-lg md:text-xl font-black tracking-tighter text-foreground">
                        {t("audit_logs") || "Audit Logs"}
                    </h2>
                </div>
                <AdminAuditLogs initialLogs={auditLogs} authLogs={authLogs} />
            </div>
        </div>
    );
}
