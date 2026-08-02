"use client";

import React, { memo, useEffect, useState } from "react";
import { NodeProps, Node } from "@xyflow/react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SportType } from "@/types";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { FootballStandingNode, StandingNodeData } from "./football-standing-node";
import { VolleyballStandingNode } from "./volleyball-standing-node";

export const StandingNode = memo((props: NodeProps<Node<StandingNodeData>>) => {
    const params = useParams();
    const tournamentId = params.id as string;
    const storeSport = useBracketStore((state) => state.sport);
    const activeCategoryId = useBracketStore((state) => state.activeCategoryId);
    const supabase = createClient();

    const [fetchedSport, setFetchedSport] = useState<SportType | null>(null);

    const sport: SportType = storeSport || (props.data?.sport as SportType) || fetchedSport || 'football';

    useEffect(() => {
        if (storeSport || props.data?.sport) return;

        let isMounted = true;
        async function fetchSport() {
            if (tournamentId) {
                const { data: tData } = await supabase
                    .from('tournaments')
                    .select('sport')
                    .eq('id', tournamentId)
                    .maybeSingle();

                if (isMounted && tData?.sport) {
                    setFetchedSport(tData.sport as SportType);
                    return;
                }
            }

            const catId = activeCategoryId || tournamentId;
            if (catId) {
                const { data: cData } = await supabase
                    .from('tournament_categories')
                    .select('tournament_id, tournament:tournaments(sport)')
                    .eq('id', catId)
                    .maybeSingle();

                const catSport = (cData?.tournament as unknown as { sport?: string } | null)?.sport;
                if (isMounted && catSport) {
                    setFetchedSport(catSport as SportType);
                }
            }
        }

        fetchSport();
        return () => {
            isMounted = false;
        };
    }, [tournamentId, activeCategoryId, storeSport, props.data?.sport, supabase]);

    if (sport === 'volleyball') {
        return <VolleyballStandingNode {...props} />;
    }

    return <FootballStandingNode {...props} />;
});

StandingNode.displayName = "StandingNode";

export { FootballStandingNode, VolleyballStandingNode };
