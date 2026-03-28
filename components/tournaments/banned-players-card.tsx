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
        <div className="border border-red-200 dark:border-red-900/50 rounded-none p-8 bg-red-50/50 dark:bg-red-950/20 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            <h4 className="text-2xl font-black uppercase italic tracking-tighter text-red-700 dark:text-red-400 flex items-center gap-2 mb-4 relative z-10">
                <Shield className="h-5 w-5" />
                {t("title")} ({bannedPlayers.length})
            </h4>
            <div className="space-y-3 relative z-10">
                {bannedPlayers.map(player => (
                    <div key={player.playerId} className="flex items-center justify-between text-sm py-2 border-b border-red-200/50 last:border-0">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="font-black italic uppercase tracking-tighter text-red-900 dark:text-red-200">{player.playerName}</span>
                            <span className="text-[10px] font-bold uppercase text-red-700/60 dark:text-red-400/60">{player.teamName}</span>
                        </div>
                        <Badge variant="outline" className="rounded-none text-[10px] font-black uppercase italic text-red-600 border-red-300 bg-white/50 dark:bg-black/20">
                            {player.banReason}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
}
