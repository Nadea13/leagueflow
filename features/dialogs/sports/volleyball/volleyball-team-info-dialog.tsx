"use client";

import React from "react";
import { MatchEvent, Player } from "@/types";
import { TeamRosterDialog } from "@/components/teams/team-roster-dialog";

interface VolleyballTeamInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamName: string;
    teamLogo?: string | null;
    description?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    players: Player[];
    activeLineupIds?: string[];
    events?: MatchEvent[];
    teamId?: string | null;
}

export function VolleyballTeamInfoDialog(props: VolleyballTeamInfoDialogProps) {
    return (
        <TeamRosterDialog
            {...props}
            sport="volleyball"
        />
    );
}
