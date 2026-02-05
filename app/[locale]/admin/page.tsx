import { createClient } from "@/utils/supabase/server";
import { AuditLog } from "@/types";
import { AdminAuditLogs } from "@/components/admin/audit-logs-table";
import { AdminUsersTable } from "@/components/admin/users-table";
import { AdminTournamentsTable } from "@/components/admin/tournaments-table";
import { getAuditLogsWithUsers } from "@/app/[locale]/admin/actions";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

export default async function AdminDashboardPage() {
    // Fetch audit logs with user info linked
    const auditLogs = await getAuditLogsWithUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">System Activity</h1>
            </div>
            <AdminAuditLogs initialLogs={auditLogs} />
        </div>
    );
}
