"use client";

import { Match, MatchEvent } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VolleyballMatchStatisticsBox } from "@/features/sports/volleyball/console/statistics-box";

export interface VolleyballStatisticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: Match;
    events: MatchEvent[];
    homeSetsWon: number;
    awaySetsWon: number;
    homePoints: number;
    awayPoints: number;
    visibleStats?: string[];
}

export function VolleyballStatisticsDialog({
    open,
    onOpenChange,
    match,
    events,
    homeSetsWon,
    awaySetsWon,
    homePoints,
    awayPoints,
    visibleStats,
}: VolleyballStatisticsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-xl max-h-[85vh] bg-card rounded-sm overflow-hidden p-0 border border-border flex flex-col">
                <VolleyballMatchStatisticsBox
                    match={match}
                    events={events}
                    homeSetsWon={homeSetsWon}
                    awaySetsWon={awaySetsWon}
                    homePoints={homePoints}
                    awayPoints={awayPoints}
                    visibleStats={visibleStats}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
