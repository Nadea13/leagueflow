'use client';

import React from "react";
import Image from "next/image";
import { Player, Team } from "@/types/index";
import {
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";

interface PlayerDetailsViewProps {
    player: Player;
    team: Team;
}

export function PlayerDetailsView({ player, team }: PlayerDetailsViewProps) {
    const t = useTranslations("Roster");
    const photoUrl = player.global_player?.photo_url || player.photo_url;

    return (
        <div className="bg-card">
            <div className="relative border-b p-2 md:p-4">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">
                        <span>{t("player")} {t("in_team")} {team.name}</span>
                    </DialogTitle>
                </DialogHeader>
            </div>

            <div className="p-2 md:p-4 space-y-2 md:space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Profile Photo & Primary Stats */}
                <div className="flex flex-col items-center gap-2 md:gap-4 text-center border-b pb-2 md:pb-4">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-2 bg-muted/10 overflow-hidden flex items-center justify-center relative shadow-inner">
                        {photoUrl ? (
                            <Image
                                src={photoUrl}
                                alt={player.name}
                                width={96}
                                height={96}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                        )}
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-2xl font-black tracking-tight text-foreground">
                            {player.name}
                        </h3>
                        <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="text-xs font-black tracking-wider px-2.5 py-0.5 bg-muted text-muted-foreground border">
                                {player.position || "N/A"}
                            </Badge>
                            <Badge variant="default" className="text-xs font-black tracking-wider px-2.5 py-0.5 bg-primary text-black">
                                #{player.number ?? "-"}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="space-y-2 md:space-y-4">
                    {/* section: player */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black tracking-widest">
                                Team Profile (players)
                            </h4>
                        </div>
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <span className="text-xs font-black tracking-wider text-muted-foreground/50">Display Name</span>
                                <div className="px-3 py-2 bg-muted/10 border text-sm font-bold text-foreground rounded-sm">
                                    {player.name || "-"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-black tracking-wider text-muted-foreground/50">Contact Phone</span>
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 border text-sm font-bold text-foreground rounded-sm">
                                    <span>{player.tel || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
