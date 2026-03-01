"use client";

import { PlayerStat } from "@/utils/player-stats";
import { AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface BannedPlayersCardProps {
    bannedPlayers: PlayerStat[];
}

export function BannedPlayersCard({ bannedPlayers }: BannedPlayersCardProps) {
    const t = useTranslations("BannedPlayers");

    if (bannedPlayers.length === 0) return null;

    return (
        <div className="border border-red-200 dark:border-red-900/50 rounded-none p-4 bg-red-50/50 dark:bg-red-950/20">
            <h4 className="font-semibold text-sm text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4" />
                {t("title")} ({bannedPlayers.length})
            </h4>
            <div className="space-y-2">
                {bannedPlayers.map(player => (
                    <div key={player.playerId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="font-medium">{player.playerName}</span>
                            <span className="text-xs text-muted-foreground">({player.teamName})</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] h-5 text-red-600 border-red-300">
                            {player.banReason}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
}
