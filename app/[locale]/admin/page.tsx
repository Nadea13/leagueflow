import { getTranslations } from "next-intl/server";
import { AdminAuditLogs } from "@/components/admin/audit-logs-table";
import { getAuditLogsWithUsers } from "@/app/[locale]/admin/actions";

export default async function AdminDashboardPage() {
    // Fetch audit logs with user info linked
    const auditLogs = await getAuditLogsWithUsers();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t("audit_logs")}</h1>
            </div>
            <AdminAuditLogs initialLogs={auditLogs} />
        </div>
    );
}
