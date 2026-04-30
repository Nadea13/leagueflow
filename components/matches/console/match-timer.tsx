// Removed unused Timer, RotateCcw imports



interface MatchTimerProps {
    time: number;
    readOnly?: boolean;
    customText?: string | number | null;
    addedTime?: number | null;
}

export function MatchTimer({ time, readOnly: _readOnly = false, customText, addedTime }: MatchTimerProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
                <div className="text-2xl lg:text-6xl font-black tracking-tighter text-primary tabular-nums drop-shadow-[0_0_15px_rgba(5,255,163,0.2)]">
                    {customText ? customText : formatTime(time)}
                </div>
            </div>
            {addedTime && (
                <div className="px-3 py-1 bg-primary text-black text-[9px] font-black tracking-widest">
                    +{addedTime} MIN ADDED
                </div>
            )}
        </div>
    );
}


