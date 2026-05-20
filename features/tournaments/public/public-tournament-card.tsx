import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Trophy } from "lucide-react";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { Tournament } from "@/types";

interface PublicTournamentCardProps {
    tournament: Tournament & { tournament_teams?: { count: number }[] };
}

export function PublicTournamentCard({ tournament }: PublicTournamentCardProps) {
    const t = useTranslations("Common");
    const locale = useLocale();
    const tSettings = useTranslations("Settings");
    const tDashboard = useTranslations("Dashboard");

    // Assuming we want to show a PRO badge if the tournament is on a paid plan
    const _isPro = tournament.plan && tournament.plan !== 'free';

    const currentTeams = tournament.tournament_teams?.[0]?.count || 0;
    const isFull = tournament.max_teams && currentTeams >= tournament.max_teams;
    const isPastDeadline = tournament.document_deadline && new Date(tournament.document_deadline) < new Date();
    const isClosed = isFull || isPastDeadline;

    return (
        <Link href={`/${tournament.id}`} className="block h-full group">
            <Card className="flex flex-col h-full bg-card pt-4 md:pt-6 pb-4 md:pb-6 border transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                <Trophy className="absolute right-4 md:right-6 z-20 h-4 w-4 text-primary" />
                <CardHeader className="relative z-10 pb-2">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {tournament.status && (
                                    <div className={cn(
                                        "text-[9px] font-black tracking-widest px-2 py-0.5",
                                        tournament.status === 'finished' ? "bg-muted text-muted-foreground/40" : "bg-primary/10 text-primary border border-primary/20"
                                    )}>
                                        {tSettings(tournament.status as Parameters<typeof tSettings>[0])}
                                    </div>
                                )}
                                {isClosed && (
                                    <div className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20">
                                        {isFull ? (tSettings("full") || "FULL") : (tSettings("closed") || "CLOSED")}
                                    </div>
                                )}
                            </div>
                        </div>
                        <CardTitle className="text-lg md:text-xl font-black leading-tight tracking-tighter group-hover:text-primary transition-colors truncate">
                            {tournament.name}
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 px-6">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4 border-t group-hover:border-primary/40 pt-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-muted-foreground/40 tracking-[0.2em] mb-1">{t("kick_off")}</span>
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                                    <span className="text-[11px] font-black tabular-nums tracking-tight">
                                        {tournament.start_date
                                            ? formatDate(tournament.start_date, "MMM d, yyyy", locale)
                                            : tDashboard("card_not_scheduled")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-muted-foreground/40 tracking-[0.2em] mb-1">{t("team_limit")}</span>
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                                    <span className="text-[11px] font-black tabular-nums tracking-tight">
                                        {tournament.max_teams ? `${currentTeams}/${tournament.max_teams} ${t("teams")}` : t("open")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
