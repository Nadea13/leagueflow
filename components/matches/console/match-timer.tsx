import { Timer, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatchTimerProps {
    time: number;
    readOnly?: boolean;
    customText?: string | number | null;
    onAddTime?: () => void;
    addedTime?: number | null;
}

export function MatchTimer({ time, readOnly = false, customText, onAddTime, addedTime }: MatchTimerProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
                <Timer className="h-4 w-4 text-secondary/50" />
                <div className="text-5xl lg:text-6xl font-black tracking-tighter text-secondary tabular-nums drop-shadow-[0_0_15px_rgba(5,255,163,0.2)]">
                    {customText ? customText : formatTime(time)}
                </div>
            </div>
            {addedTime && (
                <div className="px-3 py-1 bg-secondary text-black text-[9px] font-black uppercase tracking-widest skew-x-[-12deg]">
                    <span className="skew-x-[12deg] inline-block">+{addedTime} MIN ADDED</span>
                </div>
            )}
        </div>
    );
}


