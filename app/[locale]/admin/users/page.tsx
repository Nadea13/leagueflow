import { getTranslations } from "next-intl/server";
import { getUsers } from "@/app/[locale]/admin/actions";
import { AdminUsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
    const users = await getUsers();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t("users_management")}</h1>
            </div>
            <AdminUsersTable initialUsers={users || []} />
        </div>
    );
}
