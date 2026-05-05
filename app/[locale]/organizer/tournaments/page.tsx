import { getTranslations } from "next-intl/server";
import { getDashboardTournaments } from "@/actions/organizer/dashboard";
import { getUserSubscriptionPlan } from "@/actions/common/user";
import { TournamentCreate } from "@/components/tournaments/management/create-tournament-form";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tournament } from "@/types/index";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tournaments",
    description: "Browse and search for active and completed football tournaments.",
};

export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // Resolve searchParams promise for Next.js 15
    const resolvedParams = await searchParams;
    const query = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;

    const tournaments = await getDashboardTournaments(query);
    const userPlan = await getUserSubscriptionPlan();
    const isPro = true; // Pro locks removed
    const t = await getTranslations("Dashboard");

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] leading-none">
                        {t("my_tournaments")}
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("my_tournaments_desc")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <TournamentCreate />
                </div>
            </div>

            <div className="relative max-w-2xl ml-0 group">
                <form action="/organizer/tournaments" method="GET" className="relative">
                    <div className="relative">
                        <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
                        <Input
                            type="search"
                            name="q"
                            placeholder="Search tournaments by name, location, or status..."
                            className="bg-card"
                            defaultValue={query}
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary group-focus-within:w-full transition-all duration-700" />
                    </div>
                </form>
            </div>

            {tournaments.length === 0 ? (
                <EmptyState
                    title={query ? "No tournaments found" : undefined}
                    description={query ? `Search query: "${query}"` : undefined}
                    action={<TournamentCreate />}
                    className="bg-card"
                />
            ) : (
                <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tournaments.map((tournament: Tournament) => (
                        <DashboardCard key={tournament.id} type="tournament" data={tournament} userPlan={userPlan} />
                    ))}
                </div>
            )}
        </div>
    );
}
