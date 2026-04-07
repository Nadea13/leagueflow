"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlayerStat } from "@/lib/player-stats";
import { AlertTriangle, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

interface PlayerStatsTableProps {
    stats: PlayerStat[];
}

export function PlayerStatsTable({ stats }: PlayerStatsTableProps) {
    const t = useTranslations("PlayerStats");

    if (stats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">{t("no_stats")}</h3>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto rounded-none border">
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
                                        <img src={stat.teamLogoUrl} alt="" className="w-4 h-4 object-contain" />
                                    ) : (
                                        <div className="w-4 h-4 bg-muted rounded-none flex items-center justify-center text-[8px] font-bold">
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
