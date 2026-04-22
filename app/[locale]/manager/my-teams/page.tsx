import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Users } from "lucide-react";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { EmptyState } from "@/components/shared/empty-state";

export default async function MyTeamsPage() {
    const supabase = await createClient();
    const t = await getTranslations("Team");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch teams owned by the user
    const { data: teams } = await supabase
        .from("teams")
        .select(`
            *,
            participations:tournament_teams(
                tournament:tournaments(name)
            )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-4 md:pb-6 relative">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase leading-none">
                        {t("dashboard")}
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("dashboard_desc")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTeamDialog />
                </div>
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(!teams || teams.length === 0) ? (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Users}
                            title={t("no_teams_yet")}
                            description={t("no_teams_desc") || "Create your first team to start participating in tournaments."}
                            action={<CreateTeamDialog />}
                        />
                    </div>
                ) : (
                    teams.map((team) => (
                        <DashboardCard 
                            key={team.id} 
                            type="team" 
                            data={{
                                ...team,
                                tournament: (team.participations && (team.participations as any).length > 0) 
                                    ? (team.participations as any)[0].tournament 
                                    : null
                            }} 
                            mode="team" 
                        />
                    ))
                )}
            </div>
        </div>
    );
}
