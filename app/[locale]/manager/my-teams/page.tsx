import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Users } from "lucide-react";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";

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
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-border bg-muted/5 relative overflow-hidden group">
                        <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                            <Users className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight relative z-10">
                            {t("no_teams_yet")}
                        </h3>
                        <p className="text-[11px] uppercase font-bold text-muted-foreground/60 mt-2 opacity-60 flex items-center gap-2 relative z-10">
                            <span className="w-4 h-[1px] bg-muted-foreground/30" />
                            {t("no_teams_desc") || "Create your first team to start participating in tournaments."}
                            <span className="w-4 h-[1px] bg-muted-foreground/30" />
                        </p>
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
