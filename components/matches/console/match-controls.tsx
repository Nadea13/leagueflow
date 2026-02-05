import { Play, Pause, Square } from "lucide-react";
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
}

export function MatchControls({
    status,
    isRunning,
    readOnly = false,
    onStart,
    onPause,
    onResume,
    onEnd
}: MatchControlsProps) {
    const t = useTranslations("Console");

    if (readOnly || status === 'finished') return null;

    return (
        <div className="flex justify-center items-center gap-2">
            {/* Start / Resume Button */}
            <Button
                type="button"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={status !== 'live' ? onStart : onResume}
                disabled={status === 'live' && isRunning}
            >
                <Play className="h-4 w-4 fill-current" />
                {status !== 'live' ? t("start_match") : t("resume_match")}
            </Button>

            {/* Pause Button */}
            <Button
                type="button"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onPause}
                disabled={status !== 'live' || !isRunning}
            >
                <Pause className="h-4 w-4 fill-current" />
                {t("pause_match")}
            </Button>

            {/* End Button */}
            <Button
                type="button"
                size="sm"
                variant="destructive"
                className="font-bold gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onEnd}
                disabled={status !== 'live'}
            >
                <Square className="h-4 w-4 fill-current" />
                {t("end_match")}
            </Button>
        </div>
    );
}
