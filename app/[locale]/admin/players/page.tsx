import { getTranslations } from "next-intl/server";
import { getGlobalPlayers } from "@/app/[locale]/admin/actions";
import { AdminPlayersTable } from "@/components/admin/players-table";

export default async function AdminPlayersPage() {
    const players = await getGlobalPlayers();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t("players")}</h1>
            </div>
            <AdminPlayersTable initialPlayers={players || []} />
        </div>
    );
}
