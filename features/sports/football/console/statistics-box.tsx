'use client';

import { useState, useEffect } from "react";
import { Match, MatchEvent } from "@/types";
import { useTranslations, useLocale } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MatchStatisticsBoxProps {
    match: Match;
    events: MatchEvent[];
    homeScore: number;
    awayScore: number;
    onClose?: () => void;
    visibleStats?: string[];
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

export function MatchStatisticsBox({ match, events, homeScore, awayScore, onClose, visibleStats }: MatchStatisticsBoxProps) {
    const t = useTranslations("Console");
    const locale = useLocale();

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const calculatePossession = () => {
        if (!events || events.length === 0) return { home: 50, away: 50, total: 0 };

        const homeTeamId = match.home_team_id;
        const awayTeamId = match.away_team_id;

        const sortedEvents = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let homeTimeMs = 0;
        let awayTimeMs = 0;
        let currentPossessor: 'home' | 'away' | null = null;
        let lastTimestamp: number | null = null;

        sortedEvents.forEach((evt) => {
            const evtTime = new Date(evt.created_at).getTime();

            if (currentPossessor && lastTimestamp !== null && evtTime > lastTimestamp) {
                const duration = evtTime - lastTimestamp;
                if (currentPossessor === 'home') homeTimeMs += duration;
                if (currentPossessor === 'away') awayTimeMs += duration;
            }

            const isHome = evt.team_id === homeTeamId;
            const isAway = evt.team_id === awayTeamId;

            if (evt.event_type === 'possession' || evt.event_type === 'pass' || evt.event_type === 'cross') {
                if (isHome) currentPossessor = 'home';
                else if (isAway) currentPossessor = 'away';
            } else if (evt.event_type === 'bad_pass' || evt.event_type === 'miss_cross') {
                if (isHome) currentPossessor = 'away';
                else if (isAway) currentPossessor = 'home';
            } else if (
                evt.event_type === 'goal' ||
                evt.event_type === 'yellow_card' ||
                evt.event_type === 'red_card' ||
                evt.event_type === 'substitution' ||
                evt.event_type === 'injury' ||
                evt.event_type === 'corner' ||
                evt.event_type === 'offside' ||
                evt.event_type === 'half_time' ||
                evt.event_type === 'full_time' ||
                evt.event_type === 'match_paused' ||
                evt.event_type === 'walkover'
            ) {
                currentPossessor = null;
            }

            lastTimestamp = evtTime;
        });

        const isMatchLive = match.status === 'live' || match.status === 'first_half' || match.status === 'second_half';
        if (currentPossessor && lastTimestamp !== null && isMatchLive && match.timer_status === 'playing') {
            const currentMs = now;
            if (currentMs > lastTimestamp) {
                const liveDuration = currentMs - lastTimestamp;
                if (currentPossessor === 'home') homeTimeMs += liveDuration;
                if (currentPossessor === 'away') awayTimeMs += liveDuration;
            }
        }

        const totalTimeMs = homeTimeMs + awayTimeMs;
        if (totalTimeMs <= 0) return { home: 50, away: 50, total: 0 };

        const homePct = Math.round((homeTimeMs / totalTimeMs) * 100);
        const awayPct = 100 - homePct;

        return { home: homePct, away: awayPct, total: totalTimeMs };
    };

    const possession = calculatePossession();

    const homeId = match.home_team_id;
    const awayId = match.away_team_id;

    const countEvent = (teamId: string | null, type: string) => {
        if (!teamId) return 0;
        return events.filter(e => e.team_id === teamId && e.event_type === type).length;
    };

    const homeMissed = countEvent(homeId, 'missed_shot');
    const awayMissed = countEvent(awayId, 'missed_shot');

    const homeTotalShots = homeScore + homeMissed;
    const awayTotalShots = awayScore + awayMissed;

    const countYellowCards = (teamId: string | null) => {
        if (!teamId) return 0;
        return events.filter(e => e.team_id === teamId && (
            e.event_type === 'yellow_card' ||
            (e.event_type === 'foul' && (e.extra_info as Record<string, unknown> | null)?.card_type === 'yellow')
        )).length;
    };

    const countRedCards = (teamId: string | null) => {
        if (!teamId) return 0;
        return events.filter(e => e.team_id === teamId && (
            e.event_type === 'red_card' ||
            (e.event_type === 'foul' && (e.extra_info as Record<string, unknown> | null)?.card_type === 'red')
        )).length;
    };

    const countPenalties = (teamId: string | null) => {
        if (!teamId) return 0;
        return events.filter(e => e.team_id === teamId && (
            e.event_type === 'penalty' ||
            (e.event_type === 'foul' && !!(e.extra_info as Record<string, unknown> | null)?.is_penalty)
        )).length;
    };

    const allStatsList: {
        key: string;
        label: string;
        home: number | string;
        away: number | string;
        homeNum?: number;
        awayNum?: number;
        statType?: 'default' | 'percentage' | 'yellow' | 'red';
    }[] = [
        { key: 'possession', label: t("possession") || "การครองบอล", home: `${possession.home}%`, away: `${possession.away}%`, homeNum: possession.home, awayNum: possession.away, statType: 'percentage' },
        { key: 'goal', label: t("goal") || "ประตู", home: homeScore, away: awayScore, statType: 'default' },
        { key: 'total_shots', label: t("total_shots") || "โอกาสยิงประตู", home: homeTotalShots, away: awayTotalShots, statType: 'default' },
        { key: 'missed_shot', label: t("missed_shot") || "ยิงพลาด", home: homeMissed, away: awayMissed, statType: 'default' },
        { key: 'pass', label: t("pass") || "จ่ายบอล", home: countEvent(homeId, 'pass'), away: countEvent(awayId, 'pass'), statType: 'default' },
        { key: 'bad_pass', label: t("bad_pass") || "ออกข้าง", home: countEvent(homeId, 'bad_pass'), away: countEvent(awayId, 'bad_pass'), statType: 'default' },
        { key: 'cross', label: t("cross") || "ครอสบอล", home: countEvent(homeId, 'cross'), away: countEvent(awayId, 'cross'), statType: 'default' },
        { key: 'corner', label: t("corner") || "เตะมุม", home: countEvent(homeId, 'corner'), away: countEvent(awayId, 'corner'), statType: 'default' },
        { key: 'save', label: t("save") || "เซฟ", home: countEvent(homeId, 'save'), away: countEvent(awayId, 'save'), statType: 'default' },
        { key: 'foul', label: t("foul") || "ฟาวล์", home: countEvent(homeId, 'foul'), away: countEvent(awayId, 'foul'), statType: 'default' },
        { key: 'penalty', label: t("penalty") || "จุดโทษ", home: countPenalties(homeId), away: countPenalties(awayId), statType: 'default' },
        { key: 'yellow_card', label: t("yellow_card") || "ใบเหลือง", home: countYellowCards(homeId), away: countYellowCards(awayId), statType: 'yellow' },
        { key: 'red_card', label: t("red_card") || "ใบแดง", home: countRedCards(homeId), away: countRedCards(awayId), statType: 'red' },
        { key: 'offside', label: t("offside") || "ล้ำหน้า", home: countEvent(homeId, 'offside'), away: countEvent(awayId, 'offside'), statType: 'default' },
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
                        <span>{homeScore}</span>
                        <span className="text-xs text-muted-foreground font-semibold">-</span>
                        <span>{awayScore}</span>
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
