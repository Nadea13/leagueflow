import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Activity, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface StatsOverviewProps {
    totalTournaments: number;
    activeTournaments: number;
    completedTournaments: number;
}

export function StatsOverview({ totalTournaments, activeTournaments, completedTournaments }: StatsOverviewProps) {
    const t = useTranslations("Dashboard");
    return (
        <div className="grid gap-3 grid-cols-3 md:gap-6 md:grid-cols-3">
            <Card className="border border-border bg-card shadow-none overflow-hidden relative group transition-all hover:border-secondary/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("total_tournaments")}
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-secondary opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        {totalTournaments}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-secondary/40" />
                        {t("all_time")}
                    </p>
                </CardContent>
            </Card>
            <Card className="border border-border bg-card shadow-none overflow-hidden relative group transition-all hover:border-primary/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("active_now")}
                    </CardTitle>
                    <Activity className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        {activeTournaments}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-primary/40" />
                        {t("currently_running")}
                    </p>
                </CardContent>
            </Card>
            <Card className="border border-border bg-card shadow-none overflow-hidden relative group transition-all hover:border-secondary/30">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary/40" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("completed")}
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-secondary/70 opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        {completedTournaments}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-secondary/30" />
                        {t("successfully_finished")}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
