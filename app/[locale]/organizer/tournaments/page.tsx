import { getTranslations } from "next-intl/server";
import { getDashboardTournaments, getUserSubscriptionPlan } from "../../dashboard/actions";
import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
    const isPro = userPlan !== 'free';
    const t = await getTranslations("Dashboard");

    return (
        <div className="flex flex-col gap-10">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-6 relative">
                <div>
                    <h1 className="text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">
                        {t("my_tournaments")}
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("my_tournaments_desc")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTournamentDialog isPro={isPro} />
                </div>
            </div>

            <div className="relative max-w-2xl ml-0 group">
                <form action="/organizer/tournaments" method="GET" className="relative">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-secondary group-focus-within:scale-110 transition-all duration-300" />
                        <Input
                            type="search"
                            name="q"
                            placeholder="Search tournaments by name, location, or status..."
                            className="pl-14 h-16 text-lg bg-muted/5 border-border/40 rounded-none group-focus-within:border-secondary group-focus-within:bg-muted/10 transition-all duration-500 font-black uppercase italic tracking-tight placeholder:text-muted-foreground/20"
                            defaultValue={query}
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-secondary group-focus-within:w-full transition-all duration-700" />
                    </div>
                </form>
            </div>

            {tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-border bg-muted/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                    <div className="p-8 bg-background border border-border rotate-3 transition-transform group-hover:rotate-0 shadow-xl mb-6">
                        <Search className="h-12 w-12 text-muted-foreground opacity-30 group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tight">No tournaments found</h3>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 flex items-center gap-2">
                         <span className="w-4 h-[1px] bg-muted-foreground/30" />
                        {query ? `Search query: "${query}"` : "You haven't created any tournaments yet."}
                         <span className="w-4 h-[1px] bg-muted-foreground/30" />
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tournaments.map((tournament: any) => (
                        <TournamentCard key={tournament.id} tournament={tournament} userPlan={userPlan} />
                    ))}
                </div>
            )}
        </div>
    );
}
