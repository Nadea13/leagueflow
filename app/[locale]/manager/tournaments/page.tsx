import { getTranslations } from "next-intl/server";
import { Trophy, Activity, CheckCircle } from "lucide-react";

import { PublicTournaments } from "@/components/tournaments/public/public-tournaments-list";
import { getPublicTournaments } from "@/actions/public/public-tournaments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TournamentSearchHeader } from "@/components/tournaments/public/tournament-search-bar";
import { Suspense } from "react";

export default async function ManagerTournamentsPage() {
    const t = await getTranslations("PublicTournaments");
    const tNav = await getTranslations("Nav");
    const tDashboard = await getTranslations("Dashboard");

    // Fetch initial tournaments to get counts for stats
    const tournaments = await getPublicTournaments("");
    const totalCount = tournaments.length;
    const activeCount = tournaments.filter((t: { status: string }) => t.status === "active").length;
    const completedCount = tournaments.filter((t: { status: string }) => t.status === "completed").length;

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-[0.8] mb-2">
                        {tNav("tournaments")}
                    </h1>
                    <p className="text-muted-foreground/60 text-[10px] md:text-xs font-bold tracking-widest max-w-xl">
                        {t("subtitle") || "Browse and search for active football tournaments to register your team."}
                    </p>
                </div>
                <TournamentSearchHeader />
            </div>

            <PublicTournaments onlyActive={true} />
        </div>
    );
}
