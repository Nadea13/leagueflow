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
    allPlayers?: Player[]; // All players (for assist usually, though custom requires team specific)
    existingEvents: MatchEvent[]; // To check for previous cards
    onSave: (data: { minute: number; playerId: string; extraInfo: any; autoRed?: boolean }) => void;
}

export function MatchEventDialog({
    open,
    onOpenChange,
    teamId,
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
            setMinute(initialMinute.toString());
            setPlayerId("");
            setAssistPlayerId("");
            setSubInPlayerId("");
        }
    }, [open, initialMinute, eventType]);

    const handleSave = () => {
        const min = parseInt(minute) || 0;
        const extraInfo: any = {};
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
            <DialogContent className="bg-[#0A0A0B] border-white/5 p-0 overflow-hidden max-w-md rounded-none">
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary/50 via-secondary to-secondary/50" />
                
                <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="flex items-center gap-4 text-2xl font-black uppercase italic tracking-tighter text-white">
                        <div className={cn("p-2 bg-white/5 border border-white/10", eventConfig?.color)}>
                            {Icon && <Icon className="h-6 w-6" />}
                        </div>
                        {eventConfig?.label && t(eventConfig.label)}
                    </DialogTitle>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-2 italic">CONFIGURE MATCH EVENT DATA</p>
                </DialogHeader>

                <div className="px-8 py-6 space-y-8 relative">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 -rotate-12 translate-x-12 -translate-y-12 pointer-events-none" />

                    {/* Time Input */}
                    <div className="space-y-3 relative z-10">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-secondary italic">{t("time")}</Label>
                        <Input
                            value={minute}
                            onChange={e => setMinute(e.target.value)}
                            className="h-12 bg-white/5 border-white/5 focus:border-secondary/50 focus:ring-secondary/20 rounded-none font-black italic text-xl text-white transition-all"
                            type="number"
                        />
                    </div>

                    {/* Player Selection */}
                    <div className="space-y-3 relative z-10">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-secondary italic">
                            {eventType === 'substitution' ? t("player_out") : t("player")}
                        </Label>
                        <Select value={playerId} onValueChange={setPlayerId}>
                            <SelectTrigger className="h-12 bg-white/5 border-white/5 focus:ring-secondary/20 rounded-none font-black uppercase italic tracking-widest text-white transition-all">
                                <SelectValue placeholder={t("player_name")} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A0A0B] border-white/10 rounded-none">
                                {players.map((player) => (
                                    <SelectItem key={player.id} value={player.id} className="focus:bg-secondary focus:text-black font-black uppercase italic tracking-widest py-3">
                                        {player.number ? `#${player.number} ` : ""}{player.name}
                                    </SelectItem>
                                ))}
                                <SelectItem value="unknown" className="focus:bg-secondary focus:text-black font-black uppercase italic tracking-widest py-3">
                                    {t("unknown_player")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Goal: Assist */}
                    {eventType === 'goal' && (
                        <div className="space-y-3 relative z-10">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-secondary italic">{t("assist")}</Label>
                            <Select value={assistPlayerId} onValueChange={setAssistPlayerId}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/5 focus:ring-secondary/20 rounded-none font-black uppercase italic tracking-widest text-white transition-all">
                                    <SelectValue placeholder={t("no_assist")} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0A0A0B] border-white/10 rounded-none">
                                    <SelectItem value="none" className="focus:bg-secondary focus:text-black font-black uppercase italic tracking-widest py-3">{t("no_assist")}</SelectItem>
                                    {players.map((player) => (
                                        <SelectItem key={player.id} value={player.id} className="focus:bg-secondary focus:text-black font-black uppercase italic tracking-widest py-3">
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
                            <Label className="text-[10px] font-black uppercase tracking-widest text-secondary italic">{t("player_in")}</Label>
                            <Select value={subInPlayerId} onValueChange={setSubInPlayerId}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/5 focus:ring-secondary/20 rounded-none font-black uppercase italic tracking-widest text-white transition-all">
                                    <SelectValue placeholder={t("select_player_in")} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0A0A0B] border-white/10 rounded-none">
                                    {players.map((player) => (
                                        <SelectItem key={player.id} value={player.id} className="focus:bg-secondary focus:text-black font-black uppercase italic tracking-widest py-3">
                                            {player.number ? `#${player.number} ` : ""}{player.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 bg-white/5 flex flex-row gap-4 items-center sm:justify-start">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-12 rounded-none text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {tCommon("cancel")}
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleSave} 
                        disabled={!playerId}
                        className="flex-1 h-12 rounded-none bg-secondary text-black hover:bg-secondary/80 text-[10px] font-black uppercase tracking-widest transition-all skew-x-[-12deg] disabled:opacity-50 disabled:skew-x-0"
                    >
                        <span className="skew-x-[12deg] inline-block">{tCommon("save")}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
