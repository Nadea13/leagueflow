import { getTranslations } from "next-intl/server";
import { getUsers } from "@/app/[locale]/admin/actions";
import { AdminUsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
    const users = await getUsers();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                        {t("users_management")}
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        User Administration
                    </p>
                </div>
            </div>
            <AdminUsersTable initialUsers={users || []} />
        </div>
    );
}
