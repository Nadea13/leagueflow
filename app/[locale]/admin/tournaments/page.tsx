import { getTranslations } from "next-intl/server";
import { getAllTournaments } from "@/app/[locale]/admin/actions";
import { AdminTournamentsTable } from "@/components/admin/tournaments-table";

export default async function AdminTournamentsPage() {
    const tournaments = await getAllTournaments();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground">
                        {t("tournament_actions")}
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Tournament Administration
                    </p>
                </div>
            </div>
            <AdminTournamentsTable initialTournaments={tournaments || []} />
        </div>
    );
}
