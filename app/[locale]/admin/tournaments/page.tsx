import { getTranslations } from "next-intl/server";
import { getAllTournaments } from "@/app/[locale]/admin/actions";
import { AdminTournamentsTable } from "@/components/admin/tournaments-table";

export default async function AdminTournamentsPage() {
    const tournaments = await getAllTournaments();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t("tournament_actions")}</h1>
            </div>
            <AdminTournamentsTable initialTournaments={tournaments || []} />
        </div>
    );
}
