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
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_tournaments")}
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalTournaments}</div>
                    <p className="text-xs text-muted-foreground">
                        {t("all_time")}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("active_now")}
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeTournaments}</div>
                    <p className="text-xs text-muted-foreground">
                        {t("currently_running")}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("completed")}
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedTournaments}</div>
                    <p className="text-xs text-muted-foreground">
                        {t("successfully_finished")}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
