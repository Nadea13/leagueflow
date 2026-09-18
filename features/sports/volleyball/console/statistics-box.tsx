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
    visibleStats?: string[];
    onClose?: () => void;
}

interface StatItemProps {
    label: string;
    home: number | string;
    away: number | string;
    homeNum?: number;
    awayNum?: number;
    statType?: 'default' | 'percentage' | 'yellow' | 'red';
}

function StatItem({ label, home, away, homeNum, awayNum, statType = 'default' }: StatItemProps) {
    const isPercentage = statType === 'percentage' || String(home).includes('%') || String(away).includes('%');
    const hVal = homeNum !== undefined ? homeNum : (typeof home === 'number' ? home : parseFloat(String(home)) || 0);
    const aVal = awayNum !== undefined ? awayNum : (typeof away === 'number' ? away : parseFloat(String(away)) || 0);
    const total = hVal + aVal;

    const isHomeGreater = hVal > aVal;
    const isAwayGreater = aVal > hVal;
    const isEqual = hVal === aVal;

    // Color resolution
    const getColors = () => {
        if (statType === 'yellow') {
            return {
                homeBar: isHomeGreater ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]" : (isEqual ? "bg-amber-400/50" : "bg-amber-400/20"),
                awayBar: isAwayGreater ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]" : (isEqual ? "bg-amber-400/50" : "bg-amber-400/20"),
                homeText: isHomeGreater ? "font-black text-amber-400" : (isEqual && total > 0 ? "font-bold text-amber-400" : "text-muted-foreground"),
                awayText: isAwayGreater ? "font-black text-amber-400" : (isEqual && total > 0 ? "font-bold text-amber-400" : "text-muted-foreground"),
            };
        }
        if (statType === 'red') {
            return {
                homeBar: isHomeGreater ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : (isEqual ? "bg-red-500/50" : "bg-red-500/20"),
                awayBar: isAwayGreater ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : (isEqual ? "bg-red-500/50" : "bg-red-500/20"),
                homeText: isHomeGreater ? "font-black text-red-500" : (isEqual && total > 0 ? "font-bold text-red-500" : "text-muted-foreground"),
                awayText: isAwayGreater ? "font-black text-red-500" : (isEqual && total > 0 ? "font-bold text-red-500" : "text-muted-foreground"),
            };
        }
        // Default / Primary color scheme
        return {
            homeBar: isHomeGreater ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" : (isEqual ? "bg-primary/50" : "bg-muted-foreground/25"),
            awayBar: isAwayGreater ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" : (isEqual ? "bg-primary/50" : "bg-muted-foreground/25"),
            homeText: isHomeGreater ? "font-black text-primary" : (isEqual && !isPercentage && total > 0 ? "font-bold text-foreground" : "text-muted-foreground"),
            awayText: isAwayGreater ? "font-black text-primary" : (isEqual && !isPercentage && total > 0 ? "font-bold text-foreground" : "text-muted-foreground"),
        };
    };

    const colors = getColors();

    const homeFillPercent = total > 0 ? (hVal / total) * 100 : 0;
    const awayFillPercent = total > 0 ? (aVal / total) * 100 : 0;

    return (
        <div className="space-y-1.5 py-0.5">
            <div className="flex justify-between items-center text-xs font-bold tabular-nums">
                <span className={cn("w-12 text-left transition-colors", colors.homeText)}>
                    {home}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground truncate px-1 tracking-tight">{label}</span>
                <span className={cn("w-12 text-right transition-colors", colors.awayText)}>
                    {away}
                </span>
            </div>

            {isPercentage ? (
                /* Continuous Percentage Gauge - Empty when 50:50, eats territory when one leads */
                <div className="relative w-full h-2 rounded-full overflow-hidden flex items-center bg-muted/40 border border-border/40">
                    {/* Center 50% marker line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -ml-[1px] bg-border z-10 pointer-events-none" />

                    {isEqual ? null : isHomeGreater ? (
                        /* Home leads: expands from left edge past center into away territory */
                        <div
                            className={cn("h-full transition-all duration-500 rounded-l-full rounded-r-sm", colors.homeBar)}
                            style={{ width: `${hVal}%` }}
                        />
                    ) : (
                        /* Away leads: expands from right edge past center into home territory */
                        <div className="w-full h-full flex justify-end">
                            <div
                                className={cn("h-full transition-all duration-500 rounded-r-full rounded-l-sm", colors.awayBar)}
                                style={{ width: `${aVal}%` }}
                            />
                        </div>
                    )}
                </div>
            ) : (
                /* Center-Split Gauge for Count-based Stats */
                <div className="relative w-full h-2 rounded-full overflow-hidden flex items-center bg-muted/40 border border-border/40">
                    {/* Left half: Home (grows from center towards left) */}
                    <div className="w-1/2 h-full flex justify-end">
                        <div
                            className={cn(
                                "h-full transition-all duration-500 rounded-l-full",
                                total > 0 && hVal > 0 ? colors.homeBar : "bg-transparent"
                            )}
                            style={{ width: `${homeFillPercent}%` }}
                        />
                    </div>

                    {/* Center divider mark */}
                    <div className="w-[2px] h-full bg-border shrink-0 z-10" />

                    {/* Right half: Away (grows from center towards right) */}
                    <div className="w-1/2 h-full flex justify-start">
                        <div
                            className={cn(
                                "h-full transition-all duration-500 rounded-r-full",
                                total > 0 && aVal > 0 ? colors.awayBar : "bg-transparent"
                            )}
                            style={{ width: `${awayFillPercent}%` }}
                        />
                    </div>
                </div>
            )}
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
    visibleStats,
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

    const allStatsList: {
        key: string;
        label: string;
        home: number | string;
        away: number | string;
        homeNum?: number;
        awayNum?: number;
        statType?: 'default' | 'percentage' | 'yellow' | 'red';
    }[] = [
        { key: 'sets_won', label: t("sets_won") || "เซตที่ชนะ (Sets Won)", home: homeSetsWon, away: awaySetsWon, statType: 'default' },
        { key: 'current_set_points', label: t("current_set_points") || "คะแนนเซตปัจจุบัน", home: homePoints, away: awayPoints, statType: 'default' },
        { key: 'total_points', label: t("total_points") || "คะแนนรวมทั้งหมด", home: homeTotalPoints, away: awayTotalPoints, statType: 'default' },
        { key: 'ace', label: "Ace (เสิร์ฟเอซ)", home: homeAces, away: awayAces, statType: 'default' },
        { key: 'spike', label: "Spike (ตบทำแต้ม)", home: homeSpikes, away: awaySpikes, statType: 'default' },
        { key: 'block', label: "Block (บล็อกทำแต้ม)", home: homeBlocks, away: awayBlocks, statType: 'default' },
        { key: 'other_points', label: t("other_points") || "แต้มอื่นๆ", home: homeGeneralPts, away: awayGeneralPts, statType: 'default' },
    ];

    const statsList = visibleStats
        ? allStatsList.filter(s => visibleStats.includes(s.key))
        : allStatsList;

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
                        <StatItem key={idx} label={stat.label} home={stat.home} away={stat.away} homeNum={stat.homeNum} awayNum={stat.awayNum} statType={stat.statType} />
                    ))}
                </div>
            </div>
        </div>
    );
}
