"use client";

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { Tournament, Team } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Shield } from "lucide-react";

interface DashboardCardProps {
    type: 'tournament' | 'team';
    data: any; // Using any temporarily to simplify merging types, will refine
    userPlan?: string;
    mode?: 'organizer' | 'team';
}

export function DashboardCard({ type, data, userPlan, mode }: DashboardCardProps) {
    const t = useTranslations("Common");
    const tDashboard = useTranslations("Dashboard");
    const tSettings = useTranslations("Settings");
    const tTeam = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const locale = useLocale();

    if (type === 'tournament') {
        const tournament = data as Tournament & { current_teams?: number };
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
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <Trophy className="absolute right-4 md:right-6 z-20 h-4 w-4 text-secondary" />
                    <CardHeader className="relative z-10">
                        <div className="flex flex-col gap-2">
                            <div className={cn("text-[9px] font-bold uppercase tracking-widest opacity-80", statusColor.split(' ').filter(c => c.startsWith('text-')).join(' '))}>
                                {tournament.status ? tSettings(tournament.status) : tSettings('draft')}
                            </div>
                            <CardTitle className="text-lg font-black leading-none tracking-tight uppercase group-hover:text-secondary transition-colors truncate">
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
                            <div className="text-[9px] font-bold uppercase text-secondary/70 tracking-[0.2em]">
                                {tournament.format || 'League'} • Championship
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        );
    }

    // Team Card
    const team = data as Team & { tournament?: { name: string } | null };
    return (
        <Link href={`/${mode === 'organizer' ? 'organizer/teams' : 'manager/my-teams'}/${team.id}`} className="block h-full group">
            <Card className="flex flex-col h-full bg-card border border-border transition-all hover:border-secondary/50 overflow-hidden relative shadow-lg cursor-pointer">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                <Shield className="absolute right-4 md:right-6 top-4 md:top-6 z-20 h-4 w-4 text-secondary" />
                <CardHeader className="pt-4 md:pt-6 relative z-10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                            <Avatar className="h-14 w-14 rounded-none border border-border group-hover:border-secondary/30 transition-all shrink-0 p-1 bg-muted/30">
                                <AvatarImage src={team.logo_url ?? undefined} alt={team.name} className="object-contain" />
                                <AvatarFallback className="rounded-none bg-secondary/5 text-secondary font-black">{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1">
                                <CardTitle className="text-lg font-black leading-none tracking-tight uppercase group-hover:text-secondary transition-colors truncate">
                                    {team.name}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {team.tournament ? (
                                        <Badge variant="outline" className="w-fit text-[9px] px-2 py-0.5 border border-secondary/20 bg-secondary/5 text-secondary font-black uppercase rounded-none shrink-0">
                                            {tCommon("active")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="w-fit text-[9px] px-2 py-0.5 border-none font-black uppercase rounded-none shrink-0 opacity-70">
                                            {tTeam("unassigned_badge")}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pb-4 md:pb-6 text-sm relative z-10">
                    <div className="grid gap-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/80 bg-muted/20 p-2 border-l-2 border-secondary/30">
                            <Trophy className="h-3.5 w-3.5 text-secondary shadow-[0_0_10px_rgba(0,196,154,0.3)]" />
                            <span className="truncate uppercase tracking-tight">
                                {team.tournament ? team.tournament.name : tTeam("unassigned_badge")}
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 leading-relaxed">
                            {team.description || tTeam("no_description")}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
