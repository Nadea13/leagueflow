import { Timer, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatchTimerProps {
    time: number;
    readOnly?: boolean;
    customText?: string | number | null;
}

export function MatchTimer({ time, readOnly = false, customText }: MatchTimerProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-4">
            <div className="font-mono text-3xl font-black text-primary tabular-nums">
                {customText ? customText : formatTime(time)}
            </div>
        </div>
    );
}
