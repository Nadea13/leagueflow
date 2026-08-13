import { Match, MatchEvent } from "@/types/index";

export interface MatchScoreBoxProps {
    match: Match;
    sport?: string;
    events?: MatchEvent[];
    isLive: boolean;
    isFinished: boolean;
    isEditMode: boolean;
    isLiveStatus: boolean;
    liveTime: number;
    matchTime: string;
    formatTime: (timeStr?: string | null) => string | null;
    formatSeconds: (totalSeconds: number) => string;
    handleTimeUpdate: (newTime: string) => void;
    getScore: (score: number | { total?: number } | null | undefined) => number;
}
