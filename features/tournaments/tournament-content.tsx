"use client";

import { useEffect, useState } from "react";
import { Bracket } from "@/features/tournaments/ranking/bracket";
import { Canvas } from "@/features/tournaments/builder/canvas";
import { Match, Goal, Tournament, TournamentTeam } from "@/types/index";

interface TournamentContentProps {
    tournament: Tournament;
    initialMatches: Match[];
    initialTeams: (TournamentTeam & { team?: { user_id: string | null } })[];
    initialGoals: Goal[];
    userPlan: string | undefined;
    initialIsPro: boolean;
    id: string;
    userRole: 'admin' | 'editor' | 'viewer' | null;
}

export function TournamentContent({
    tournament: initialTournament,
    initialMatches,
    initialTeams,
    initialGoals: _initialGoals,
    userPlan,
    initialIsPro: _initialIsPro,
    id,
    userRole
}: TournamentContentProps) {
    // const router = useRouter();
    // const supabase = createClient();

    // State
    const [tournament, setTournament] = useState(initialTournament);
    const [matches, setMatches] = useState<Match[]>(initialMatches);
    const [teams, setTeams] = useState<(TournamentTeam & { team?: { user_id: string | null } })[]>(initialTeams);

    // Sync state only when initial props actually change
    useEffect(() => {
        setTournament(initialTournament);
    }, [initialTournament]);

    useEffect(() => {
        setMatches(initialMatches);
    }, [initialMatches]);

    useEffect(() => {
        setTeams(initialTeams);
    }, [initialTeams]);

    // Derived State
    const hasFixtures = matches.length > 0;

    return (
        <div className="h-full w-full overflow-hidden">
            {tournament && (
                <div className="h-full relative z-10">
                    {(userRole === 'admin' || userRole === 'editor') ? (
                        <Canvas
                            tournamentId={id}
                            tournamentName={tournament.name}
                            initialCanvasData={tournament.canvas_data ?? null}
                            isCompact={false}
                            tournament={tournament}
                            hasFixtures={hasFixtures}
                            teams={teams}
                            matches={matches}
                            userPlan={userPlan}
                        />
                    ) : (
                        <Bracket
                            matches={matches}
                            canvasData={tournament.canvas_data}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
