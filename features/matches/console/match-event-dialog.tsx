import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPES } from "./constants";
import { EventType, Player, MatchEvent } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface MatchEventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: string;
    eventType: EventType | null;
    initialMinute: number;
    players: Player[]; // Players of the selected team
    existingEvents: MatchEvent[]; // To check for previous cards
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
    const Icon = eventConfig?.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-foreground/5 p-0 overflow-hidden max-w-md rounded-none space-y-2 md:space-y-3">
                <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-3">
                    <DialogTitle className="flex items-center gap-2 md:gap-3 text-2xl font-black tracking-tighter text-foreground">
                        <div className={cn("p-2 bg-foreground/5 border border-foreground/10", eventConfig?.color)}>
                            {Icon && <Icon className="h-6 w-6" />}
                        </div>
                        {eventConfig?.label && t(eventConfig.label)}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 md:px-6 space-y-2 md:space-y-3 relative">
                    {/* Time Input */}
                    <div className="space-y-3 relative z-10">
                        <Label className="text-[10px] font-black tracking-widest text-primary">{t("time")}</Label>
                        <Input
                            value={minute}
                            onChange={e => setMinute(e.target.value)}
                            className="h-10 bg-foreground/5 border-foreground/5 focus:border-primary/50 focus:ring-primary/20 rounded-none font-black text-xl text-foreground transition-all"
                            type="number"
                        />
                    </div>

                    {/* Player Selection */}
                    <div className="space-y-2 md:space-y-3 relative z-10">
                        <Label className="text-[10px] font-black tracking-widest text-primary">
                            {eventType === 'substitution' ? t("player_out") : t("player")}
                        </Label>
                        <Select value={playerId} onValueChange={setPlayerId}>
                            <SelectTrigger className="h-10 bg-foreground/5 border-foreground/5 focus:ring-primary/20 rounded-none font-black tracking-widest text-foreground transition-all">
                                <SelectValue placeholder={t("player_name")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-foreground/10 rounded-none">
                                {players.map((player) => (
                                    <SelectItem key={player.id} value={player.id} className="focus:bg-primary focus:text-black font-black tracking-widest py-3">
                                        {player.number ? `#${player.number} ` : ""}{player.name}
                                    </SelectItem>
                                ))}
                                <SelectItem value="unknown" className="focus:bg-primary focus:text-black font-black tracking-widest py-3">
                                    {t("unknown_player")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Goal: Assist */}
                    {eventType === 'goal' && (
                        <div className="space-y-3 relative z-10">
                            <Label className="text-[10px] font-black tracking-widest text-primary">{t("assist")}</Label>
                            <Select value={assistPlayerId} onValueChange={setAssistPlayerId}>
                                <SelectTrigger className="h-12 bg-foreground/5 border-foreground/5 focus:ring-primary/20 rounded-none font-black tracking-widest text-foreground transition-all">
                                    <SelectValue placeholder={t("no_assist")} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-foreground/10 rounded-none">
                                    <SelectItem value="none" className="focus:bg-primary focus:text-black font-black tracking-widest py-3">{t("no_assist")}</SelectItem>
                                    {players.map((player) => (
                                        <SelectItem key={player.id} value={player.id} className="focus:bg-primary focus:text-black font-black tracking-widest py-3">
                                            {player.number ? `#${player.number} ` : ""}{player.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Substitution: Player IN */}
                    {eventType === 'substitution' && (
                        <div className="space-y-3 relative z-10">
                            <Label className="text-[10px] font-black tracking-widest text-primary">{t("player_in")}</Label>
                            <Select value={subInPlayerId} onValueChange={setSubInPlayerId}>
                                <SelectTrigger className="h-12 bg-foreground/5 border-foreground/5 focus:ring-primary/20 rounded-none font-black tracking-widest text-foreground transition-all">
                                    <SelectValue placeholder={t("select_player_in")} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-foreground/10 rounded-none">
                                    {players.map((player) => (
                                        <SelectItem key={player.id} value={player.id} className="focus:bg-primary focus:text-black font-black tracking-widest py-3">
                                            {player.number ? `#${player.number} ` : ""}{player.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-4 md:px-6 pb-4 md:pb-6 pt-2 md:pt-3 bg-card flex flex-row gap-4 items-center sm:justify-start">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-12 rounded-none text-[10px] font-black tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleSave} 
                        disabled={!playerId}
                        className="flex-1 h-12 rounded-none bg-primary text-black hover:bg-primary/80 text-[10px] font-black tracking-widest transition-all disabled:opacity-50"
                    >
                        <span className="inline-block">{tCommon("save")}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
