import { getTranslations } from "next-intl/server";
import { getGlobalPlayers } from "@/app/[locale]/admin/actions";
import { AdminPlayersTable } from "@/components/admin/players-table";

export default async function AdminPlayersPage() {
    const players = await getGlobalPlayers();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
                        {t("players")}
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Global Player Database
                    </p>
                </div>
            </div>
            <AdminPlayersTable initialPlayers={players || []} />
        </div>
    );
}
