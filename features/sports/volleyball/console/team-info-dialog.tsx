"use client";

import { MatchEvent, Player } from "@/types";
import { useLocale } from "next-intl";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Users,
    Zap,
    Flame,
    ShieldCheck,
    Phone,
    User,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

interface VolleyballTeamInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamName: string;
    teamLogo?: string | null;
    description?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    players: Player[];
    activeLineupIds?: string[];
    events?: MatchEvent[];
    teamId?: string | null;
}

export function VolleyballTeamInfoDialog({
    open,
    onOpenChange,
    teamName,
    teamLogo,
    description,
    contactName,
    contactPhone,
    players = [],
    activeLineupIds = [],
    events = [],
    teamId
}: VolleyballTeamInfoDialogProps) {
    const locale = useLocale();

    // Filter events related to this team
    const pointTypes = ['point', 'ace', 'spike', 'block'];
    const teamEvents = events.filter(e => {
        if (!pointTypes.includes(e.event_type)) return false;
        if (teamId && e.team_id) return e.team_id === teamId;
        const extraText = (e.extra_info as Record<string, unknown> | null)?.text as string || "";
        if (teamName && extraText.includes(teamName)) return true;
        return false;
    });

    const totalPoints = teamEvents.length;
    const aces = teamEvents.filter(e => e.event_type === 'ace').length;
    const spikes = teamEvents.filter(e => e.event_type === 'spike').length;
    const blocks = teamEvents.filter(e => e.event_type === 'block').length;

    // Per-player stats map
    const playerStatsMap = new Map<string, { total: number; ace: number; spike: number; block: number }>();
    teamEvents.forEach(e => {
        const pName = e.player_name || (e.extra_info as Record<string, unknown> | null)?.player_name as string;
        if (!e.player_id && !pName) return;
        if (e.player_id === 'unknown' || (pName && ['unknown', 'unknown player', 'ไม่ระบุ', 'team'].includes(pName.trim().toLowerCase()))) return;
        const key = e.player_id || pName || "";
        const stat = playerStatsMap.get(key) || { total: 0, ace: 0, spike: 0, block: 0 };
        stat.total += 1;
        if (e.event_type === 'ace') stat.ace += 1;
        if (e.event_type === 'spike') stat.spike += 1;
        if (e.event_type === 'block') stat.block += 1;
        playerStatsMap.set(key, stat);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[540px] bg-card p-0 rounded-sm shadow-2xl overflow-hidden border">
                {/* Header */}
                <DialogHeader className="p-3 md:p-4 border-b relative pr-10 bg-muted/20">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-foreground/5 border flex items-center justify-center overflow-hidden shrink-0">
                            {teamLogo ? (
                                <Image src={teamLogo} alt={teamName} width={40} height={40} className="w-full h-full object-contain" />
                            ) : (
                                <span className="font-black text-sm text-foreground/40">{getInitials(teamName)}</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-lg font-black tracking-tight truncate text-foreground">{teamName}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {locale === "th" ? "ข้อมูลทีมและรายชื่อผู้เล่น" : "Team & Roster Information"}
                            </span>
                        </div>
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

                <div className="p-3 md:p-4 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {/* Team Details & Contact */}
                    {(contactName || contactPhone || description) && (
                        <div className="p-3 bg-muted/30 border rounded-sm space-y-1.5 text-xs">
                            {description && (
                                <p className="text-muted-foreground text-xs italic">{description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground pt-1">
                                {contactName && (
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-primary" />
                                        <span className="font-medium text-foreground">{contactName}</span>
                                    </div>
                                )}
                                {contactPhone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-primary" />
                                        <a href={`tel:${contactPhone}`} className="font-medium text-foreground hover:underline">
                                            {contactPhone}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Match Stats Summary */}
                    <div className="grid grid-cols-4 gap-1.5">
                        <div className="p-2 border rounded-sm bg-muted/10 text-center">
                            <span className="text-[10px] font-bold text-muted-foreground block truncate">{locale === "th" ? "คะแนนรวม" : "Total Pts"}</span>
                            <span className="text-lg font-black text-foreground">{totalPoints}</span>
                        </div>
                        <div className="p-2 border rounded-sm bg-amber-500/5 border-amber-500/20 text-center">
                            <span className="text-[10px] font-bold text-amber-500 flex items-center justify-center gap-1">
                                <Zap className="h-3 w-3" /> Ace
                            </span>
                            <span className="text-lg font-black text-amber-500">{aces}</span>
                        </div>
                        <div className="p-2 border rounded-sm bg-red-500/5 border-red-500/20 text-center">
                            <span className="text-[10px] font-bold text-red-500 flex items-center justify-center gap-1">
                                <Flame className="h-3 w-3" /> Spike
                            </span>
                            <span className="text-lg font-black text-red-500">{spikes}</span>
                        </div>
                        <div className="p-2 border rounded-sm bg-blue-500/5 border-blue-500/20 text-center">
                            <span className="text-[10px] font-bold text-blue-500 flex items-center justify-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Block
                            </span>
                            <span className="text-lg font-black text-blue-500">{blocks}</span>
                        </div>
                    </div>

                    {/* Roster Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-primary" />
                                <span className="text-xs font-black tracking-wider text-foreground">
                                    {locale === "th" ? "รายชื่อผู้เล่นในทีม" : "Team Roster"} ({players.length})
                                </span>
                            </div>
                            {activeLineupIds.length > 0 && (
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    {locale === "th" ? `ผู้เล่นตัวจริง ${activeLineupIds.length} คน` : `Starters: ${activeLineupIds.length}`}
                                </span>
                            )}
                        </div>

                        {players.length === 0 ? (
                            <div className="p-6 text-center border-2 border-dashed rounded-sm">
                                <p className="text-xs text-muted-foreground italic">
                                    {locale === "th" ? "ไม่มีข้อมูลรายชื่อผู้เล่นในทีม" : "No players registered in roster"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {players.map((p) => {
                                    const isStarter = activeLineupIds.includes(p.id);
                                    const stats = playerStatsMap.get(p.id) || playerStatsMap.get(p.name);

                                    return (
                                        <div
                                            key={p.id}
                                            className={cn(
                                                "flex items-center justify-between p-2 border rounded-sm transition-all",
                                                isStarter ? "bg-primary/5 border-primary/20" : "bg-card"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-7 w-7 rounded bg-muted/60 flex items-center justify-center font-black text-xs shrink-0 border">
                                                    {p.number !== null && p.number !== undefined ? `#${p.number}` : "-"}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold truncate text-foreground">{p.name}</span>
                                                        {isStarter && (
                                                            <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-primary text-primary-foreground font-semibold">
                                                                {locale === "th" ? "ตัวจริง" : "Starter"}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {p.position && (
                                                        <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                            {p.position}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Player match stats */}
                                            {stats && stats.total > 0 && (
                                                <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
                                                    {stats.ace > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                            {stats.ace} Ace
                                                        </span>
                                                    )}
                                                    {stats.spike > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                                                            {stats.spike} Spike
                                                        </span>
                                                    )}
                                                    {stats.block > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                            {stats.block} Block
                                                        </span>
                                                    )}
                                                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black">
                                                        {stats.total} Pts
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
