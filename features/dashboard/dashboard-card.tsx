"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { cn, getTeamInitials } from "@/lib/utils";
import { Card } from "@/components/ui/card";

import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { Tournament, Team } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getLandingSportIcon } from "@/components/shared/sport-icons";
import { resolveStorageUrl } from "@/lib/storage-utils";


interface DashboardCardProps {
    type: 'tournament' | 'team';
    data: Tournament | Team;
    userPlan?: string;
    mode?: 'organizer' | 'team';
}

export function DashboardCard({ type, data, mode }: DashboardCardProps) {
    const tDashboard = useTranslations("Dashboard");
    const tSettings = useTranslations("Settings");
    const tTeam = useTranslations("Team");
    const locale = useLocale();

    if (type === 'tournament') {
        const tournament = data as Tournament & { current_teams?: number };
        const statusColors: Record<string, string> = {
            active: "bg-primary/10 text-primary border-primary/50",
            ongoing: "bg-primary/10 text-primary border-primary/50",
            registration_open: "bg-primary/10 text-primary border-primary/50",
            open: "bg-primary/10 text-primary border-primary/50",
            upcoming: "bg-warning/10 text-warning border-warning/50",
            completed: "bg-node-3/10 text-node-3 border-node-3/50",
            finished: "bg-node-3/10 text-node-3 border-node-3/50",
            closed: "bg-destructive/10 text-destructive border-destructive/50",
            full: "bg-destructive/10 text-destructive border-destructive/50",
            draft: "bg-warning/10 text-warning border-warning/50",
        };

        const statusColor = (tournament.status && statusColors[tournament.status]) || statusColors.draft;
        const coverUrl = resolveStorageUrl(tournament.cover_img || tournament.banner_url);
        const sportVal = tournament.sport || (tournament as any).sport_name || (tournament as any).sports?.sport_name;

        const getStatusLabel = (status?: string | null) => {
            if (!status) return tSettings('draft');
            try {
                return tSettings(status as any);
            } catch {
                return status;
            }
        };



        const dateStr = tournament.start_date && tournament.end_date ? (
            tournament.start_date === tournament.end_date
                ? formatDate(tournament.start_date, "d MMMM yyyy", locale)
                : `${formatDate(tournament.start_date, "d MMMM yyyy", locale)} - ${formatDate(tournament.end_date, "d MMMM yyyy", locale)}`
        ) : null;

        const resolvedTournamentLogo = resolveStorageUrl(tournament.logo_img || tournament.logo_url);

        const tournamentRole = (tournament as any).role;
        const isStaffMember = tournamentRole && tournamentRole !== 'owner';
        const getRoleBadgeLabel = (role: string) => {
            const isTh = locale === "th";
            const norm = role.toLowerCase().trim();
            if (norm === "co_organizer" || norm === "co-organizer") return isTh ? "ผู้ร่วมจัด" : "Co-Organizer";
            if (norm === "referee") return isTh ? "ผู้ตัดสิน" : "Referee";
            if (norm === "staff") return isTh ? "ทีมงาน" : "Staff";
            return role.replace(/_/g, ' ');
        };

        return (
            <Link href={`/dashboard/tournaments/${tournament.id}`} className="block h-full group">
                <Card className="flex flex-col justify-between h-full bg-card border rounded-sm transition-all hover:border-primary/50 hover:shadow-md overflow-hidden relative cursor-pointer min-h-[160px] p-4 gap-4">
                    {/* Background Cover Image */}
                    {coverUrl ? (
                        <>
                            <img
                                src={coverUrl}
                                alt={tournament.name}
                                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            />
                            {/* Dark Gradient Overlay for optimal readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40 pointer-events-none" />
                        </>
                    ) : (
                        <>
                            {/* Top-left subtle emerald gradient glow fallback */}
                            <div className="absolute -top-8 -left-8 w-36 h-36 bg-emerald-400/25 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent pointer-events-none" />

                            {/* Bottom-right watermark logo fallback */}
                            <div className="absolute -right-14 -bottom-14 w-36 h-36 sm:w-44 sm:h-44 pointer-events-none select-none opacity-5 dark:opacity-5 overflow-hidden flex items-center justify-center">
                                {resolvedTournamentLogo ? (
                                    <img
                                        src={resolvedTournamentLogo}
                                        alt=""
                                        className="w-full h-full object-cover grayscale rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full flex items-center justify-center text-8xl font-black text-foreground">
                                        {getTeamInitials(tournament.name)}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Top Row: Tournament Profile/Logo & Status / Role Badges */}
                    <div className="flex items-start justify-between relative z-10">
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border border-background/80 dark:border-border/60 rounded-full shadow-xs bg-white dark:bg-muted p-1 shrink-0 overflow-hidden">
                            <AvatarImage src={resolvedTournamentLogo ?? undefined} alt={tournament.name} className="object-contain rounded-full w-full h-full" />
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-lg rounded-full flex items-center justify-center w-full h-full">
                                {getTeamInitials(tournament.name)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {isStaffMember && (
                                <Badge
                                    variant="outline"
                                    className="capitalize backdrop-blur-xs border shadow-xs bg-primary text-primary-foreground border-primary/40"
                                >
                                    {getRoleBadgeLabel(tournamentRole)}
                                </Badge>
                            )}
                            <Badge
                                variant="outline"
                                className={cn(
                                    "capitalize backdrop-blur-xs border shadow-xs",
                                    coverUrl ? "bg-black/60 text-white border-white/20" : statusColor
                                )}
                            >
                                {getStatusLabel(tournament.status)}
                            </Badge>
                        </div>
                    </div>

                    {/* Bottom Info: Tournament Name, Description/Dates & Sport Icon at Bottom Right */}
                    <div className="flex items-end justify-between gap-2 relative z-10">
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <h3 className={cn(
                                "text-xl md:text-2xl font-black tracking-tight line-clamp-1 group-hover:text-primary transition-colors",
                                coverUrl ? "text-white" : "text-foreground"
                            )}>
                                {tournament.name}
                            </h3>

                            <p className={cn(
                                "text-xs line-clamp-2 leading-relaxed",
                                coverUrl ? "text-gray-200/90" : "text-muted-foreground"
                            )}>
                                {dateStr || tournament.description || (mode === 'organizer' ? tDashboard('manage_tournament_desc') : tDashboard('view_tournament_desc'))}
                            </p>
                        </div>

                        {/* Sport Icon (Bottom Right) */}
                        <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-xs border backdrop-blur-xs transition-colors",
                            coverUrl
                                ? "bg-black/60 text-white border-white/20"
                                : "bg-muted/50 text-foreground border-border/60"
                        )}>
                            {getLandingSportIcon(sportVal, "h-4 w-4")}
                        </div>
                    </div>
                </Card>
            </Link>
        );
    }


    return (
        <TeamCard
            team={data as Team & { tournament?: { name: string } | null }}
            locale={locale}
            tTeam={tTeam}
        />
    );
}

function TeamCard({
    team,
    locale,
    tTeam
}: {
    team: Team & { tournament?: { name: string } | null };
    locale: string;
    tTeam: any;
}) {
    const resolvedTeamLogo = resolveStorageUrl(team.logo_url);
    const [teamHref, setTeamHref] = useState(`/dashboard/teams/${team.id}`);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("squad_view_mode");
            const mode = saved === "grid" || saved === "list" ? saved : "list";
            setTeamHref(`/dashboard/teams/${team.id}?view=${mode}`);
        } catch {}
    }, [team.id]);

    return (
        <Link href={teamHref} className="block h-full group">
            <Card className="flex flex-col justify-between h-full bg-card border rounded-sm transition-all hover:border-primary/50 hover:shadow-md overflow-hidden relative cursor-pointer p-4 gap-4 min-h-[160px]">
                {/* Top-left subtle emerald gradient glow */}
                <div className="absolute -top-8 -left-8 w-36 h-36 bg-emerald-400/25 dark:bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent pointer-events-none" />

                {/* Bottom-right watermark logo */}
                <div className="absolute -right-14 -bottom-14 w-36 h-36 sm:w-44 sm:h-44 pointer-events-none select-none opacity-5 dark:opacity-5 overflow-hidden flex items-center justify-center">
                    {resolvedTeamLogo ? (
                        <img
                            src={resolvedTeamLogo}
                            alt=""
                            className="w-full h-full object-cover grayscale rounded-full"
                        />
                    ) : (
                        <div className="w-full h-full rounded-full flex items-center justify-center text-8xl font-black text-foreground">
                            {getTeamInitials(team.name)}
                        </div>
                    )}
                </div>

                {/* Top Row: Avatar & Landing Sport Icon Badge */}
                <div className="flex items-start justify-between relative z-10">
                    <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border border-background/80 dark:border-border/60 rounded-full shadow-xs bg-white dark:bg-muted p-1 shrink-0 overflow-hidden">
                        <AvatarImage src={resolvedTeamLogo ?? undefined} alt={team.name} className="object-contain rounded-full w-full h-full" />
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-xl rounded-full flex items-center justify-center w-full h-full">
                            {getTeamInitials(team.name)}
                        </AvatarFallback>
                    </Avatar>


                    <div className="h-9 w-9 rounded-full bg-muted/50 text-foreground border border-border/60 flex items-center justify-center shrink-0 shadow-xs backdrop-blur-xs">
                        {getLandingSportIcon(team.sport || team.sport_name || (team as any).sport_id, "h-4 w-4")}
                    </div>

                </div>

                {/* Bottom Info: Team Name & Description */}
                <div className="flex flex-col gap-1.5 relative z-10">
                    <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {team.name}
                    </h3>
                    <p className="text-sm font-medium text-foreground/80 dark:text-muted-foreground line-clamp-1 leading-relaxed">
                        {team.description || (locale === 'th' ? "ยังไม่มีคำอธิบายทีม" : tTeam("no_description"))}
                    </p>
                </div>
            </Card>
        </Link>
    );
}

