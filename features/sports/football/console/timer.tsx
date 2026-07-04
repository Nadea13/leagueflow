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
        <div className="flex flex-col items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
                <div className="text-2xl lg:text-6xl font-black tracking-tighter text-primary tabular-nums flex items-baseline gap-1 md:gap-2">
                    <span>{customText ? customText : formatTime(time)}</span>
                    {addedTime && (
                        <span className="text-sm lg:text-3xl text-emerald-400 font-extrabold">+{addedTime}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
