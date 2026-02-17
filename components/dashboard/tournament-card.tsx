import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Trophy } from "lucide-react";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";

interface TournamentCardProps {
    tournament: any;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
    const t = useTranslations("Common");
    const locale = useLocale();
    const tSettings = useTranslations("Settings");
    const tDashboard = useTranslations("Dashboard");

    const statusColors = {
        active: "bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400",
        completed: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-400",
        draft: "bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 dark:text-yellow-400",
    };

    const statusColor = statusColors[tournament.status as keyof typeof statusColors] || statusColors.draft;

    return (
        <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                    <div className="grid gap-1">
                        <CardTitle className="text-lg font-semibold leading-none tracking-tight">
                            {tournament.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {t("format")}: <span className="capitalize">{tournament.format || 'League'}</span>
                        </p>
                    </div>
                    <Badge variant="secondary" className={cn("capitalize font-normal", statusColor)}>
                        {tournament.status ? tSettings(tournament.status as any) : tSettings('draft')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="grid gap-4">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                                {tournament.start_date
                                    ? formatDate(tournament.start_date, "MMM d, yyyy", locale)
                                    : tDashboard("card_not_scheduled")}
                            </span>
                        </div>
                    </div>

                    {/* Add more stats here like team count if available in the future */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>— {tDashboard("card_teams")}</span> {/* Placeholder until we fetch team count */}
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" asChild>
                    <Link href={`/dashboard/tournaments/${tournament.id}`}>
                        {t("manage")}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
