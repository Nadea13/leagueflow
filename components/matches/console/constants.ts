import {
    Goal as IconGoal,
    RotateCw,
    ShieldAlert,
    MonitorPlay,
    Square,
    Hand,
    Shield,
    Play,
    Pause,
    Clock,
    CheckCircle2,
    Coffee,
    Flag,
    Stethoscope
} from "lucide-react";
import { EventType } from "@/types";

export const EVENT_TYPES: { type: EventType; label: string; icon: any; color: string }[] = [
    { type: 'goal', label: 'goal', icon: IconGoal, color: 'text-green-600' },
    { type: 'yellow_card', label: 'yellow_card', icon: Square, color: 'text-yellow-500' },
    { type: 'red_card', label: 'red_card', icon: Square, color: 'text-red-600' },
    { type: 'substitution', label: 'substitution', icon: RotateCw, color: 'text-blue-500' },
    { type: 'foul', label: 'foul', icon: Hand, color: 'text-orange-600' },
    { type: 'penalty', label: 'penalty', icon: ShieldAlert, color: 'text-indigo-600' },
    { type: 'save', label: 'save', icon: Shield, color: 'text-teal-600' },
    { type: 'var', label: 'var', icon: MonitorPlay, color: 'text-purple-600' },
    { type: 'corner', label: 'corner', icon: Flag, color: 'text-slate-900 dark:text-white' },
    { type: 'injury', label: 'injury', icon: Stethoscope, color: 'text-red-600' },
    { type: 'kick_off', label: 'kick_off', icon: Play, color: 'text-green-500' },
    { type: 'half_time', label: 'half_time', icon: Coffee, color: 'text-amber-500' },
    { type: 'full_time', label: 'full_time', icon: CheckCircle2, color: 'text-blue-500' },
    { type: 'match_paused', label: 'match_paused', icon: Pause, color: 'text-amber-500' },
    { type: 'match_resumed', label: 'match_resumed', icon: Play, color: 'text-green-500' },
    { type: 'add_time', label: 'add_time', icon: Clock, color: 'text-secondary' },
];
