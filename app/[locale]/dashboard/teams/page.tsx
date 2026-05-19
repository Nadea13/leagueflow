import { getTranslations } from "next-intl/server";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { Users } from "lucide-react";
import { CreateTeamForm } from "@/features/teams/create-team-form";
import { EmptyState } from "@/components/shared/empty-state";
import { getMyTeams } from "@/actions/manager/team";

export default async function TeamsPage() {
    const t = await getTranslations("Team");
    const result = await getMyTeams();
    const teams = result.success ? result.data : [];

    return (
        <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                        {t("my_teams")}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTeamForm />
                </div>
            </div>

            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(!teams || teams.length === 0) ? (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Users}
                            title={t("no_teams_yet")}
                            description={t("no_teams_desc") || "Create your first team to start participating in tournaments."}
                            action={<CreateTeamForm />}
                        />
                    </div>
                ) : (
                    teams.map((team: any) => (
                        <DashboardCard
                            key={team.id}
                            type="team"
                            data={team}
                            mode="organizer"
                        />
                    ))
                )}
            </div>
        </div>
    );
}
