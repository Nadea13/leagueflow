"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { CreateTeamForm } from "@/features/teams/create-team-form";
import { VerifyTeamForm } from "@/features/teams/verify-team-form";
import { EmptyState } from "@/components/shared/empty-state";

import { Team } from "@/types/index";

interface MyTeamsClientProps {
    initialTeams: Team[];
}

export function MyTeamsClient({ initialTeams }: MyTeamsClientProps) {
    const t = useTranslations("Team");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredTeams = initialTeams.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.sport?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                        {t("my_teams")}
                    </h1>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:h-10 sm:w-64 sm:flex-none">
                        <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30" />
                        <Input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                    <VerifyTeamForm iconOnlyMobile />
                    <CreateTeamForm iconOnlyMobile />
                </div>
            </div>

            <div className="grid gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTeams.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Users}
                            title={t("no_teams_yet")}
                            description={t("no_teams_desc") || "Create your first team to start participating in tournaments."}
                            action={<CreateTeamForm />}
                            className="bg-card"
                        />
                    </div>
                ) : (
                    filteredTeams.map((team) => (
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
