import { Play, Pause, Square, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";


interface MatchControlsProps {
    status: string;
    isRunning: boolean;
    readOnly?: boolean;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
    onSetTime?: () => void;
    onAddTime?: () => void;
}

export function MatchControls({
    status,
    isRunning,
    readOnly = false,
    onStart,
    onPause,
    onResume,
    onEnd,
    onSetTime,
    onAddTime
}: MatchControlsProps) {
    const t = useTranslations("Console");

    if (readOnly) return null;

    return (
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 w-full">
            {(status === 'pending' || status === 'scheduled') ? (
                <Button 
                    variant="outline"
                    onClick={onStart}
                    className="flex-1 w-12 md:w-full h-12 md:h-14 bg-secondary/10 border-secondary/20 hover:bg-secondary/20 hover:border-secondary/40 rounded-none transition-all group active:scale-[0.98]"
                >
                    <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-3">
                            <Play className="h-4 w-4 fill-secondary text-secondary group-hover:scale-110 transition-transform" /> 
                            <span className="hidden md:inline text-[11px] font-black uppercase tracking-widest text-secondary">{t("start_match")}</span>
                        </div>
                        <span className="hidden md:block text-[9px] text-secondary/60 ml-7">Kick off the competition</span>
                    </div>
                </Button>
            ) : status === 'live' && isRunning ? (
                <Button 
                    variant="outline"
                    onClick={onPause}
                    className="flex-1 w-12 md:w-full h-12 md:h-14 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 rounded-none transition-all group active:scale-[0.98]"
                >
                    <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-3">
                            <Pause className="h-4 w-4 fill-orange-500 text-orange-500 group-hover:scale-110 transition-transform" /> 
                            <span className="hidden md:inline text-[11px] font-black uppercase tracking-widest text-orange-500">{t("pause")}</span>
                        </div>
                        <span className="hidden md:block text-[9px] text-orange-500/60 ml-7">Temporarily halt play</span>
                    </div>
                </Button>
            ) : status === 'live' && !isRunning ? (
                <Button 
                    variant="outline"
                    onClick={onResume}
                    className="flex-1 w-12 md:w-full h-12 md:h-14 bg-secondary/10 border-secondary/20 hover:bg-secondary/20 hover:border-secondary/40 rounded-none transition-all group active:scale-[0.98]"
                >
                    <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-3">
                            <Play className="h-4 w-4 fill-secondary text-secondary group-hover:scale-110 transition-transform" /> 
                            <span className="hidden md:inline text-[11px] font-black uppercase tracking-widest text-secondary">{t("resume_match")}</span>
                        </div>
                        <span className="hidden md:block text-[9px] text-secondary/60 ml-7">Continue the match</span>
                    </div>
                </Button>
            ) : (
                <Button 
                    variant="outline"
                    disabled
                    className="flex-1 w-12 md:w-full h-8 md:h-10 bg-foreground/5 border-foreground/10 rounded-none opacity-50 cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-foreground/20" /> 
                        <span className="hidden md:inline text-[11px] font-black uppercase tracking-widest text-foreground/20">{t("match_finished")}</span>
                    </div>
                </Button>
            )}

            <Button 
                variant="outline"
                onClick={onEnd}
                disabled={status === 'finished'}
                className="flex-1 w-12 md:w-full h-8 md:h-10 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 rounded-none transition-all group active:scale-[0.98]"
            >
                <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Square className="h-4 w-4 fill-red-500 text-red-500 group-hover:scale-110 transition-transform" /> 
                        <span className="hidden md:inline text-[11px] font-black uppercase tracking-widest text-red-500">{t("stop_finish")}</span>
                    </div>
                    <span className="hidden md:block text-[9px] text-red-500/60 ml-7">End the regulation time</span>
                </div>
            </Button>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 w-full">
                {onSetTime && (
                    <Button 
                        variant="outline"
                        onClick={onSetTime}
                        className="h-10 bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-foreground/20 rounded-none transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-foreground/40 group-hover:text-foreground transition-colors" />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-foreground/60 group-hover:text-foreground transition-colors">{t("set_time")}</span>
                        </div>
                    </Button>
                )}

                {onAddTime && (
                    <Button 
                        variant="outline"
                        onClick={onAddTime}
                        className="h-10 bg-foreground/5 border-foreground/5 hover:bg-foreground/10 hover:border-secondary/40 rounded-none transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <Plus className="h-4 w-4 text-secondary group-hover:scale-110 transition-transform" />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-foreground/60 group-hover:text-secondary transition-colors">{t("add_time")}</span>
                        </div>
                    </Button>
                )}
            </div>
        </div>
    );
}


