"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Match, MatchEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    Calendar,
    Activity,
    Filter,
    Goal,
    Target,
    Ban,
    Footprints,
    Square,
    AlertTriangle,
    Zap,
    ArrowRightLeft,
    Shield,
    HeartPulse
} from "lucide-react";
import { cn, getTeamInitials } from "@/lib/utils";
import { resolveStorageUrl } from "@/lib/storage-utils";
import { Tab } from "@/components/ui/tab";
import { formatDate } from "@/lib/date";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { Header } from "@/components/ui/header";

export { PlayerAvatar };

export interface PlayerStatDetail {
    id: string;
    name: string;
    teamId?: string | null;
    teamName: string;
    teamLogo: string | null;
    goals: number;
    assists: number;
    fouls: number;
    foulsDrawn?: number;
    yellowCards: number;
    redCards: number;
    saves: number;
    injuries: number;
    subIn?: number;
    subOut?: number;
    ownGoals?: number;
    penaltiesScored?: number;
    number?: number | string | null;
    position?: string | null;
    photo_url?: string | null;
    profile_img?: string | null;
    birthDate?: string | null;
    age?: number | null;
    nickname?: string | null;
    preferredFoot?: string | null;
    gender?: string | null;
    matchesPlayed?: number;
}

interface PlayerStatModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    player: PlayerStatDetail | null;
    events: MatchEvent[];
    matches: Match[];
    locale?: string;
}

