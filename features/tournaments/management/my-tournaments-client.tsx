"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { TournamentCreate } from "@/features/tournaments/management/create-tournament-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Tournament } from "@/types/index";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface MyTournamentsClientProps {
    initialTournaments: (Tournament & { role?: string })[];
    userPlan: string;
}

export function MyTournamentsClient({ initialTournaments, userPlan }: MyTournamentsClientProps) {
    const t = useTranslations("Dashboard");
    const [searchQuery, setSearchQuery] = useState("");

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-my-tournaments-header",
                    popover: {
                        title: t("tour_my_tournaments_title"),
                        description: t("tour_my_tournaments_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-my-tournaments-search",
                    popover: {
                        title: t("tour_my_tournaments_search_title"),
                        description: t("tour_my_tournaments_search_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-create-tournament-btn",
                    popover: {
                        title: t("tour_my_tournaments_create_title"),
                        description: t("tour_my_tournaments_create_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-tournaments-grid") ? [{
                    element: "#tour-tournaments-grid",
                    popover: {
                        title: t("tour_my_tournaments_list_title"),
                        description: t("tour_my_tournaments_list_desc"),
                        side: "top" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_my_tournaments_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_my_tournaments_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    const filteredTournaments = initialTournaments.filter((tournament) =>
        tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter" id="tour-my-tournaments-header">
                        {t("my_tournaments")}
                    </h1>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={startTour} 
                        className="flex items-center gap-1.5 h-8 text-xs font-bold border-dashed border-primary hover:bg-primary/5 transition-all cursor-pointer"
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                        {t("tour_button")}
                    </Button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:h-10 sm:w-64 sm:flex-none" id="tour-my-tournaments-search">
                        <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30" />
                        <Input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                    <div id="tour-create-tournament-btn" className="inline-block">
                        <TournamentCreate 
                            iconOnlyMobile 
                            isDisabled={
                                !(userPlan === "monthly" || userPlan === "yearly" || userPlan === "manager_pro" || userPlan === "pro" || userPlan === "pro_yearly" || userPlan === "customs") &&
                                initialTournaments.filter(t => t.role === 'owner').length >= 1
                            }
                        />
                    </div>
                </div>
            </div>

            {filteredTournaments.length === 0 ? (
                <EmptyState
                    title={searchQuery ? t("no_tournaments_found") : t("no_tournaments")}
                    description={searchQuery ? `${t("search_tournaments")} "${searchQuery}"` : t("create_first")}
                    action={
                        <div id="tour-create-tournament-btn-empty">
                            <TournamentCreate 
                                isDisabled={
                                    !(userPlan === "monthly" || userPlan === "yearly" || userPlan === "manager_pro" || userPlan === "pro" || userPlan === "pro_yearly" || userPlan === "customs") &&
                                    initialTournaments.filter(t => t.role === 'owner').length >= 1
                                }
                            />
                        </div>
                    }
                    className="bg-card"
                />
            ) : (
                <div id="tour-tournaments-grid" className="grid gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
