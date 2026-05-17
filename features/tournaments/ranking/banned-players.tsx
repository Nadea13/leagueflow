"use client";

import { PlayerStat } from "@/lib/player-stats";
import { AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface BannedPlayersProps {
    bannedPlayers: PlayerStat[];
}

export function BannedPlayers({ bannedPlayers }: BannedPlayersProps) {
    const t = useTranslations("BannedPlayers");

    if (bannedPlayers.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-3">
                    <Shield className="h-5 w-5 text-red-600" />
                    {t("title")} <span className="text-muted-foreground/40 text-sm ml-1">[{bannedPlayers.length}]</span>
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground/60">Automated disciplinary tracking</p>
            </div>

            <div className="bg-background border relative overflow-hidden group hover:bg-muted/2 transition-colors shadow-xl shadow-black/20">
                <div className="absolute top-0 left-0 z-30 w-1 h-full bg-red-600" />
                
                <div className="space-y-4 relative z-10">
                    {bannedPlayers.map(player => (
                        <div key={player.playerId} className="flex items-center justify-between group/item p-3 border border-foreground/5 hover:bg-foreground/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-600/10 text-red-600">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black tracking-tighter text-foreground text-lg leading-none">{player.playerName}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest mt-1">{player.teamName}</span>
                                </div>
                            </div>
                            <Badge variant="outline" className="px-3 py-1 text-[10px] font-black text-red-600 border-red-600/30 bg-red-600/5">
                                {player.banReason}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
