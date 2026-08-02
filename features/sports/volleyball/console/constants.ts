import React from "react";
import {
    Volleyball,
    Zap,
    Flame,
    ShieldCheck,
    RotateCw,
    Clock,
    Hand,
    Square,
    Trophy,
    Ban,
    Play,
    Pause,
    CheckCircle2
} from "lucide-react";
import { EventType } from "@/types";

export const VOLLEYBALL_EVENT_TYPES: { type: EventType; label: string; icon: React.ElementType; color: string }[] = [
    { type: 'point', label: 'point', icon: Volleyball, color: 'text-amber-500' },
    { type: 'ace', label: 'ace', icon: Zap, color: 'text-yellow-400' },
    { type: 'spike', label: 'spike', icon: Flame, color: 'text-red-500' },
    { type: 'block', label: 'block', icon: ShieldCheck, color: 'text-blue-500' },
    { type: 'substitution', label: 'substitution', icon: RotateCw, color: 'text-emerald-500' },
    { type: 'timeout', label: 'timeout', icon: Clock, color: 'text-purple-500' },
    { type: 'foul', label: 'foul', icon: Hand, color: 'text-orange-500' },
    { type: 'yellow_card', label: 'yellow_card', icon: Square, color: 'text-yellow-500' },
    { type: 'red_card', label: 'red_card', icon: Square, color: 'text-red-600' },
    { type: 'set_win', label: 'set_win', icon: Trophy, color: 'text-amber-400' },
    { type: 'walkover', label: 'walkover', icon: Ban, color: 'text-red-500' },
    { type: 'match_paused', label: 'match_paused', icon: Pause, color: 'text-amber-500' },
    { type: 'match_resumed', label: 'match_resumed', icon: Play, color: 'text-green-500' },
    { type: 'full_time', label: 'full_time', icon: CheckCircle2, color: 'text-blue-500' },
];
