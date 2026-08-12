'use client';

import { Match, MatchEvent } from "@/types";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/ui/header";

interface VolleyballMatchStatisticsBoxProps {
    match: Match;
    events: MatchEvent[];
    homeSetsWon: number;
    awaySetsWon: number;
    homePoints: number;
    awayPoints: number;
    onClose?: () => void;
}

interface StatItemProps {
    label: string;
    home: number | string;
    away: number | string;
    homeNum?: number;
    awayNum?: number;
}

function StatItem({ label, home, away, homeNum, awayNum }: StatItemProps) {
    const hVal = homeNum !== undefined ? homeNum : (typeof home === 'number' ? home : parseFloat(String(home)) || 0);
    const aVal = awayNum !== undefined ? awayNum : (typeof away === 'number' ? away : parseFloat(String(away)) || 0);
    const total = hVal + aVal;

    const homePct = total > 0 ? Math.round((hVal / total) * 100) : 50;
    const awayPct = total > 0 ? 100 - homePct : 50;

    const isHomeGreater = hVal > aVal;
    const isAwayGreater = aVal > hVal;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold tabular-nums">
                <span className={cn("w-10 text-left", isHomeGreater ? "font-black text-primary" : "text-foreground/70")}>
                    {home}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground truncate px-1">{label}</span>
                <span className={cn("w-10 text-right", isAwayGreater ? "font-black text-primary" : "text-foreground/70")}>
                    {away}
                </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-foreground/5 p-0.5 border border-foreground/5">
                <div
                    className={cn(
                        "h-full rounded-l-full transition-all duration-300",
                        isHomeGreater ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    style={{ width: `${homePct}%` }}
                />
                <div
                    className={cn(
                        "h-full rounded-r-full transition-all duration-300",
                        isAwayGreater ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    style={{ width: `${awayPct}%` }}
                />
            </div>
        </div>
    );
}

export function VolleyballMatchStatisticsBox({
    match,
    events,
    homeSetsWon,
    awaySetsWon,
    homePoints,
    awayPoints,
    onClose
}: VolleyballMatchStatisticsBoxProps) {
    const t = useTranslations("Console");

    const homeId = match.home_team_id || match.home_team?.id;
    const awayId = match.away_team_id || match.away_team?.id;

    const isHomeEvent = (e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'home') return true;
        if (extra?.team_side === 'away') return false;

        if (e.team_id) {
            if (e.team_id === homeId) return true;
            if (e.team_id === awayId) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return true;
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return false;

        return false;
    };

    const isAwayEvent = (e: MatchEvent) => {
        const extra = e.extra_info as Record<string, unknown> | null;
        if (extra?.team_side === 'away') return true;
        if (extra?.team_side === 'home') return false;

        if (e.team_id) {
            if (e.team_id === awayId) return true;
            if (e.team_id === homeId) return false;
        }

        const text = (extra?.text as string) || "";
        if (text.includes("Point for away") || text.toLowerCase().includes("for away")) return true;
        if (text.includes("Point for home") || text.toLowerCase().includes("for home")) return false;

        return false;
    };

    const pointTypes = ['point', 'ace', 'spike', 'block'];
    const pointEvents = events.filter(e => pointTypes.includes(e.event_type));

    const homeTotalPoints = pointEvents.filter(isHomeEvent).length;
    const awayTotalPoints = pointEvents.filter(isAwayEvent).length;

    const countEventType = (type: string, side: 'home' | 'away') => {
        return pointEvents.filter(e => e.event_type === type && (side === 'home' ? isHomeEvent(e) : isAwayEvent(e))).length;
    };

    const homeAces = countEventType('ace', 'home');
    const awayAces = countEventType('ace', 'away');

    const homeSpikes = countEventType('spike', 'home');
    const awaySpikes = countEventType('spike', 'away');

    const homeBlocks = countEventType('block', 'home');
    const awayBlocks = countEventType('block', 'away');

    const homeGeneralPts = countEventType('point', 'home');
    const awayGeneralPts = countEventType('point', 'away');

    const statsList = [
        { label: t("sets_won") || "เซตที่ชนะ (Sets Won)", home: homeSetsWon, away: awaySetsWon },
        { label: t("current_set_points") || "คะแนนเซตปัจจุบัน", home: homePoints, away: awayPoints },
        { label: t("total_points") || "คะแนนรวมทั้งหมด", home: homeTotalPoints, away: awayTotalPoints },
        { label: "Ace (เสิร์ฟเอซ)", home: homeAces, away: awayAces },
        { label: "Spike (ตบทำแต้ม)", home: homeSpikes, away: awaySpikes },
        { label: "Block (บล็อกทำแต้ม)", home: homeBlocks, away: awayBlocks },
        { label: t("other_points") || "แต้มอื่นๆ", home: homeGeneralPts, away: awayGeneralPts },
    ];

    return (
        <div className="bg-card rounded-sm relative overflow-hidden group">
            <div className="flex items-center justify-between border-b p-2 md:p-4 relative pr-10">
                <div className="flex items-center gap-2">
                    <Header level={3}>{t("match_statistics") || "Match Statistics"}</Header>
                </div>
                {onClose && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="p-2 md:p-4 space-y-3">
                {/* Team Headers */}
                <div className="flex justify-between items-center text-xs font-black px-1 text-foreground border-b pb-1">
                    <span className="truncate max-w-[42%] text-foreground">{match.home_team?.name || "Home"}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">VS</span>
                    <span className="truncate max-w-[42%] text-right text-foreground">{match.away_team?.name || "Away"}</span>
                </div>

                {/* Stat List */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                    {statsList.map((stat, idx) => (
                        <StatItem key={idx} label={stat.label} home={stat.home} away={stat.away} />
                    ))}
                </div>
            </div>
        </div>
    );
}
