'use client';

import React from "react";
import { Player, Team } from "@/types/index";
import {
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { User, Phone, Hash, Award } from "lucide-react";

interface PlayerDetailsViewProps {
    player: Player;
    team: Team;
}

export function PlayerDetailsView({ player, team }: PlayerDetailsViewProps) {
    const t = useTranslations("Roster");
    const photoUrl = player.global_player?.photo_url || player.photo_url;

    return (
        <>
            <div className="relative bg-primary/10 p-2 md:p-4">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-none">
                        {t("player") || "Player"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium text-base leading-relaxed">
                        {team.name}
                    </DialogDescription>
                </DialogHeader>
            </div>
            
            <div className="p-2 md:p-4 space-y-2 md:space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Profile Photo & Primary Stats */}
                <div className="flex flex-col items-center gap-2 md:gap-4 text-center border-b pb-2 md:pb-4">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-2 bg-muted/10 overflow-hidden flex items-center justify-center relative shadow-inner">
                        {photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={photoUrl}
                                alt={player.name}
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
                    
                    {/* section: player_sports */}
                    <div className="space-y-2 md:space-y-4">
                        <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="text-xs font-black tracking-widest text-primary">
                                Roster Info (player_sports)
                            </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black tracking-wider text-muted-foreground/50">Shirt Number</span>
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 border text-sm font-bold text-foreground rounded-sm">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground/40" />
                                    <span>{player.number ?? "-"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black tracking-wider text-muted-foreground/50">Position</span>
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 border text-sm font-bold text-foreground rounded-sm">
                                    <User className="h-3.5 w-3.5 text-muted-foreground/40" />
                                    <span>{player.position || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* section: player */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="text-xs font-black tracking-widest text-primary">
                                Tournament Profile (players)
                            </h4>
                        </div>
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black tracking-wider text-muted-foreground/50">Display Name</span>
                                <div className="px-3 py-2 bg-muted/10 border text-sm font-bold text-foreground rounded-sm">
                                    {player.name || "-"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black tracking-wider text-muted-foreground/50">Contact Phone</span>
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 border text-sm font-bold text-foreground rounded-sm">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
                                    <span>{player.tel || "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
