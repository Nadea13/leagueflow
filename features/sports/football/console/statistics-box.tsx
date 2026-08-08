'use client';

import { useState, useEffect } from "react";
import { Match, MatchEvent } from "@/types";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/ui/header";

interface MatchStatisticsBoxProps {
    match: Match;
    events: MatchEvent[];
    homeScore: number;
    awayScore: number;
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

export function MatchStatisticsBox({ match, events, homeScore, awayScore, onClose }: MatchStatisticsBoxProps) {
    const t = useTranslations("Console");

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

        if (currentPossessor && lastTimestamp !== null && match.status === 'live' && match.timer_status === 'playing') {
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

    const statsList = [
        { label: t("possession") || "การครองบอล", home: `${possession.home}%`, away: `${possession.away}%`, homeNum: possession.home, awayNum: possession.away },
        { label: t("goal"), home: homeScore, away: awayScore },
        { label: t("total_shots") || "โอกาสยิงประตู", home: homeTotalShots, away: awayTotalShots },
        { label: t("missed_shot") || "ยิงพลาด", home: homeMissed, away: awayMissed },
        { label: t("pass") || "จ่ายบอล", home: countEvent(homeId, 'pass'), away: countEvent(awayId, 'pass') },
        { label: t("bad_pass") || "ส่งพลาด", home: countEvent(homeId, 'bad_pass'), away: countEvent(awayId, 'bad_pass') },
        { label: t("cross") || "ครอสบอล", home: countEvent(homeId, 'cross'), away: countEvent(awayId, 'cross') },
        { label: t("miss_cross") || "ครอสบอลพลาด", home: countEvent(homeId, 'miss_cross'), away: countEvent(awayId, 'miss_cross') },
        { label: t("corner") || "เตะมุม", home: countEvent(homeId, 'corner'), away: countEvent(awayId, 'corner') },
        { label: t("save") || "เซฟ", home: countEvent(homeId, 'save'), away: countEvent(awayId, 'save') },
        { label: t("foul") || "ฟาวล์", home: countEvent(homeId, 'foul'), away: countEvent(awayId, 'foul') },
        { label: t("yellow_card"), home: countEvent(homeId, 'yellow_card'), away: countEvent(awayId, 'yellow_card') },
        { label: t("red_card"), home: countEvent(homeId, 'red_card'), away: countEvent(awayId, 'red_card') },
        { label: t("offside") || "ล้ำหน้า", home: countEvent(homeId, 'offside'), away: countEvent(awayId, 'offside') },
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
                        <StatItem key={idx} label={stat.label} home={stat.home} away={stat.away} homeNum={stat.homeNum} awayNum={stat.awayNum} />
                    ))}
                </div>
            </div>
        </div>
    );
}
