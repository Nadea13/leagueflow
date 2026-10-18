"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Users, Search, HelpCircle, List, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tab } from "@/components/ui/tab";
import { DashboardCard } from "@/features/dashboard/dashboard-card";
import { CreateTeamForm } from "@/features/dialogs";
import { VerifyTeamForm } from "@/features/dialogs";
import { EmptyState } from "@/components/shared/empty-state";
import { Team } from "@/types/index";
import { Header } from "@/components/ui/header";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface MyTeamsClientProps {
    initialTeams: Team[];
}

export function MyTeamsClient({ initialTeams }: MyTeamsClientProps) {
    const t = useTranslations("Team");
    const locale = useLocale();
    const isThai = locale === "th";
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const viewParam = searchParams.get("view");
    const [viewMode, setViewMode] = useState<"list" | "card">(() => {
        if (viewParam === "list" || viewParam === "card") return viewParam;
        if (viewParam === "grid") return "card";
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("teams_view_mode");
                if (saved === "list" || saved === "card") return saved;
            } catch {}
        }
        return "card";
    });

    useEffect(() => {
        if (viewParam === "list" || viewParam === "card") {
            setViewMode(viewParam);
            try {
                localStorage.setItem("teams_view_mode", viewParam);
            } catch {}
        } else if (viewParam === "grid") {
            setViewMode("card");
            try {
                localStorage.setItem("teams_view_mode", "card");
            } catch {}
        }
    }, [viewParam]);

    const handleViewModeChange = (mode: "list" | "card") => {
        setViewMode(mode);
        try {
            localStorage.setItem("teams_view_mode", mode);
        } catch {}
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", mode);
        const queryString = params.toString();
        router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
    };

    const [searchQuery, setSearchQuery] = useState("");

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-my-teams-header",
                    popover: {
                        title: t("tour_my_teams_title"),
                        description: t("tour_my_teams_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-my-teams-search",
                    popover: {
                        title: t("tour_my_teams_search_title"),
                        description: t("tour_my_teams_search_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-create-team-btn",
                    popover: {
                        title: t("tour_my_teams_create_title"),
                        description: t("tour_my_teams_create_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-teams-grid") && initialTeams.length > 0 ? [{
                    element: "#tour-teams-grid",
                    popover: {
                        title: t("tour_my_teams_list_title"),
                        description: t("tour_my_teams_list_desc"),
                        side: "top" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t, initialTeams.length]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_my_teams_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_my_teams_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    const filteredTeams = initialTeams.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.sport?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-1 lg:gap-2">
                    <Header level={2}>{t("my_teams")}</Header>
                    <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        onClick={startTour} 
                    >
                        <HelpCircle className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 lg:w-128 sm:flex-none" id="tour-my-teams-search">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                            type="search"
                            size="sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-card"
                            placeholder={isThai ? "พิมพ์ชื่อทีม..." : "Search teams..."}
                        />
                    </div>
                    <div id="tour-teams-view-mode" className="flex items-center shrink-0">
                        <Tab<"list" | "card">
                            value={viewMode}
                            onChange={handleViewModeChange}
                            size="sm"
                            showLabels={false}
                            showIcons={true}
                            itemClassName="size-7"
                            options={[
                                { label: isThai ? "รายการ" : "List", value: "list", icon: List },
                                { label: isThai ? "การ์ด" : "Card", value: "card", icon: LayoutGrid },
                            ]}
                        />
                    </div>
                    <div id="tour-verify-team-btn" className="inline-block shrink-0">
                        <VerifyTeamForm iconOnlyMobile />
                    </div>
                    <div id="tour-create-team-btn" className="inline-block shrink-0">
                        <CreateTeamForm iconOnlyMobile />
                    </div>
                </div>
            </div>

            <div id="tour-teams-grid">
                {filteredTeams.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={t("no_teams_yet")}
                        description={t("no_teams_desc") || "Create your first team to start participating in tournaments."}
                        action={<CreateTeamForm />}
                        className="bg-card rounded-sm border"
                    />
                ) : viewMode === "card" ? (
                    <div className="grid gap-2 lg:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredTeams.map((team) => (
                            <DashboardCard
                                key={team.id}
                                type="team"
                                data={team}
                                mode="organizer"
                                layout="card"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="border bg-card rounded-sm divide-y divide-border overflow-hidden shadow-xs">
                        {filteredTeams.map((team) => (
                            <DashboardCard
                                key={team.id}
                                type="team"
                                data={team}
                                mode="organizer"
                                layout="list"
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

