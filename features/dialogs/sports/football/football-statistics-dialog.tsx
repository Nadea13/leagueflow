"use client";

import { Match, MatchEvent } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MatchStatisticsBox } from "@/features/sports/football/console/statistics-box";

export interface FootballStatisticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: Match;
    events: MatchEvent[];
    homeScore: number;
    awayScore: number;
    visibleStats?: string[];
}

export function FootballStatisticsDialog({
    open,
    onOpenChange,
    match,
    events,
    homeScore,
    awayScore,
    visibleStats,
}: FootballStatisticsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-xl max-h-[85vh] bg-card rounded-sm overflow-hidden p-0 border border-border flex flex-col">
                <MatchStatisticsBox
                    match={match}
                    events={events}
                    homeScore={homeScore}
                    awayScore={awayScore}
                    visibleStats={visibleStats}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
