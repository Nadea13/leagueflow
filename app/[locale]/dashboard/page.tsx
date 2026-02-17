import { getTranslations } from "next-intl/server";
import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { getDashboardTournaments, getUserSubscriptionPlan } from "./actions";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { EmptyState } from "@/components/dashboard/empty-state";

export default async function DashboardPage() {
    // Parallel data fetching
    const [allTournaments, userPlan] = await Promise.all([
        getDashboardTournaments(),
        getUserSubscriptionPlan()
    ]);

    const ownedTournaments = allTournaments.filter((t: any) => t.role === 'owner');
    const sharedTournaments = allTournaments.filter((t: any) => t.role !== 'owner');
    const isPro = userPlan !== 'free';

    const t = await getTranslations("Dashboard");
    const tCollab = await getTranslations("Collaborators");

    const hasTournaments = ownedTournaments.length > 0;
    const hasSharedTournaments = sharedTournaments.length > 0;

    // Calculate stats
    const totalTournaments = ownedTournaments.length;
    const activeTournaments = ownedTournaments.filter((t: any) => t.status === 'active').length;
    const completedTournaments = ownedTournaments.filter((t: any) => t.status === 'completed').length;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("welcome")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTournamentDialog isPro={isPro} />
                </div>
            </div>

            <StatsOverview
                totalTournaments={totalTournaments}
                activeTournaments={activeTournaments}
                completedTournaments={completedTournaments}
            />

            {!hasTournaments && !hasSharedTournaments ? (
                <EmptyState isPro={isPro} />
            ) : (
                <div className="space-y-8">
                    {hasTournaments && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold tracking-tight">{t("my_tournaments")}</h2>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {ownedTournaments.map((tournament: any) => (
                                    <TournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </div>
                    )}

                    {hasSharedTournaments && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold tracking-tight">{tCollab("shared_tournaments")}</h2>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {sharedTournaments.map((tournament: any) => (
                                    <TournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
