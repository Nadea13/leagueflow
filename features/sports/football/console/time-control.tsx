import { Play, Pause, Square, Clock, Plus, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";


interface MatchTimeControlProps {
    status: string;
    isRunning: boolean;
    readOnly?: boolean;
    onStart: () => void;
    onPause: () => void;
    onHalfTime: () => void;
    onResume: () => void;
    onEnd: () => void;
    onSetTime?: () => void;
    onAddTime?: () => void;
}

export function MatchTimeControl({
    status,
    isRunning,
    readOnly = false,
    onStart,
    onPause,
    onHalfTime,
    onResume,
    onEnd,
    onSetTime,
    onAddTime
}: MatchTimeControlProps) {
    const t = useTranslations("Console");

    if (readOnly) return null;

    return (
        <div className="grid grid-cols-4 md:grid-cols-1 gap-1 md:gap-2 w-full">
            {(status === 'pending' || status === 'scheduled') ? (
                <Button
                    variant="outline"
                    onClick={onStart}
                    className="w-full justify-center md:justify-start px-2 bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group active:scale-[0.98]"
                >
                    <div className="flex items-start gap-1 md:gap-2">
                        <Play className="h-4 w-4 fill-primary text-primary" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("start_match")}</span>
                    </div>
                </Button>
            ) : status === 'live' && isRunning ? (
                <div className="flex flex-col gap-1 w-full">
                    <Button
                        variant="outline"
                        onClick={onPause}
                        className="w-full justify-center md:justify-start px-2 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all group active:scale-[0.98]"
                    >
                        <div className="flex items-start gap-1 md:gap-2">
                            <Pause className="h-4 w-4 fill-orange-500 text-orange-500" />
                            <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("pause")}</span>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onHalfTime}
                        className="w-full justify-center md:justify-start px-2 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all group active:scale-[0.98]"
                    >
                        <div className="flex items-start gap-1 md:gap-2">
                            <Coffee className="h-4 w-4 text-amber-500" />
                            <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("half_time")}</span>
                        </div>
                    </Button>
                </div>
            ) : status === 'live' && !isRunning ? (
                <Button
                    variant="outline"
                    onClick={onResume}
                    className="w-full justify-center md:justify-start px-2 bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group active:scale-[0.98]"
                >
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 fill-primary text-primary" />
                            <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("resume_match")}</span>
                        </div>
                    </div>
                </Button>
            ) : (
                <Button
                    variant="outline"
                    disabled
                    className="w-full justify-center md:justify-start px-2 bg-foreground/5 border-foreground/10 opacity-50 cursor-not-allowed"
                >
                    <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-foreground" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("match_finished")}</span>
                    </div>
                </Button>
            )}

            <Button
                variant="outline"
                onClick={onEnd}
                disabled={status === 'finished'}
                className="w-full justify-center md:justify-start px-2 bg-destructive/10 border-destructive/20 hover:bg-destructive/20 hover:border-destructive/40 transition-all group active:scale-[0.98]"
            >
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 fill-destructive text-destructive" />
                        <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("stop_finish")}</span>
                    </div>
                </div>
            </Button>

            {onSetTime && (
                <Button
                    variant="outline"
                    onClick={onSetTime}
                    className="w-full justify-center md:justify-start px-2 bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-foreground/20 transition-all group"
                >
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("set_time")}</span>
                        </div>
                    </div>
                </Button>
            )}

            {onAddTime && (
                <Button
                    variant="outline"
                    onClick={onAddTime}
                    className="w-full justify-center md:justify-start px-2 group"
                >
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" />
                            <span className="hidden md:inline text-xs font-bold tracking-widest text-foreground">{t("add_time")}</span>
                        </div>
                    </div>
                </Button>
            )}
        </div>
    );
}


