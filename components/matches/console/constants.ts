import {
    Goal as IconGoal,
    RotateCw,
    ShieldAlert,
    MonitorPlay,
    Square,
    Hand
} from "lucide-react";
import { EventType } from "@/types";

export const EVENT_TYPES: { type: EventType; label: string; icon: any; color: string }[] = [
    { type: 'goal', label: 'Goal', icon: IconGoal, color: 'text-green-600' },
    { type: 'yellow_card', label: 'Yellow Card', icon: Square, color: 'text-yellow-500' },
    { type: 'red_card', label: 'Red Card', icon: Square, color: 'text-red-600' },
    { type: 'substitution', label: 'Subs', icon: RotateCw, color: 'text-blue-500' },
    { type: 'foul', label: 'Foul', icon: Hand, color: 'text-orange-600' },
    { type: 'penalty', label: 'Penalty', icon: ShieldAlert, color: 'text-indigo-600' },
    { type: 'var', label: 'VAR', icon: MonitorPlay, color: 'text-purple-600' },
];
