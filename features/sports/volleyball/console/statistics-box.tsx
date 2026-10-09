'use client';

import { Match, MatchEvent } from "@/types";
import { useTranslations, useLocale } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
                homeBar: isHomeGreater ? "bg-amber-400" : (isEqual ? "bg-amber-400/50" : "bg-amber-400/20"),
                awayBar: isAwayGreater ? "bg-amber-400" : (isEqual ? "bg-amber-400/50" : "bg-amber-400/20"),
                homeText: isHomeGreater ? "font-black text-amber-500" : (isEqual && total > 0 ? "font-bold text-amber-500" : "text-muted-foreground"),
                awayText: isAwayGreater ? "font-black text-amber-500" : (isEqual && total > 0 ? "font-bold text-amber-500" : "text-muted-foreground"),
            };
        }
        if (statType === 'red') {
            return {
                homeBar: isHomeGreater ? "bg-red-500" : (isEqual ? "bg-red-500/50" : "bg-red-500/20"),
                awayBar: isAwayGreater ? "bg-red-500" : (isEqual ? "bg-red-500/50" : "bg-red-500/20"),
                homeText: isHomeGreater ? "font-black text-red-500" : (isEqual && total > 0 ? "font-bold text-red-500" : "text-muted-foreground"),
                awayText: isAwayGreater ? "font-black text-red-500" : (isEqual && total > 0 ? "font-bold text-red-500" : "text-muted-foreground"),
            };
        }
        // Default / Primary color scheme
        return {
            homeBar: isHomeGreater ? "bg-primary" : (isEqual ? "bg-primary/50" : "bg-muted-foreground/25"),
            awayBar: isAwayGreater ? "bg-primary" : (isEqual ? "bg-primary/50" : "bg-muted-foreground/25"),
            homeText: isHomeGreater ? "font-black text-primary" : (isEqual && !isPercentage && total > 0 ? "font-bold text-foreground" : "text-muted-foreground"),
            awayText: isAwayGreater ? "font-black text-primary" : (isEqual && !isPercentage && total > 0 ? "font-bold text-foreground" : "text-muted-foreground"),
        };
    };

    const colors = getColors();

    const homeFillPercent = total > 0 ? (hVal / total) * 100 : 0;
    const awayFillPercent = total > 0 ? (aVal / total) * 100 : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold tabular-nums">
                <span className={cn("w-12 text-left transition-colors", colors.homeText)}>
                    {home}
                </span>
                <span className="text-xs font-medium text-muted-foreground truncate px-1 tracking-tight">{label}</span>
                <span className={cn("w-12 text-right transition-colors", colors.awayText)}>
                    {away}
                </span>
            </div>

            {isPercentage ? (
                /* Continuous Percentage Gauge */
                <div className="relative w-full h-2 rounded-full overflow-hidden flex items-center bg-muted-foreground/10 border border-border/40">
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
                <div className="relative w-full h-2 rounded-full overflow-hidden flex items-center bg-muted-foreground/10 border border-border/40">
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
    const locale = useLocale();

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
        { key: 'sets_won', label: t("sets_won") || "เซ็ตที่ชนะ", home: homeSetsWon, away: awaySetsWon, statType: 'default' },
        { key: 'current_set_points', label: t("current_set_points") || "คะแนนเซ็ตปัจจุบัน", home: homePoints, away: awayPoints, statType: 'default' },
        { key: 'total_points', label: t("total_points") || "คะแนนรวม", home: homeTotalPoints, away: awayTotalPoints, statType: 'default' },
        { key: 'ace', label: t("ace") || "เสิร์ฟเอซ", home: homeAces, away: awayAces, statType: 'default' },
        { key: 'spike', label: t("spike") || "ตบทำแต้ม", home: homeSpikes, away: awaySpikes, statType: 'default' },
        { key: 'block', label: t("block") || "บล็อกทำแต้ม", home: homeBlocks, away: awayBlocks, statType: 'default' },
        { key: 'other_points', label: t("other_points") || "คะแนนอื่นๆ", home: homeGeneralPts, away: awayGeneralPts, statType: 'default' },
    ];

    const statsList = visibleStats
        ? allStatsList.filter(s => visibleStats.includes(s.key))
        : allStatsList;

    return (
        <div className="bg-card rounded-sm flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg md:text-xl font-black tracking-tighter text-foreground leading-none">
                        {t("match_statistics") || "สถิติการแข่งขัน"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        {locale === "th" ? "สรุปข้อมูลสถิติและประสิทธิภาพการเล่นของทั้งสองทีม" : "Summary of statistical data and team performance"}
                    </p>
                </div>
                {onClose && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-sm"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                {/* Team Matchup Summary Card */}
                <div className="flex items-center justify-between p-4 rounded-sm border border-border bg-transparent">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="size-9 rounded-full border border-border shrink-0">
                            <AvatarImage src={match.home_team?.logo_url || undefined} alt={match.home_team?.name} className="rounded-full object-cover" />
                            <AvatarFallback className="rounded-full text-xs font-bold">{match.home_team?.name?.slice(0, 2).toUpperCase() || "H"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-bold truncate text-foreground">{match.home_team?.name || "Home"}</span>
                    </div>

                    <div className="px-3 shrink-0 flex items-center gap-2 text-lg font-black tabular-nums text-foreground">
                        <span>{homeSetsWon}</span>
                        <span className="text-xs text-muted-foreground font-semibold">-</span>
                        <span>{awaySetsWon}</span>
                    </div>

                    <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                        <span className="text-sm font-bold truncate text-right text-foreground">{match.away_team?.name || "Away"}</span>
                        <Avatar className="size-9 rounded-full border border-border shrink-0">
                            <AvatarImage src={match.away_team?.logo_url || undefined} alt={match.away_team?.name} className="rounded-full object-cover" />
                            <AvatarFallback className="rounded-full text-xs font-bold">{match.away_team?.name?.slice(0, 2).toUpperCase() || "A"}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                {/* Stat List Container */}
                <div className="rounded-sm border border-border bg-transparent overflow-hidden">
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
                        {statsList.map((stat, idx) => (
                            <div key={idx} className="p-4 hover:bg-muted/30 transition-colors">
                                <StatItem
                                    label={stat.label}
                                    home={stat.home}
                                    away={stat.away}
                                    homeNum={stat.homeNum}
                                    awayNum={stat.awayNum}
                                    statType={stat.statType}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
