import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPES } from "./constants";
import { EventType, Player, MatchEvent } from "@/types";
import { useTranslations } from "next-intl";

interface MatchEventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: string;
    eventType: EventType | null;
    initialMinute: number;
    players: Player[]; // Players of the selected team
    existingEvents: MatchEvent[]; // To check for previous cards
    activeLineupIds?: string[]; // To highlight starting vs bench players
    onSave: (data: { minute: number; playerId: string; extraInfo: Record<string, unknown>; autoRed?: boolean }) => void;
}

export function MatchEventDialog({
    open,
    onOpenChange,
    teamId: _teamId,
    eventType,
    initialMinute,
    players,
    existingEvents,
    activeLineupIds,
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
            const timer = setTimeout(() => {
                setMinute(initialMinute.toString());
                setPlayerId("");
                setAssistPlayerId("");
                setSubInPlayerId("");
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open, initialMinute, eventType]);

    // Sort players: active (on field) first
    const sortedPlayers = [...players].sort((a, b) => {
        const aActive = activeLineupIds?.includes(a.id) ? 1 : 0;
        const bActive = activeLineupIds?.includes(b.id) ? 1 : 0;
        return bActive - aActive;
    });

    const getPlayerLabel = (player: Player) => {
        const numPart = player.number ? `#${player.number} ` : "";
        if (!activeLineupIds || activeLineupIds.length === 0) {
            return `${numPart}${player.name}`;
        }
        const isActive = activeLineupIds.includes(player.id);
        const statusText = isActive
            ? ` (${t("starting_players") || "Starting"})`
            : ` (${t("substitute_players") || "Bench"})`;
        return `${numPart}${player.name}${statusText}`;
    };

    const handleSave = () => {
        const min = parseInt(minute) || 0;
        const extraInfo: Record<string, unknown> = {};
        let autoRed = false;

        // Card Ban Logic: Check if player already has a yellow card
        if (eventType === 'yellow_card' && playerId && playerId !== 'unknown') {
            const previousYellows = existingEvents.filter(e =>
                e.player_id === playerId &&
                e.event_type === 'yellow_card'
            );

            if (previousYellows.length >= 1) {
                if (!confirm(t("second_yellow_warning") || "Player already has a yellow card. This will be recorded as a Second Yellow (Red Card). Proceed?")) {
                    return;
                }
                autoRed = true;
                extraInfo.is_second_yellow = true;
            }
        }

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
            extraInfo,
            autoRed
        });
        onOpenChange(false);
    };

    if (!eventType) return null;

    const eventConfig = EVENT_TYPES.find(t => t.type === eventType);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card p-0 rounded-xl overflow-hidden max-w-md">
                <DialogHeader className="p-2 md:p-4 border-b">
                    <DialogTitle className="flex items-center text-2xl font-black tracking-tighter">
                        {eventConfig?.label && t(eventConfig.label)}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                    {/* Time Input */}
                    <div className="space-y-1">
                        <Label>{t("time")}</Label>
                        <Input
                            value={minute}
                            onChange={e => setMinute(e.target.value)}
                            type="number"
                        />
                    </div>

                    {/* Player Selection */}
                    <div className="space-y-1">
                        <Label>{eventType === 'substitution' ? t("player_out") : t("player")}</Label>
                        <Select value={playerId} onValueChange={setPlayerId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("player_name")} />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedPlayers.map((player) => (
                                    <SelectItem key={player.id} value={player.id}>
                                        {getPlayerLabel(player)}
                                    </SelectItem>
                                ))}
                                <SelectItem value="unknown">
                                    {t("unknown_player")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Goal: Assist */}
                    {eventType === 'goal' && (
                        <div className="space-y-1">
                            <Label>{t("assist")}</Label>
                            <Select value={assistPlayerId} onValueChange={setAssistPlayerId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("no_assist")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t("no_assist")}</SelectItem>
                                    {sortedPlayers.map((player) => (
                                        <SelectItem key={player.id} value={player.id}>
                                            {getPlayerLabel(player)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Substitution: Player IN */}
                    {eventType === 'substitution' && (
                        <div className="space-y-1">
                            <Label>{t("player_in")}</Label>
                            <Select value={subInPlayerId} onValueChange={setSubInPlayerId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("select_player_in")} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-foreground/10">
                                    {sortedPlayers.map((player) => (
                                        <SelectItem key={player.id} value={player.id} className="focus:bg-primary focus:text-black font-black tracking-widest py-3">
                                            {getPlayerLabel(player)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-2 md:p-4 border-t">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!playerId}
                        className="w-full"
                    >
                        {tCommon("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
