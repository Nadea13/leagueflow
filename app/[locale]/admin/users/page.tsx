import { getUsers } from "@/app/[locale]/admin/actions";
import { AdminUsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>
            <AdminUsersTable initialUsers={users || []} />
        </div>
    );
}
