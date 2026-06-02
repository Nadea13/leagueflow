"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Users, Trophy, Calendar } from "lucide-react";
import { formatDate } from "date-fns";
import { useTranslations } from "next-intl";

import { Tournament, Registration } from "@/types";

interface TournamentOverviewProps {
    tournament: Tournament;
    allApprovedRegistrations: Registration[] | null;
}

export function TournamentOverview({ tournament, allApprovedRegistrations }: TournamentOverviewProps) {
    const tCommon = useTranslations("Common");
    const tSettings = useTranslations("Settings");
    const t = useTranslations("Registration");

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-black tracking-tighter text-foreground">
                    {tCommon("overview")}
                </h3>
            </div>
            <div className="relative overflow-hidden">
                <div className="space-y-2 md:space-y-3 relative z-10">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-black tracking-wider border-b pb-3">
                            <span className="text-muted-foreground/60 flex items-center gap-2">
                                <Trophy className="h-4 w-4" /> {tCommon("format")}
                            </span>
                            <span className="text-foreground">{tSettings(tournament.format)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black tracking-wider border-b pb-3">
                            <span className="text-muted-foreground/60 flex items-center gap-2">
                                <Users className="h-4 w-4" /> {tCommon("teams")}
                            </span>
                            <span className="text-foreground">{tournament.max_teams}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black tracking-wider border-b pb-3">
                            <span className="text-muted-foreground/60 flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> {tCommon("date")}
                            </span>
                            <span className="text-foreground">
                                {tournament.start_date ? formatDate(new Date(tournament.start_date), "MMM d, yyyy") : "TBD"}
                            </span>
                        </div>
                    </div>

                    {tournament.description && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black tracking-wider">
                                <span className="text-xs font-black tracking-widest text-primary">
                                    {tCommon("description")}
                                </span>
                            </div>
                            <div
                                className="prose text-xs leading-relaxed text-muted-foreground/80 tracking-tight whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: tournament.description }}
                            />
                        </div>
                    )}

                    <div className="space-y-2 md:space-y-3 pt-2 md:pt-3 border-t">
                        <div className="flex items-center gap-2 text-xs font-black tracking-wider">
                            <span className="text-xs font-black tracking-widest text-primary">
                                {t("registered_teams")}
                            </span>
                            {allApprovedRegistrations && allApprovedRegistrations.length > 0 && (
                                <Badge variant="default" className="text-[10px] h-4 min-w-4 px-1 flex items-center justify-center font-black">
                                    {allApprovedRegistrations.length}
                                </Badge>
                            )}
                        </div>

                        {allApprovedRegistrations && allApprovedRegistrations.length > 0 ? (
                            <div className="space-y-2">
                                {allApprovedRegistrations.map((reg, i) => (
                                    <div key={i} className="flex items-center gap-2 group border-b border-foreground/[0.03] pb-2 last:border-0 last:pb-0">
                                        <div className="w-10 h-10 border flex items-center justify-center p-1 transition-all shrink-0">
                                            {reg.logo_url ? (
                                                <Image
                                                    src={reg.logo_url}
                                                    alt={reg.team_name}
                                                    width={40}
                                                    height={40}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <Users className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50" />
                                            )}
                                        </div>
                                        <span className="text-sm font-black tracking-tighter text-muted-foreground/70 group-hover:text-foreground transition-colors truncate">
                                            {reg.team_name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-muted-foreground/40 tracking-wider italic">
                                {t("no_teams_registered")}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
