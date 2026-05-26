"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { TournamentCreate } from "@/features/tournaments/management/create-tournament-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Tournament } from "@/types/index";

interface MyTournamentsClientProps {
    initialTournaments: Tournament[];
    userPlan: string;
}

export function MyTournamentsClient({ initialTournaments, userPlan }: MyTournamentsClientProps) {
    const t = useTranslations("Dashboard");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredTournaments = initialTournaments.filter((tournament) =>
        tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                        {t("my_tournaments")}
                    </h1>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:h-10 sm:w-64 sm:flex-none">
                        <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30" />
                        <Input
                            type="search"
                            placeholder="Search tournaments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                    <TournamentCreate />
                </div>
            </div>

            {filteredTournaments.length === 0 ? (
                <EmptyState
                    title={searchQuery ? "No tournaments found" : undefined}
                    description={searchQuery ? `Search query: "${searchQuery}"` : undefined}
                    action={<TournamentCreate />}
                    className=""
                />
            ) : (
                <div className="grid gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTournaments.map((tournament) => (
                        <DashboardCard
                            key={tournament.id}
                            type="tournament"
                            data={tournament}
                            userPlan={userPlan}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
