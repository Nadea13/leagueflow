import { Play, Pause, Square, Clock, Plus, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";


interface MatchTimeControlProps {
    status: string;
    isRunning: boolean;
    readOnly?: boolean;
    lastPeriodEventType?: string;
    onStart: () => void;
    onPause: () => void;
    onHalfTime: () => void;
    onRegularFullTime?: () => void;
    onStartExtraTime?: () => void;
    onExtraTimeHalfTime?: () => void;
    onStartPenalties?: () => void;
    onResume: () => void;
    onEnd: () => void;
    onSetTime?: () => void;
    onAddTime?: () => void;
}

export function MatchTimeControl({
    status,
    isRunning,
    readOnly = false,
    lastPeriodEventType,
    onStart,
    onPause,
    onHalfTime,
    onRegularFullTime,
    onStartExtraTime,
    onExtraTimeHalfTime,
    onStartPenalties,
    onResume,
    onEnd,
    onSetTime,
    onAddTime
}: MatchTimeControlProps) {
    const t = useTranslations("Console");

    if (readOnly) return null;

    const isFinished = status === 'finished';
    const isNotStarted = status === 'pending' || status === 'scheduled' || (!lastPeriodEventType && !isRunning && status !== 'live');

    return (
        <div className="grid grid-cols-4 lg:grid-cols-1 gap-1 lg:gap-2 w-full">
            {isFinished ? (
                <Button
                    variant="outline"
                    disabled
                    className="w-full justify-center lg:justify-start px-2 bg-foreground/5 border-foreground/10 opacity-50 cursor-not-allowed"
                >
                    <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-foreground" />
                        <span className="hidden lg:inline">{t("match_finished")}</span>
                    </div>
                </Button>
            ) : isNotStarted ? (
                <Button
                    variant="outline"
                    onClick={onStart}
                    className="w-full justify-center lg:justify-start px-2 bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group active:scale-[0.98]"
                >
                    <div className="flex items-start gap-1 lg:gap-2">
                        <Play className="h-4 w-4 fill-primary text-primary" />
                        <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("start_match")}</span>
                    </div>
                </Button>
            ) : isRunning ? (
                <div className="flex flex-col gap-1 w-full">
                    <Button
                        variant="outline"
                        onClick={onPause}
                        className="w-full justify-center lg:justify-start px-2 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all group active:scale-[0.98]"
                    >
                        <div className="flex items-start gap-1 lg:gap-2">
                            <Pause className="h-4 w-4 fill-orange-500 text-orange-500" />
                            <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("pause")}</span>
                        </div>
                    </Button>

                    {/* Period-specific Break / End Button */}
                    {(!lastPeriodEventType || lastPeriodEventType === 'first_half') && (
                        <Button
                            variant="outline"
                            onClick={onHalfTime}
                            className="w-full justify-center lg:justify-start px-2 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-1 lg:gap-2">
                                <Coffee className="h-4 w-4 text-amber-500" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("half_time")}</span>
                            </div>
                        </Button>
                    )}

                    {lastPeriodEventType === 'second_half' && (
                        <Button
                            variant="outline"
                            onClick={onRegularFullTime || onHalfTime}
                            className="w-full justify-center lg:justify-start px-2 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-1 lg:gap-2">
                                <Coffee className="h-4 w-4 text-blue-500" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("regular_full_time") || "หมดเวลาปกติ"}</span>
                            </div>
                        </Button>
                    )}

                    {lastPeriodEventType === 'extra_time' && (
                        <Button
                            variant="outline"
                            onClick={onExtraTimeHalfTime || onHalfTime}
                            className="w-full justify-center lg:justify-start px-2 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-1 lg:gap-2">
                                <Coffee className="h-4 w-4 text-indigo-500" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("pause_extra_time") || "พักครึ่งต่อเวลา"}</span>
                            </div>
                        </Button>
                    )}

                    {lastPeriodEventType === 'extra_time_second_half' && (
                        <Button
                            variant="outline"
                            onClick={onRegularFullTime || onHalfTime}
                            className="w-full justify-center lg:justify-start px-2 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-1 lg:gap-2">
                                <Coffee className="h-4 w-4 text-indigo-500" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("regular_full_time") || "จบช่วงต่อเวลา"}</span>
                            </div>
                        </Button>
                    )}
                </div>
            ) : (
                /* Paused / Break / Period Transition States */
                <div className="flex flex-col gap-1 w-full">
                    {lastPeriodEventType === 'half_time' ? (
                        <Button
                            variant="outline"
                            onClick={onResume}
                            className="w-full justify-center lg:justify-start px-2 bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 fill-primary text-primary" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("start_second_half") || "เริ่มครึ่งหลัง"}</span>
                            </div>
                        </Button>
                    ) : lastPeriodEventType === 'full_time' ? (
                        <>
                            {onStartExtraTime && (
                                <Button
                                    variant="outline"
                                    onClick={onStartExtraTime}
                                    className="w-full justify-center lg:justify-start px-2 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-2">
                                        <Play className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                                        <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("start_extra_time") || "เริ่มต่อเวลาพิเศษ"}</span>
                                    </div>
                                </Button>
                            )}
                            {onStartPenalties && (
                                <Button
                                    variant="outline"
                                    onClick={onStartPenalties}
                                    className="w-full justify-center lg:justify-start px-2 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-2">
                                        <Play className="h-4 w-4 fill-rose-500 text-rose-500" />
                                        <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("start_penalties") || "เริ่มดวลจุดโทษ"}</span>
                                    </div>
                                </Button>
                            )}
                        </>
                    ) : lastPeriodEventType === 'extra_time_half_time' ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={onResume}
                                className="w-full justify-center lg:justify-start px-2 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all group active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-2">
                                    <Play className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                                    <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("extra_time_second_half") || "ต่อเวลาครึ่งหลัง"}</span>
                                </div>
                            </Button>
                            {onStartPenalties && (
                                <Button
                                    variant="outline"
                                    onClick={onStartPenalties}
                                    className="w-full justify-center lg:justify-start px-2 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-2">
                                        <Play className="h-4 w-4 fill-rose-500 text-rose-500" />
                                        <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("start_penalties") || "เริ่มดวลจุดโทษ"}</span>
                                    </div>
                                </Button>
                            )}
                        </>
                    ) : lastPeriodEventType === 'penalties' ? (
                        <Button
                            variant="outline"
                            onClick={onStartPenalties}
                            className="w-full justify-center lg:justify-start px-2 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 fill-rose-500 text-rose-500" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("penalties") || "ดวลจุดโทษ"}</span>
                            </div>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={onResume}
                            className="w-full justify-center lg:justify-start px-2 bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 fill-primary text-primary" />
                                <span className="hidden lg:inline text-xs font-bold tracking-widest text-foreground">{t("resume_match")}</span>
                            </div>
                        </Button>
                    )}
                </div>
            )}

            <Button
                variant="outline"
                onClick={onEnd}
                disabled={isFinished}
                className="w-full justify-center lg:justify-start px-2 bg-destructive/10 border-destructive/20 hover:bg-destructive/20 hover:border-destructive/40 transition-all group active:scale-[0.98]"
            >
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 fill-destructive text-destructive" />
                        <span className="hidden lg:inline">{t("stop_finish")}</span>
                    </div>
                </div>
            </Button>

            {onSetTime && (
                <Button
                    variant="outline"
                    onClick={onSetTime}
                    className="w-full justify-center lg:justify-start px-2 bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-foreground/20 transition-all group"
                >
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="hidden lg:inline">{t("set_time")}</span>
                        </div>
                    </div>
                </Button>
            )}

            {onAddTime && (
                <Button
                    variant="outline"
                    onClick={onAddTime}
                    className="w-full justify-center lg:justify-start px-2 group"
                >
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" />
                            <span className="hidden lg:inline">{t("add_time")}</span>
                        </div>
                    </div>
                </Button>
            )}
        </div>
    );
}


