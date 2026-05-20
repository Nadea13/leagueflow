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
    const tSports = useTranslations("Sports");
    const locale = useLocale();

    if (type === 'tournament') {
        const tournament = data as Tournament & { current_teams?: number };
        const statusColors = {
            active: "bg-green-500",
            completed: "bg-blue-500",
            draft: "bg-yellow-500",
        };

        const statusColor = statusColors[tournament.status as keyof typeof statusColors] || statusColors.draft;
        const isPro = (userPlan === 'monthly' || userPlan === 'yearly') || (tournament.plan && tournament.plan !== 'free');

        return (
            <Link href={`/dashboard/tournaments/${tournament.id}`} className="block h-full group">
                <Card className="flex flex-col h-full bg-card border rounded-lg transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <Trophy className="absolute right-2 md:right-4 top-2 md:top-4 z-20 h-4 w-4 text-primary" />
                    <CardHeader className="pt-2 md:pt-4 relative z-10">
                        <div className="flex gap-2 md:gap-4 overflow-hidden">
                            <Avatar className="h-14 w-14 border rounded-full group-hover:border-primary/30 transition-all shrink-0 p-1 bg-muted/30">
                                <AvatarImage src={tournament.logo_img ?? undefined} alt={tournament.name} className="object-contain" />
                                <AvatarFallback className="bg-primary/5 text-primary font-black rounded-full">{tournament.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                                <CardTitle className="text-lg font-black leading-none tracking-tight group-hover:text-primary transition-colors truncate">
                                    {tournament.name}
                                </CardTitle>
                                <Badge className={cn("w-fit text-[9px] px-2 py-0.5 border-none font-black shrink-0 rounded", statusColor.split(' ').filter(c => c.startsWith('bg-')).join(' '))}>
                                    {tournament.status ? tSettings(tournament.status) : tSettings('draft')}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pb-2 md:pb-4 text-sm relative z-10">
                        <div className="flex flex-col gap-2 md:gap-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-muted-foreground/50 tracking-widest">Start Date</span>
                                    <span className="text-xs font-bold tabular-nums">
                                        {tournament.start_date
                                            ? formatDate(tournament.start_date, "MMM d", locale)
                                            : tDashboard("card_not_scheduled")}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-muted-foreground/50 tracking-widest">Capacity</span>
                                    <span className="text-xs font-bold tabular-nums">
                                        {tournament.current_teams || 0}/{tournament.max_teams || 8}
                                    </span>
                                </div>
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
        <Link href={`/${mode === 'organizer' ? 'dashboard/teams' : 'manager/my-teams'}/${team.id}`} className="block h-full group">
            <Card className="flex flex-col h-full bg-card border rounded-lg transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                <Shield className="absolute right-2 md:right-4 top-2 md:top-4 z-20 h-4 w-4 text-primary" />
                <CardHeader className="pt-2 md:pt-4 relative z-10">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-2 md:gap-4 overflow-hidden">
                            <Avatar className="h-14 w-14 border rounded-full group-hover:border-primary/30 transition-all shrink-0 p-1 bg-muted/30">
                                <AvatarImage src={team.logo_url ?? undefined} alt={team.name} className="object-contain" />
                                <AvatarFallback className="bg-primary/5 text-primary font-black rounded-full">{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                                <CardTitle className="text-lg font-black leading-none tracking-tight group-hover:text-primary transition-colors truncate">
                                    {team.name}
                                </CardTitle>
                                <div className="flex items-center gap-1 md:gap-2">
                                    {team.tournament ? (
                                        <Badge variant="outline" className="w-fit text-[9px] px-2 py-0.5 border border-primary/20 bg-primary/5 text-primary font-black shrink-0 rounded">
                                            {tCommon("active")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="default" className="w-fit text-[9px] px-2 py-0.5 border-none font-black shrink-0 rounded">
                                            {tTeam("unassigned_badge")}
                                        </Badge>
                                    )}
                                    <div className="text-[9px] font-black text-muted-foreground/40 tracking-widest mt-1">
                                        {tSports(team.sport)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pb-2 md:pb-4 text-sm relative z-10">
                    <div className="grid gap-4">
                        <div className="flex items-center gap-2 rounded text-[11px] font-bold text-muted-foreground/80 bg-muted/20 p-2">
                            <Trophy className="h- w-3.5 text-primary" />
                            <span className="truncate tracking-tight">
                                {team.tournament ? team.tournament.name : tTeam("unassigned_badge")}
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-1 leading-relaxed">
                            {team.description || tTeam("no_description")}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
