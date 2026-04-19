import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Trophy } from "lucide-react";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { Tournament } from "@/types";

interface PublicTournamentCardProps {
    tournament: Tournament & { tournament_teams?: { count: number }[] };
    isManager?: boolean;
}

export function PublicTournamentCard({ tournament, isManager = false }: PublicTournamentCardProps) {
    const t = useTranslations("Common");
    const locale = useLocale();
    const tSettings = useTranslations("Settings");
    const tDashboard = useTranslations("Dashboard");

    // Assuming we want to show a PRO badge if the tournament is on a paid plan
    const isPro = tournament.plan && tournament.plan !== 'free';

    const currentTeams = tournament.tournament_teams?.[0]?.count || 0;
    const isFull = tournament.max_teams && currentTeams >= tournament.max_teams;
    const isPastDeadline = tournament.document_deadline && new Date(tournament.document_deadline) < new Date();
    const isClosed = isFull || isPastDeadline;

    return (
        <Link href={isManager ? `/manager/tournaments/${tournament.id}` : `/${tournament.id}`} className="block h-full group">
            <Card className="flex flex-col h-full bg-card pt-4 md:pt-6 pb-4 md:pb-5 border border-border transition-all hover:border-secondary/50 overflow-hidden relative shadow-lg cursor-pointer">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                {isPro && (
                    <div className="absolute right-6 z-20">
                        <div className="bg-secondary/10 text-secondary text-[8px] font-black px-2 py-0.5 uppercase tracking-[0.2em] border border-secondary/20 backdrop-blur-md">
                            {t("pro")}
                        </div>
                    </div>
                )}
                <CardHeader className="relative z-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            {tournament.status && tournament.status !== 'active' && (
                                <div className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none",
                                    tournament.status === 'completed' ? "bg-muted text-muted-foreground/40" : "bg-secondary/10 text-secondary border border-secondary/20"
                                )}>
                                    {tSettings(tournament.status as Parameters<typeof tSettings>[0])}
                                </div>
                            )}
                            {isClosed && (
                                <div className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none bg-red-500/10 text-red-600 border border-red-500/20 ml-2">
                                    {isFull ? (tSettings("full") || "FULL") : (tSettings("closed") || "CLOSED")}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 opacity-60">
                                <Trophy className="h-3 w-3 text-secondary" />
                                <span className="text-[9px] font-black uppercase italic tracking-tighter text-muted-foreground/80">{tournament.format || 'League'}</span>
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black leading-none tracking-tighter uppercase italic group-hover:text-secondary transition-colors truncate">
                            {tournament.name}
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 px-6">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] italic mb-1">{t("kick_off")}</span>
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-3.5 w-3.5 text-secondary/40 shrink-0" />
                                    <span className="text-[11px] font-black uppercase tabular-nums tracking-tight">
                                        {tournament.start_date
                                            ? formatDate(tournament.start_date, "MMM d, yyyy", locale)
                                            : tDashboard("card_not_scheduled")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] italic mb-1">{t("team_limit")}</span>
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-secondary/40 shrink-0" />
                                    <span className="text-[11px] font-black uppercase tabular-nums tracking-tight">
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
