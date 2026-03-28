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
                <h1 className="text-3xl font-bold tracking-tight">{t("overview") || "Dashboard Overview"}</h1>
            </div>

            <AdminStatsOverview stats={stats} />

            <div className="mt-8 space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">{t("audit_logs") || "Audit Logs"}</h2>
                <AdminAuditLogs initialLogs={auditLogs} authLogs={authLogs} />
            </div>
        </div>
    );
}
