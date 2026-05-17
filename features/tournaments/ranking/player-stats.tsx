"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { PlayerStat } from "@/lib/player-stats";
import { AlertTriangle, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

interface PlayerStatsProps {
    stats: PlayerStat[];
}

export function PlayerStats({ stats }: PlayerStatsProps) {
    const t = useTranslations("PlayerStats");

    if (stats.length === 0) {
        return (
            <EmptyState
                icon={Shield}
                title={t("no_stats")}
                description="Awaiting match events and player activity"
                className="py-12"
            />
        );
    }

    return (
        <div className="w-full overflow-x-auto border">
            <Table className="min-w-[600px] text-xs md:text-sm">
                <TableHeader>
                    <TableRow className="h-8 md:h-10">
                        <TableHead className="w-8 text-center px-0">#</TableHead>
                        <TableHead className="px-0">{t("player")}</TableHead>
                        <TableHead className="px-0">{t("team")}</TableHead>
                        <TableHead className="text-center px-0">{t("mp")}</TableHead>
                        <TableHead className="text-center px-0">{t("goals")}</TableHead>
                        <TableHead className="text-center px-0">{t("assists")}</TableHead>
                        <TableHead className="text-center px-0">{t("yellow_cards")}</TableHead>
                        <TableHead className="text-center px-0">{t("red_cards")}</TableHead>
                        <TableHead className="text-center px-0">{t("status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stats.map((stat, index) => (
                        <TableRow key={stat.playerId} className="h-8 md:h-10">
                            <TableCell className="text-center font-medium px-0">{index + 1}</TableCell>
                            <TableCell className="px-0 font-medium">
                                <div className="flex items-center gap-1">
                                    {stat.playerName}
                                    {stat.isBanned && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                </div>
                            </TableCell>
                            <TableCell className="px-0">
                                <div className="flex items-center gap-1">
                                    {stat.teamLogoUrl ? (
                                        <img src={stat.teamLogoUrl} alt="" width={16} height={16} className="w-4 h-4 p-1 object-contain" />
                                    ) : (
                                        <div className="w-4 h-4 bg-muted flex items-center justify-center text-[8px] font-bold">
                                            {stat.teamName?.charAt(0)}
                                        </div>
                                    )}
                                    <span className="truncate max-w-[80px] md:max-w-none text-muted-foreground text-xs">
                                        {stat.teamName}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center px-0">{stat.matchesPlayed}</TableCell>
                            <TableCell className="text-center px-0 font-bold">{stat.goals}</TableCell>
                            <TableCell className="text-center px-0">{stat.assists}</TableCell>
                            <TableCell className="text-center px-0">{stat.yellowCards || "-"}</TableCell>
                            <TableCell className="text-center px-0">{stat.redCards || "-"}</TableCell>
                            <TableCell className="text-center px-0">
                                {stat.isBanned ? (
                                    <Badge variant="destructive" className="text-[10px] h-5">
                                        <Shield className="h-3 w-3 mr-0.5" />
                                        {t("banned")}
                                    </Badge>
                                ) : (
                                    <span className="text-green-600">✓</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
