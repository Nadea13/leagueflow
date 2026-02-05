import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPES } from "./constants";
import { EventType, Player } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface MatchEventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: string;
    eventType: EventType | null;
    initialMinute: number;
    players: Player[]; // Players of the selected team
    allPlayers?: Player[]; // All players (for assist usually, though custom requires team specific)
    // Actually assist is usually same team.
    onSave: (data: { minute: number; playerId: string; extraInfo: any }) => void;
}

export function MatchEventDialog({
    open,
    onOpenChange,
    teamId,
    eventType,
    initialMinute,
    players,
    onSave
}: MatchEventDialogProps) {
    const t = useTranslations("Console");
    const tCommon = useTranslations("Common");

    const [minute, setMinute] = useState<string>("");
    const [playerId, setPlayerId] = useState<string>("");
    const [assistPlayerId, setAssistPlayerId] = useState<string>("");
    const [subInPlayerId, setSubInPlayerId] = useState<string>("");

    useEffect(() => {
        if (open) {
            setMinute(initialMinute.toString());
            setPlayerId("");
            setAssistPlayerId("");
            setSubInPlayerId("");
        }
    }, [open, initialMinute, eventType]);

    const handleSave = () => {
        const min = parseInt(minute) || 0;
        const extraInfo: any = {};

        if (eventType === 'goal' && assistPlayerId && assistPlayerId !== 'none') {
            extraInfo.assist_player_id = assistPlayerId;
        }
        if (eventType === 'substitution') {
            extraInfo.out_player_id = playerId;
            extraInfo.in_player_id = subInPlayerId;
        }

        onSave({
            minute: min,
            playerId,
            extraInfo
        });
        onOpenChange(false);
    };

    if (!eventType) return null;

    const eventConfig = EVENT_TYPES.find(t => t.type === eventType);
    const Icon = eventConfig?.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {Icon && <Icon className={cn("h-5 w-5", eventConfig?.color)} />}
                        {eventConfig?.label}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Time Input */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">{t("time")}</Label>
                        <Input
                            value={minute}
                            onChange={e => setMinute(e.target.value)}
                            className="col-span-3"
                            type="number"
                        />
                    </div>

                    {/* Player Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">
                            {eventType === 'substitution' ? "Player OUT" : t("player")}
                        </Label>
                        <div className="col-span-3">
                            <Select value={playerId} onValueChange={setPlayerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("player_name")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {players.map((player) => (
                                        <SelectItem key={player.id} value={player.id}>
                                            {player.number ? `#${player.number} ` : ""}{player.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="unknown">Unknown Player</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Goal: Assist */}
                    {eventType === 'goal' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">{t("assist")}</Label>
                            <div className="col-span-3">
                                <Select value={assistPlayerId} onValueChange={setAssistPlayerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("no_assist")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t("no_assist")}</SelectItem>
                                        {players.map((player) => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {player.number ? `#${player.number} ` : ""}{player.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Substitution: Player IN */}
                    {eventType === 'substitution' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Player IN</Label>
                            <div className="col-span-3">
                                <Select value={subInPlayerId} onValueChange={setSubInPlayerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Player In" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {players.map((player) => (
                                            <SelectItem key={player.id} value={player.id}>
                                                {player.number ? `#${player.number} ` : ""}{player.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{tCommon("cancel")}</Button>
                    <Button type="button" onClick={handleSave} disabled={!playerId}>{tCommon("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
