"use client";

import React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Player, Team } from "@/types/index";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { resolveStorageUrl } from "@/lib/storage-utils";

function getPlayerInitials(name?: string | null, firstName?: string | null, lastName?: string | null): string {
    const fName = (firstName || "").trim();
    const lName = (lastName && lastName !== "-" ? lastName : "").trim();

    if (fName && lName) {
        return `${fName.charAt(0)}${lName.charAt(0)}`.toUpperCase();
    }
    if (fName && !lName) {
        return fName.slice(0, 2).toUpperCase();
    }
    if (!name || !name.trim()) return "?";

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[1] !== "-") {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
}

export interface PlayerDetailsContentProps {
    player: Player;
    team: Team;
}

/**
 * Pure content view for player details, strictly following DESIGN.md
 */
export function PlayerDetailsContent({ player, team: _team }: PlayerDetailsContentProps) {
    const locale = useLocale();
    const isThai = locale === "th";
    const photoUrl = resolveStorageUrl(
        player.photo_url ||
        player.profile_img ||
        player.master_player?.profile_img ||
        player.global_player?.photo_url ||
        player.global_player?.profile_img
    );

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Profile Photo & Primary Stats */}
            <div className="flex flex-col items-center gap-3 text-center border-b pb-4">
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border border-border bg-transparent overflow-hidden flex items-center justify-center relative">
                    {photoUrl ? (
                        <Image
                            src={photoUrl}
                            alt={player.name}
                            width={96}
                            height={96}
                            className="h-full w-full object-cover rounded-full"
                        />
                    ) : (
                        <span className="text-2xl md:text-3xl font-black text-primary select-none">
                            {getPlayerInitials(player.name, player.first_name, player.last_name)}
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                        {player.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                        {player.position && (
                            <Badge variant="outline" className="text-xs font-bold px-2.5 py-0.5 border-border">
                                {player.position}
                            </Badge>
                        )}
                        <Badge variant="default" className="text-xs font-black tracking-wider px-2.5 py-0.5 bg-primary text-black">
                            #{player.number ?? "-"}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Profile Info Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Header level={4}>
                        {isThai ? "ข้อมูลนักกีฬาในทีม" : "Team Profile"}
                    </Header>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground">
                                {isThai ? "ชื่อแสดง" : "Display Name"}
                            </span>
                            <div className="px-3 py-2 bg-transparent border border-border text-sm font-bold text-foreground rounded-sm">
                                {player.name || "-"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-muted-foreground">
                                {isThai ? "เบอร์โทรศัพท์ติดต่อ" : "Contact Phone"}
                            </span>
                            <div className="flex items-center gap-2 px-3 py-2 bg-transparent border border-border text-sm font-bold text-foreground rounded-sm">
                                <span>{player.tel || "-"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export interface PlayerDetailsDialogProps {
    player: Player | null;
    team: Team;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PlayerDetailsDialog({
    player,
    team,
    open,
    onOpenChange,
}: PlayerDetailsDialogProps) {
    const locale = useLocale();
    const t = useTranslations("Roster");

    if (!player) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {t("player")} {t("in_team")} {team.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {locale === "th" ? "รายละเอียดนักกีฬา" : "Player details"}
                    </DialogDescription>
                </DialogHeader>

                <PlayerDetailsContent player={player} team={team} />
            </DialogContent>
        </Dialog>
    );
}

// Backwards-compatible alias for existing imports
export const PlayerDetailsView = PlayerDetailsContent;
