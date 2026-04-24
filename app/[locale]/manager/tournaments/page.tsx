import { getTranslations } from "next-intl/server";
import { Trophy, Activity, CheckCircle } from "lucide-react";

import { PublicTournaments } from "@/components/tournaments/public-tournaments";
import { getPublicTournaments } from "@/actions/public/public-tournaments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-foreground leading-[0.8] mb-2">
                        {tNav("tournaments")}
                    </h1>
                    <p className="text-muted-foreground/60 text-[10px] md:text-xs font-bold uppercase tracking-widest max-w-xl">
                        {t("subtitle") || "Browse and search for active football tournaments to register your team."}
                    </p>
                </div>
            </div>

            <div className="grid gap-2 grid-cols-3 md:gap-3 md:grid-cols-3">
                <Card className="border border-border bg-card shadow-none py-4 md:py-6 overflow-hidden relative group transition-all hover:border-secondary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {tDashboard("total_tournaments")}
                        </CardTitle>
                        <Trophy className="h-4 w-4 text-secondary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">{totalCount}</div>
                        <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-secondary/40" />
                            {tDashboard("all_time")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card shadow-none py-4 md:py-6 overflow-hidden relative group transition-all hover:border-secondary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary/60" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {tDashboard("active_now")}
                        </CardTitle>
                        <Activity className="h-4 w-4 text-secondary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">{activeCount}</div>
                        <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-secondary/40" />
                            {tDashboard("currently_running")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card shadow-none py-4 md:py-6 overflow-hidden relative group transition-all hover:border-secondary/30">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary/40" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {tDashboard("completed")}
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-secondary/70 opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">{completedCount}</div>
                        <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-secondary/30" />
                            {tDashboard("successfully_finished")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <Trophy className="h-5 w-5 text-secondary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">
                        {t("available_competitions")}
                    </h3>
                </div>
                <PublicTournaments onlyActive={true} isManager={true} />
            </div>
        </div>
    );
}