function MetricRadarChart({
    axes,
    maxVal,
    colorTheme = 'emerald',
}: {
    axes: { label: string; value: number }[];
    maxVal: number;
    colorTheme?: 'emerald' | 'rose';
}) {
    const size = 260;
    const cx = size / 2;
    // For 3-point triangle with top vertex, shifting cy down slightly gives perfect visual centering
    const cy = axes.length === 3 ? 138 : size / 2;
    const radius = 80;
    const N = axes.length;

    const getCoord = (angleIndex: number, r: number) => {
        const angle = -Math.PI / 2 + (angleIndex * 2 * Math.PI) / N;
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
            angle
        };
    };

    const effectiveMax = Math.max(1, maxVal);
    // Draw concentric interior tick lines according to count (ขีดตามจำนวน)
    const levels: number[] = [];
    const step = effectiveMax > 10 ? Math.ceil(effectiveMax / 8) : 1;
    for (let c = step; c <= effectiveMax; c += step) {
        levels.push(c / effectiveMax);
    }
    if (levels.length === 0 || levels[levels.length - 1] < 1) {
        levels.push(1);
    }

    const dataPoints = axes.map((axis, i) => {
        const ratio = axis.value === 0 ? 0 : Math.min(1.0, axis.value / effectiveMax);
        return getCoord(i, radius * ratio);
    });

    const dataPolygonString = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

    const strokeColor = colorTheme === 'emerald' ? 'stroke-emerald-500' : 'stroke-rose-500';
    const gradId = `radarGrad-${colorTheme}`;

    return (
        <div className="flex flex-col items-center justify-center relative py-1 w-full">
            <svg viewBox={`0 0 ${size} ${size - 10}`} className="w-56 h-52 sm:w-64 sm:h-56 overflow-visible select-none">
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        {colorTheme === 'emerald' ? (
                            <>
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.12" />
                            </>
                        ) : (
                            <>
                                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.12" />
                            </>
                        )}
                    </linearGradient>
                </defs>

                {/* Concentric grid lines - interior tick lines per count (ขีดตามจำนวน) */}
                {levels.map((level, idx) => {
                    const points = Array.from({ length: N }, (_, i) => {
                        const { x, y } = getCoord(i, radius * level);
                        return `${x},${y}`;
                    }).join(" ");
                    const isOutermost = idx === levels.length - 1;
                    return (
                        <polygon
                            key={idx}
                            points={points}
                            className={cn(
                                "fill-none transition-all",
                                isOutermost
                                    ? "stroke-border stroke-[1.5]"
                                    : "stroke-border/40 stroke-1"
                            )}
                        />
                    );
                })}

                {/* Axis lines from center to outer vertices */}
                {Array.from({ length: N }, (_, i) => {
                    const outer = getCoord(i, radius);
                    return (
                        <line
                            key={i}
                            x1={cx}
                            y1={cy}
                            x2={outer.x}
                            y2={outer.y}
                            className="stroke-border/25 stroke-1"
                        />
                    );
                })}

                {/* Filled Radar Polygon (no dots inside) */}
                <polygon
                    points={dataPolygonString}
                    fill={`url(#${gradId})`}
                    className={cn(strokeColor, "stroke-2 transition-all duration-300 drop-shadow-sm")}
                />

                {/* Axis Labels outside vertices - clean text only, no emoji, no numbers */}
                {axes.map((axis, i) => {
                    const coord = getCoord(i, radius + 18);
                    const cos = Math.cos(coord.angle);
                    const sin = Math.sin(coord.angle);
                    let textAnchor: "middle" | "start" | "end" = "middle";
                    if (cos > 0.25) textAnchor = "start";
                    else if (cos < -0.25) textAnchor = "end";

                    let dy = 0;
                    if (sin < -0.5) dy = -4;
                    else if (sin > 0.5) dy = 6;

                    return (
                        <g key={i} transform={`translate(${coord.x}, ${coord.y + dy})`}>
                            <text
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                className="text-[11px] sm:text-xs font-bold fill-foreground select-none"
                            >
                                {axis.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

export function PlayerStatModal({
    open,
    onOpenChange,
    player,
    events,
    matches,
    locale = "th"
}: PlayerStatModalProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'matches'>('overview');
    const [actionFilter, setActionFilter] = useState<'all' | 'goal' | 'assist' | 'foul' | 'card' | 'sub'>('all');

    // Calculate timeline of actions for this player
    const playerActions = useMemo(() => {
        if (!player) return [];
        const playerId = player.id;
        const playerName = player.name;

        const actions: Array<{
            id: string;
            minute: number;
            actionType: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'foul' | 'foul_drawn' | 'save' | 'injury' | 'sub_in' | 'sub_out' | 'own_goal' | 'penalty_goal' | string;
            actionCategory: 'goal' | 'assist' | 'foul' | 'card' | 'sub' | 'other';
            actionTitle: string;
            actionDetail?: string;
            matchId: string;
            matchInfo?: Match;
            createdAt: string | number;
        }> = [];

        events.forEach(evt => {
            const rawPlayerId = evt.player_id || (evt.extra_info?.player_id as string) || (evt.detail?.player_id as string);
            const extraName = (evt.extra_info?.player_name as string) || (evt.detail?.player_name as string) || (evt as any).player_name;
            const isMainActor = (rawPlayerId && rawPlayerId === playerId) || (extraName && extraName === playerName);

            const assistPlayerId = (evt.extra_info?.assist_player_id as string) || (evt.detail?.assist_player_id as string);
            const assistPlayerName = (evt.extra_info?.assist_player_name as string) || (evt.detail?.assist_player_name as string);
            const isAssistActor = (assistPlayerId && assistPlayerId === playerId) || (assistPlayerName && assistPlayerName === playerName);

            const fouledPlayerId = (evt.extra_info?.fouled_player_id as string) || (evt.detail?.fouled_player_id as string);
            const fouledPlayerName = (evt.extra_info?.fouled_player_name as string) || (evt.detail?.fouled_player_name as string);
            const isFouledActor = (fouledPlayerId && fouledPlayerId !== 'none' && fouledPlayerId === playerId) || (fouledPlayerName && fouledPlayerName !== 'none' && fouledPlayerName === playerName);

            const subOutId = (evt.extra_info?.out_player_id as string) || (evt.detail?.out_player_id as string);
            const subOutName = (evt.extra_info?.out_player_name as string) || (evt.detail?.out_player_name as string);
            const subInId = (evt.extra_info?.in_player_id as string) || (evt.detail?.in_player_id as string);
            const subInName = (evt.extra_info?.in_player_name as string) || (evt.detail?.in_player_name as string);

            const isSubOutActor = (subOutId && subOutId === playerId) || (subOutName && subOutName === playerName) || (evt.event_type === 'substitution' && isMainActor);
            const isSubInActor = (subInId && subInId === playerId) || (subInName && subInName === playerName);

            const match = matches.find(m => m.id === evt.match_id);

            // 1. Goal (Main Actor)
            if (evt.event_type === 'goal' || evt.event_type === 'penalty_goal' || evt.event_type === 'own_goal') {
                const isOwnGoal = evt.event_type === 'own_goal' || !!(evt.extra_info?.is_own_goal || evt.detail?.is_own_goal);
                const isPenalty = evt.event_type === 'penalty_goal' || !!(evt.extra_info?.is_penalty || evt.detail?.is_penalty);

                if (isOwnGoal && isMainActor) {
                    actions.push({
                        id: evt.id,
                        minute: evt.minute,
                        actionType: 'own_goal',
                        actionCategory: 'goal',
                        actionTitle: locale === "th" ? 'ทำเข้าประตูตัวเอง' : 'Own Goal',
                        actionDetail: locale === "th" ? 'สกัดบอลเข้าประตูตัวเอง' : 'Deflected into own net',
                        matchId: evt.match_id,
                        matchInfo: match,
                        createdAt: evt.created_at || 0
                    });
                } else if (!isOwnGoal && isMainActor) {
                    const assistTxt = assistPlayerName ? (locale === "th" ? `แอสซิสต์โดย: ${assistPlayerName}` : `Assist by: ${assistPlayerName}`) : undefined;
                    const detail = isPenalty ? (locale === "th" ? 'ยิงลูกจุดโทษเข้าประตู' : 'Penalty Kick Scored') : assistTxt;
                    actions.push({
                        id: evt.id,
                        minute: evt.minute,
                        actionType: isPenalty ? 'penalty_goal' : 'goal',
                        actionCategory: 'goal',
                        actionTitle: isPenalty ? (locale === "th" ? 'ยิงจุดโทษ' : 'Penalty Goal') : (locale === "th" ? 'ยิงประตู' : 'Goal'),
                        actionDetail: detail,
                        matchId: evt.match_id,
                        matchInfo: match,
                        createdAt: evt.created_at || 0
                    });
                }
            }

            // 2. Assist (Assist Actor)
            if (evt.event_type === 'goal' && isAssistActor) {
                const scorerName = extraName || (locale === "th" ? 'เพื่อนร่วมทีม' : 'Teammate');
                actions.push({
                    id: `${evt.id}-assist`,
                    minute: evt.minute,
                    actionType: 'assist',
                    actionCategory: 'assist',
                    actionTitle: locale === "th" ? 'แอสซิสต์' : 'Assist',
                    actionDetail: locale === "th" ? `ส่งให้ ${scorerName} ทำประตู` : `Assisted ${scorerName}`,
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }

            // 3. Yellow Card
            if (evt.event_type === 'yellow_card' && isMainActor) {
                const isSecondYellow = !!(evt.detail?.is_second_yellow || evt.extra_info?.is_second_yellow);
                actions.push({
                    id: evt.id,
                    minute: evt.minute,
                    actionType: 'yellow_card',
                    actionCategory: 'card',
                    actionTitle: locale === "th" ? 'ใบเหลือง' : 'Yellow Card',
                    actionDetail: isSecondYellow ? (locale === "th" ? 'ใบเหลืองที่สอง (เป็นใบแดง)' : 'Second Yellow (Red)') : (locale === "th" ? 'ได้รับใบเหลือง' : 'Cautioned'),
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }

            // 4. Red Card
            if (evt.event_type === 'red_card' && isMainActor) {
                actions.push({
                    id: evt.id,
                    minute: evt.minute,
                    actionType: 'red_card',
                    actionCategory: 'card',
                    actionTitle: locale === "th" ? 'ใบแดง' : 'Red Card',
                    actionDetail: locale === "th" ? 'ได้รับใบแดงออกจากสนาม' : 'Sent off',
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }

            // 5a. Foul Won / Called Foul (เรียกฟาวล์)
            if (evt.event_type === 'foul' && isFouledActor) {
                const committer = extraName || (locale === "th" ? 'คู่แข่ง' : 'Opponent');
                actions.push({
                    id: `${evt.id}-fouled`,
                    minute: evt.minute,
                    actionType: 'foul_drawn',
                    actionCategory: 'foul',
                    actionTitle: locale === "th" ? 'เรียกฟาวล์' : 'Foul Won',
                    actionDetail: locale === "th" ? `ถูก ${committer} ทำฟาวล์ (ได้ลูกฟาวล์)` : `Fouled by ${committer}`,
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }

            // 5b. Foul Committed
            if (evt.event_type === 'foul' && isMainActor) {
                const foulCard = ((evt.extra_info as Record<string, unknown> | null)?.card_type || (evt.detail as Record<string, unknown> | null)?.card_type) as string | undefined;
                let detail = (evt.detail?.reason as string) || (evt.extra_info?.reason as string) || (locale === "th" ? 'ทำฟาวล์คู่แข่ง' : 'Foul committed');
                if (foulCard === 'yellow') {
                    detail = locale === "th" ? 'ทำฟาวล์และได้รับใบเหลือง' : 'Foul committed (Yellow Card)';
                } else if (foulCard === 'red') {
                    detail = locale === "th" ? 'ทำฟาวล์และได้รับใบแดง' : 'Foul committed (Red Card)';
                }
                actions.push({
                    id: evt.id,
                    minute: evt.minute,
                    actionType: 'foul',
                    actionCategory: foulCard ? 'card' : 'foul',
                    actionTitle: locale === "th" ? 'ทำฟาวล์' : 'Foul',
                    actionDetail: detail,
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }

            // 6. Substitution
            if (evt.event_type === 'substitution') {
                if (isSubInActor) {
                    const replacedName = subOutName || (locale === "th" ? 'เพื่อนร่วมทีม' : 'Teammate');
                    actions.push({
                        id: `${evt.id}-in`,
                        minute: evt.minute,
                        actionType: 'sub_in',
                        actionCategory: 'sub',
                        actionTitle: locale === "th" ? 'เปลี่ยนตัวลง' : 'Subbed In',
                        actionDetail: locale === "th" ? `ลงสนามแทน ${replacedName}` : `Replaced ${replacedName}`,
                        matchId: evt.match_id,
                        matchInfo: match,
                        createdAt: evt.created_at || 0
                    });
                }
                if (isSubOutActor) {
                    const replacerName = subInName || (locale === "th" ? 'เพื่อนร่วมทีม' : 'Teammate');
                    actions.push({
                        id: `${evt.id}-out`,
                        minute: evt.minute,
                        actionType: 'sub_out',
                        actionCategory: 'sub',
                        actionTitle: locale === "th" ? 'เปลี่ยนตัวออก' : 'Subbed Out',
                        actionDetail: locale === "th" ? `ถูกเปลี่ยนตัวออก ให้ ${replacerName} ลงเล่นแทน` : `Subbed off for ${replacerName}`,
                        matchId: evt.match_id,
                        matchInfo: match,
                        createdAt: evt.created_at || 0
                    });
                }
            }

            // 7. Save
            if (evt.event_type === 'save' && isMainActor) {
                actions.push({
                    id: evt.id,
                    minute: evt.minute,
                    actionType: 'save',
                    actionCategory: 'other',
                    actionTitle: locale === "th" ? 'เซฟประตู' : 'Save',
                    actionDetail: locale === "th" ? 'เซฟจังหวะยิงประตู' : 'Saved shot',
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }

            // 8. Injury
            if (evt.event_type === 'injury' && isMainActor) {
                actions.push({
                    id: evt.id,
                    minute: evt.minute,
                    actionType: 'injury',
                    actionCategory: 'other',
                    actionTitle: locale === "th" ? 'บาดเจ็บ' : 'Injury',
                    actionDetail: locale === "th" ? 'ได้รับบาดเจ็บ' : 'Player injured',
                    matchId: evt.match_id,
                    matchInfo: match,
                    createdAt: evt.created_at || 0
                });
            }
        });

        // Sort chronologically: match scheduled date / match created, then minute
        return actions.sort((a, b) => {
            const timeA = a.matchInfo?.scheduled_at ? new Date(a.matchInfo.scheduled_at).getTime() : new Date(a.createdAt).getTime();
            const timeB = b.matchInfo?.scheduled_at ? new Date(b.matchInfo.scheduled_at).getTime() : new Date(b.createdAt).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.minute - b.minute;
        });
    }, [player, events, matches, locale]);

    // Calculate match participations & impact
    const playerMatches = useMemo(() => {
        if (!player) return [];
        return matches.filter(m => {
            const isTeam = (
                (player.teamId && (m.home_team_id === player.teamId || m.away_team_id === player.teamId)) ||
                (player.teamName && (m.home_team?.name === player.teamName || m.away_team?.name === player.teamName))
            );
            const hasAction = playerActions.some(act => act.matchId === m.id);
            return isTeam || hasAction;
        }).map(m => {
            const isHome = (player.teamId && m.home_team_id === player.teamId) || (player.teamName && m.home_team?.name === player.teamName);
            const hScore = typeof m.home_score === 'object' && m.home_score !== null && 'total' in m.home_score ? Number((m.home_score as { total?: number }).total) || 0 : Number(m.home_score) || 0;
            const aScore = typeof m.away_score === 'object' && m.away_score !== null && 'total' in m.away_score ? Number((m.away_score as { total?: number }).total) || 0 : Number(m.away_score) || 0;

            let result: 'win' | 'draw' | 'loss' | 'scheduled' = 'scheduled';
            if (m.status === 'finished' || m.status === 'live') {
                if (hScore === aScore) result = 'draw';
                else if ((isHome && hScore > aScore) || (!isHome && aScore > hScore)) result = 'win';
                else result = 'loss';
            }

            const matchActions = playerActions.filter(act => act.matchId === m.id);

            return {
                match: m,
                isHome,
                homeScore: hScore,
                awayScore: aScore,
                result,
                actions: matchActions
            };
        }).sort((a, b) => {
            const timeA = a.match.scheduled_at ? new Date(a.match.scheduled_at).getTime() : 0;
            const timeB = b.match.scheduled_at ? new Date(b.match.scheduled_at).getTime() : 0;
            return timeA - timeB;
        });
    }, [player, matches, playerActions]);

    if (!player) return null;

    const positiveMax = Math.max(
        3,
        player.goals,
        player.assists,
        player.foulsDrawn ?? 0
    );

    const negativeMax = Math.max(
        3,
        player.fouls,
        player.yellowCards,
        player.redCards
    );

    const positiveAxes = [
        { label: locale === "th" ? "ยิงประตู" : "Goals", value: player.goals },
        { label: locale === "th" ? "แอสซิสต์" : "Assists", value: player.assists },
        { label: locale === "th" ? "เรียกฟาวล์" : "Fouls Drawn", value: player.foulsDrawn ?? 0 },
    ];

    const negativeAxes = [
        { label: locale === "th" ? "ทำฟาวล์" : "Fouls", value: player.fouls },
        { label: locale === "th" ? "ใบเหลือง" : "Yellow Cards", value: player.yellowCards },
        { label: locale === "th" ? "ใบแดง" : "Red Cards", value: player.redCards },
    ];

    const getActionBadge = (type: string) => {
        switch (type) {
            case 'goal':
                return { icon: Goal, iconClass: "text-emerald-500", bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" };
            case 'penalty_goal':
                return { icon: Target, iconClass: "text-emerald-500", bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" };
            case 'own_goal':
                return { icon: Ban, iconClass: "text-rose-500", bg: "bg-rose-500/10 text-rose-500 border-rose-500/30" };
            case 'assist':
                return { icon: Footprints, iconClass: "text-blue-500", bg: "bg-blue-500/10 text-blue-500 border-blue-500/30" };
            case 'yellow_card':
                return { icon: Square, iconClass: "fill-amber-500 text-amber-500", bg: "bg-amber-500/10 text-amber-500 border-amber-500/30" };
            case 'red_card':
                return { icon: Square, iconClass: "fill-red-500 text-red-500", bg: "bg-red-500/10 text-red-500 border-red-500/30" };
            case 'foul':
                return { icon: AlertTriangle, iconClass: "text-orange-500", bg: "bg-orange-500/10 text-orange-500 border-orange-500/30" };
            case 'foul_drawn':
                return { icon: Zap, iconClass: "text-amber-600", bg: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
            case 'sub_in':
                return { icon: ArrowRightLeft, iconClass: "text-green-500", bg: "bg-green-500/10 text-green-500 border-green-500/30" };
            case 'sub_out':
                return { icon: ArrowRightLeft, iconClass: "text-slate-500", bg: "bg-slate-500/10 text-slate-500 border-slate-500/30" };
            case 'save':
                return { icon: Shield, iconClass: "text-purple-500", bg: "bg-purple-500/10 text-purple-500 border-purple-500/30" };
            case 'injury':
                return { icon: HeartPulse, iconClass: "text-rose-500", bg: "bg-rose-500/10 text-rose-500 border-rose-500/30" };
            default:
                return { icon: Activity, iconClass: "text-muted-foreground", bg: "bg-muted text-muted-foreground border-border" };
        }
    };

    const filteredActions = playerActions.filter(act => {
        if (actionFilter === 'all') return true;
        if (actionFilter === 'goal') return act.actionCategory === 'goal';
        if (actionFilter === 'assist') return act.actionCategory === 'assist';
        if (actionFilter === 'foul') return act.actionCategory === 'foul';
        if (actionFilter === 'card') return act.actionCategory === 'card';
        if (actionFilter === 'sub') return act.actionCategory === 'sub';
        return true;
    });

    const modalTabs = [
        { value: 'overview' as const, label: locale === 'th' ? "ภาพรวม" : "Overview", icon: Activity },
        { value: 'timeline' as const, label: locale === 'th' ? `ไทม์ไลน์แอคชั่น (${playerActions.length})` : `Action Timeline (${playerActions.length})`, icon: Clock },
        { value: 'matches' as const, label: locale === 'th' ? `แมตช์ที่ลงเล่น (${playerMatches.length})` : `Matches (${playerMatches.length})`, icon: Calendar },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={true} className="sm:max-w-3xl sm:h-[88vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {/* Header Banner & Player Bio */}
                <DialogHeader className="p-4 space-y-4 bg-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-4 min-w-0">
                            {/* Avatar (displayed like in teams) */}
                            <PlayerAvatar
                                photoUrl={player.photo_url || player.profile_img}
                                name={player.name}
                                number={player.number}
                                size="lg"
                            />

                            {/* Info */}
                            <div className="flex flex-col min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
                                        {player.name}
                                    </DialogTitle>
                                    {player.nickname && (
                                        <Badge variant="outline">
                                            {player.nickname}
                                        </Badge>
                                    )}
                                    {player.position && (
                                        <Badge variant="secondary">
                                            {player.position}
                                        </Badge>
                                    )}
                                </div>

                                <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 font-medium">
                                    {player.teamLogo && (
                                        <Image
                                            src={player.teamLogo}
                                            alt={player.teamName}
                                            width={16}
                                            height={16}
                                            unoptimized
                                            className="object-contain rounded-full shrink-0"
                                        />
                                    )}
                                    <span className="truncate">{player.teamName}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <Tab
                        options={modalTabs}
                        value={activeTab}
                        onChange={setActiveTab}
                        size="sm"
                        fullWidth
                    />
                </DialogHeader>

                {/* Modal Tab Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    {/* 1. OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* 2 Graphs in a Single Card (Positive & Negative, No Header) */}
                            <div className="bg-card border rounded-sm shadow-xs overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                    {/* Positive Chart */}
                                    <div className="p-3 sm:p-4 flex items-center justify-center">
                                        <MetricRadarChart
                                            axes={positiveAxes}
                                            maxVal={positiveMax}
                                            colorTheme="emerald"
                                        />
                                    </div>

                                    {/* Negative Chart */}
                                    <div className="p-3 sm:p-4 flex items-center justify-center">
                                        <MetricRadarChart
                                            axes={negativeAxes}
                                            maxVal={negativeMax}
                                            colorTheme="rose"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Full Detailed Stats in a Single Card with Divide */}
                            <div className="space-y-2">
                                <div className="bg-card border rounded-sm overflow-hidden shadow-xs">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 -mr-px -mb-px">
                                        {[
                                            { label: locale === 'th' ? "ยิงประตู" : "Goals", value: player.goals },
                                            { label: locale === 'th' ? "แอสซิสต์" : "Assists", value: player.assists },
                                            { label: locale === 'th' ? "เรียกฟาวล์" : "Fouls Drawn", value: player.foulsDrawn ?? 0 },
                                            { label: locale === 'th' ? "ทำฟาวล์" : "Fouls Committed", value: player.fouls },
                                            { label: locale === 'th' ? "ใบเหลือง" : "Yellow Cards", value: player.yellowCards },
                                            { label: locale === 'th' ? "ใบแดง" : "Red Cards", value: player.redCards },
                                            { label: locale === 'th' ? "เซฟประตู" : "Saves", value: player.saves },
                                            { label: locale === 'th' ? "จุดโทษเข้า" : "Penalties Scored", value: player.penaltiesScored ?? 0 },
                                            { label: locale === 'th' ? "เปลี่ยนตัวลง" : "Sub In", value: player.subIn ?? 0 },
                                            { label: locale === 'th' ? "เปลี่ยนตัวออก" : "Sub Out", value: player.subOut ?? 0 },
                                            { label: locale === 'th' ? "บาดเจ็บ" : "Injuries", value: player.injuries },
                                            { label: locale === 'th' ? "เข้าประตูตัวเอง" : "Own Goals", value: player.ownGoals ?? 0 },
                                        ].map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 sm:p-3.5 flex items-center justify-between border-r border-b border-border hover:bg-muted/20 transition-colors"
                                            >
                                                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                                                <span className="text-sm sm:text-base font-black text-foreground tabular-nums">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Filter Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold pr-1">
                                    <Filter className="size-4" />
                                    {locale === 'th' ? "กรอง:" : "Filter:"}
                                </span>
                                {[
                                    { id: 'all' as const, label: locale === 'th' ? 'ทั้งหมด' : 'All' },
                                    { id: 'goal' as const, label: locale === 'th' ? 'ประตู' : 'Goals' },
                                    { id: 'assist' as const, label: locale === 'th' ? 'แอสซิสต์' : 'Assists' },
                                    { id: 'foul' as const, label: locale === 'th' ? 'ฟาวล์' : 'Fouls' },
                                    { id: 'card' as const, label: locale === 'th' ? 'ใบเตือน' : 'Cards' },
                                    { id: 'sub' as const, label: locale === 'th' ? 'เปลี่ยนตัว' : 'Subs' },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setActionFilter(f.id)}
                                        className={cn(
                                            "text-xs font-bold px-2.5 py-1 rounded-sm border transition-all",
                                            actionFilter === f.id
                                                ? "bg-primary text-black border-primary font-black shadow-xs"
                                                : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {filteredActions.length === 0 ? (
                                <div className="p-8 border rounded-sm bg-card text-center space-y-2">
                                    <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                        <Clock className="size-4" />
                                    </div>
                                    <p className="text-xs font-bold text-foreground">
                                        {locale === "th" ? "ไม่มีบันทึกแอคชั่นในหมวดหมู่นี้" : "No actions recorded for this filter"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {locale === "th" ? "ลองเลือกหมวดหมู่อื่นเพื่อดูรายการทั้งหมด" : "Try selecting another category"}
                                    </p>
                                </div>
                            ) : (
                                <div className="relative border rounded-sm bg-card divide-y overflow-hidden shadow-sm">
                                    {filteredActions.map((act, index) => {
                                        const badge = getActionBadge(act.actionType);
                                        const BadgeIcon = badge.icon;
                                        const match = act.matchInfo;
                                        const homeName = match?.home_team?.name || "Home";
                                        const awayName = match?.away_team?.name || "Away";
                                        const hScore = match ? (typeof match.home_score === 'object' && match.home_score !== null && 'total' in match.home_score ? Number((match.home_score as { total?: number }).total) || 0 : match.home_score ?? "-") : "-";
                                        const aScore = match ? (typeof match.away_score === 'object' && match.away_score !== null && 'total' in match.away_score ? Number((match.away_score as { total?: number }).total) || 0 : match.away_score ?? "-") : "-";

                                        return (
                                            <div key={act.id || index} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-4">
                                                {/* Minute Badge */}
                                                <div className="flex flex-col items-center justify-center shrink-0 font-black text-lg text-foreground">
                                                    <span>{act.minute}&apos;</span>
                                                </div>

                                                {/* Action Content */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap justify-between">
                                                        <span className={cn("inline-flex items-center gap-1.5 text-sm font-bold")}>
                                                            <BadgeIcon className={cn("size-4 shrink-0", badge.iconClass)} />
                                                            <span>{act.actionTitle}</span>
                                                        </span>

                                                        {/* Match Matchup Pill */}
                                                        {match && (
                                                            <span className="text-xs text-muted-foreground flex items-center gap-2">
                                                                {match.stage && (
                                                                    <span className="font-bold text-primary uppercase">[{match.stage}]</span>
                                                                )}
                                                                <span className="font-semibold text-foreground truncate max-w-[100px] sm:max-w-none">{homeName}</span>
                                                                <span className="font-black text-foreground">{String(hScore)} - {String(aScore)}</span>
                                                                <span className="font-semibold text-foreground truncate max-w-[100px] sm:max-w-none">{awayName}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {act.actionDetail && (
                                                        <p className="text-xs text-muted-foreground font-medium pl-0.5">
                                                            {act.actionDetail}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. MATCHES TAB */}
                    {activeTab === 'matches' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {playerMatches.length === 0 ? (
                                <div className="p-8 border rounded-sm bg-card text-center space-y-2">
                                    <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                        <Calendar className="size-4" />
                                    </div>
                                    <p className="text-xs font-bold text-foreground">
                                        {locale === "th" ? "ยังไม่มีบันทึกการแข่งขันของผู้เล่นในรายการนี้" : "No match records found for this player"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {playerMatches.map(({ match, isHome, homeScore, awayScore, result, actions }, idx) => {
                                        const homeName = match.home_team?.name || "Home";
                                        const awayName = match.away_team?.name || "Away";
                                        const homeLogo = resolveStorageUrl(match.home_team?.logo_url || (match.home_team as any)?.logo_img);
                                        const awayLogo = resolveStorageUrl(match.away_team?.logo_url || (match.away_team as any)?.logo_img);

                                        const resultBadge = {
                                            win: { label: locale === 'th' ? "ชนะ" : "WIN", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
                                            draw: { label: locale === 'th' ? "เสมอ" : "DRAW", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
                                            loss: { label: locale === 'th' ? "แพ้" : "LOSS", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
                                            scheduled: { label: locale === 'th' ? "รอแข่งขัน" : "SCHEDULED", color: "bg-muted text-muted-foreground border-border" },
                                        }[result];

                                        return (
                                            <div key={match.id || idx} className="p-4 bg-card border rounded-sm space-y-4 transition-all shadow-xs">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {match.scheduled_at && (
                                                            <Header level={5} className="flex items-center">
                                                                {formatDate(match.scheduled_at, "d MMM yyyy", locale)}
                                                            </Header>
                                                        )}
                                                        {match.stage && (
                                                            <Badge variant="outline" className="uppercase">
                                                                {match.stage}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <Badge className={cn(resultBadge.color)}>
                                                        {resultBadge.label}
                                                    </Badge>
                                                </div>

                                                {/* Centered Match Fixture: Home Team | Centered Score | Away Team */}
                                                <div className="flex items-center justify-center w-full gap-2 py-4">
                                                    {/* Home Team (Right-aligned name + logo) */}
                                                    <div className="flex-1 flex items-center justify-end gap-2 text-right min-w-0">
                                                        <span className={cn("font-bold text-xs sm:text-sm truncate", isHome ? "text-primary font-black" : "text-foreground")}>
                                                            {homeName}
                                                        </span>
                                                        {homeLogo ? (
                                                            <Image
                                                                src={homeLogo}
                                                                alt={homeName}
                                                                width={28}
                                                                height={28}
                                                                className="size-6 sm:size-7 rounded-full object-contain shrink-0 border bg-background"
                                                            />
                                                        ) : (
                                                            <div className="size-6 sm:size-7 rounded-full bg-muted/40 border flex items-center justify-center shrink-0 font-bold text-[10px] text-muted-foreground">
                                                                {getTeamInitials(homeName)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Centered Score */}
                                                    <div className="shrink-0 flex items-center justify-center font-bold text-xl tabular-nums">
                                                        <span>{homeScore}</span>
                                                        <span className="text-primary mx-2">-</span>
                                                        <span>{awayScore}</span>
                                                    </div>

                                                    {/* Away Team (Logo + Left-aligned name) */}
                                                    <div className="flex-1 flex items-center justify-start gap-2 text-left min-w-0">
                                                        {awayLogo ? (
                                                            <Image
                                                                src={awayLogo}
                                                                alt={awayName}
                                                                width={28}
                                                                height={28}
                                                                className="size-6 sm:size-7 rounded-full object-contain shrink-0 border bg-background"
                                                            />
                                                        ) : (
                                                            <div className="size-6 sm:size-7 rounded-full bg-muted/40 border flex items-center justify-center shrink-0 font-bold text-[10px] text-muted-foreground">
                                                                {getTeamInitials(awayName)}
                                                            </div>
                                                        )}
                                                        <span className={cn("font-bold text-xs sm:text-sm truncate", !isHome ? "text-primary font-black" : "text-foreground")}>
                                                            {awayName}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Player's Impact in this match */}
                                                <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                                                    {actions.length === 0 ? (
                                                        <span className="text-xs text-muted-foreground/60 italic">
                                                            {locale === 'th' ? "ไม่มีบันทึกแอคชั่นเฉพาะตัว" : "No individual actions logged"}
                                                        </span>
                                                    ) : (
                                                        actions.map((act, aIdx) => {
                                                            const b = getActionBadge(act.actionType);
                                                            const ActionIcon = b.icon;
                                                            const isLast = aIdx === actions.length - 1;
                                                            return (
                                                                <div key={aIdx} className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
                                                                    <ActionIcon className={cn("size-4 shrink-0", b.iconClass)} />
                                                                    <span>{act.minute}&apos; {act.actionTitle}{!isLast ? "," : ""}</span>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Backwards-compatible alias
export const PlayerStatDialog = PlayerStatModal;
