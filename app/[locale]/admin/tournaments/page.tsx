import { getAllTournaments } from "@/app/[locale]/admin/actions";
import { AdminTournamentsTable } from "@/components/admin/tournaments-table";

export default async function AdminTournamentsPage() {
    const tournaments = await getAllTournaments();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Tournament Management</h1>
            </div>
            <AdminTournamentsTable initialTournaments={tournaments || []} />
        </div>
    );
}
