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
    userPlan?: string;
}

export function TournamentCard({ tournament, userPlan }: TournamentCardProps) {
    const t = useTranslations("Common");
    const locale = useLocale();
    const tSettings = useTranslations("Settings");
    const tDashboard = useTranslations("Dashboard");

    const statusColors = {
        active: "bg-green-500/10 text-green-600 border-none font-bold uppercase",
        completed: "bg-blue-500/10 text-blue-600 border-none font-bold uppercase",
        draft: "bg-yellow-500/10 text-yellow-600 border-none font-bold uppercase",
    };

    const statusColor = statusColors[tournament.status as keyof typeof statusColors] || statusColors.draft;
    const isPro = (userPlan === 'monthly' || userPlan === 'yearly') || (tournament.plan && tournament.plan !== 'free');

    return (
        <Link href={`/organizer/tournaments/${tournament.id}`} className="block h-full group">
            <Card className="flex flex-col h-full bg-card pt-4 md:pt-6 pb-4 md:pb-5 border border-border transition-all hover:border-secondary/50 overflow-hidden relative shadow-sm hover:shadow-md cursor-pointer">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                {isPro && (
                    <div className="absolute right-4 md:right-6 z-20">
                        <div className="bg-secondary/5 text-secondary text-[7px] font-bold px-2 py-0.5 uppercase tracking-[0.2em] border border-secondary/20">
                            {t("pro")}
                        </div>
                    </div>
                )}
                <CardHeader className="relative z-10">
                    <div className="flex flex-col gap-2">
                        <div className={cn("text-[9px] font-bold uppercase tracking-widest opacity-80", statusColor.split(' ').filter(c => c.startsWith('text-')).join(' '))}>
                            {tournament.status ? tSettings(tournament.status as any) : tSettings('draft')}
                        </div>
                        <CardTitle className="text-lg font-black leading-none tracking-tight uppercase italic group-hover:text-secondary transition-colors truncate">
                            {tournament.name}
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10">
                    <div className="flex flex-col gap-2 md:gap-3">
                        <div className="grid grid-cols-2 gap-4 border-t border-border pt-2 md:pt-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase font-bold text-muted-foreground/50 tracking-widest">Start Date</span>
                                <span className="text-[10px] font-bold uppercase tabular-nums">
                                    {tournament.start_date
                                        ? formatDate(tournament.start_date, "MMM d", locale)
                                        : tDashboard("card_not_scheduled")}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase font-bold text-muted-foreground/50 tracking-widest">Capacity</span>
                                <span className="text-[10px] font-bold uppercase tabular-nums">
                                    {tournament.current_teams || 0}/{tournament.max_teams || 8}
                                </span>
                            </div>
                        </div>
                        <div className="text-[9px] font-bold uppercase text-secondary/70 tracking-[0.2em] italic">
                            {tournament.format || 'League'} • Championship
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
