import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, DollarSign, Crown } from "lucide-react";
import { useTranslations } from "next-intl";

interface AdminStatsProps {
    stats: {
        totalUsers: number;
        activeTournaments: number;
        totalRevenue: number;
        proUsers: number;
    };
}

export function AdminStatsOverview({ stats }: AdminStatsProps) {
    const t = useTranslations("Admin");

    return (
        <div className="grid gap-3 grid-cols-2 md:gap-4 lg:grid-cols-4">
            <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-secondary/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("total_users") || "Total Users"}
                    </CardTitle>
                    <Users className="h-4 w-4 text-secondary opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        {stats.totalUsers}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-secondary/40" />
                        Registered
                    </p>
                </CardContent>
            </Card>
            <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-emerald-500/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-emerald-500/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("pro_users") || "Pro Users"}
                    </CardTitle>
                    <Crown className="h-4 w-4 text-emerald-500 opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        {stats.proUsers}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-emerald-500/40" />
                        Subscribed
                    </p>
                </CardContent>
            </Card>
            <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-primary/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("active_tournaments") || "Active Tournaments"}
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        {stats.activeTournaments}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-primary/40" />
                        Currently Live
                    </p>
                </CardContent>
            </Card>
            <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-secondary/30">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary/40" />
                <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                    <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                        {t("total_revenue") || "Total Revenue"}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-secondary/70 opacity-80 shrink-0 hidden sm:block" />
                </CardHeader>
                <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                    <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">
                        ฿{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                        <span className="w-2 h-[1px] bg-secondary/30" />
                        All Time
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
