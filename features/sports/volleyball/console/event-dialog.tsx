"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Player } from "@/types";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

interface VolleyballEventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamSide: 'home' | 'away';
    teamName?: string;
    eventType: 'ace' | 'spike' | 'block' | 'point' | null;
    players: Player[];
    activeLineupIds?: string[];
    onSave: (data: { playerId: string; playerName?: string }) => void;
}

export function VolleyballEventDialog({
    open,
    onOpenChange,
    teamSide,
    teamName,
    eventType,
    players,
    activeLineupIds = [],
    onSave
}: VolleyballEventDialogProps) {
    const tCommon = useTranslations("Common");

    const [playerId, setPlayerId] = useState<string>("");

    if (!eventType) return null;

    const startingPlayers = activeLineupIds.length > 0
        ? players.filter(p => activeLineupIds.includes(p.id))
        : players;

    const benchPlayers = activeLineupIds.length > 0
        ? players.filter(p => !activeLineupIds.includes(p.id))
        : [];

    const getPlayerLabel = (player: Player) => {
        const numPart = player.number ? `#${player.number} ` : "";
        return `${numPart}${player.name}`;
    };

    const handleSave = () => {
        const selectedPlayer = players.find(p => p.id === playerId);
        onSave({
            playerId: playerId === 'unknown' ? '' : playerId,
            playerName: selectedPlayer ? selectedPlayer.name : undefined
        });
        onOpenChange(false);
    };

    return (
        <Dialog key={`${open}-${eventType}`} open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="bg-card rounded-sm overflow-hidden max-w-md">
                <DialogHeader className="relative pr-10 p-3 md:p-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tighter capitalize">
                        <span>{eventType.toUpperCase()} - {teamName || (teamSide === 'home' ? 'Home' : 'Away')}</span>
                    </DialogTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="p-3 md:p-4 space-y-3">
                    {/* Player Selection */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold tracking-wider">เลือกผู้เล่น (Player)</Label>
                        <Select value={playerId} onValueChange={setPlayerId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="เลือกผู้เล่นทำคะแนน" />
                            </SelectTrigger>
                            <SelectContent>
                                {startingPlayers.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-[10px] font-black text-muted-foreground tracking-widest bg-muted/40">
                                            ผู้เล่นตัวจริง (Lineup)
                                        </div>
                                        {startingPlayers.map((player) => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {getPlayerLabel(player)}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}

                                {benchPlayers.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-[10px] font-black text-muted-foreground tracking-widest bg-muted/40">
                                            ผู้เล่นสำรอง (Bench)
                                        </div>
                                        {benchPlayers.map((player) => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {getPlayerLabel(player)}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}

                                <SelectItem value="unknown">
                                    ไม่ระบุชื่อ (Unknown Player)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="p-3 md:p-4 border-t">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!playerId}
                        className="w-full font-bold"
                    >
                        {tCommon("save") || "บันทึกข้อมูล"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
