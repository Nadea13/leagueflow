"use client";

import React, { memo, useEffect, useState } from "react";
import { NodeProps, Node } from "@xyflow/react";
import { useParams } from "next/navigation";
import { ApiClient } from "@/lib/api-client";
import { SportType } from "@/types";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { FootballStandingNode, StandingNodeData } from "./football-standing-node";
import { VolleyballStandingNode } from "./volleyball-standing-node";

export const StandingNode = memo((props: NodeProps<Node<StandingNodeData>>) => {
    const params = useParams();
    const tournamentId = params.id as string;
    const storeSport = useBracketStore((state) => state.sport);
    const activeCategoryId = useBracketStore((state) => state.activeCategoryId);

    const [fetchedSport, setFetchedSport] = useState<SportType | null>(null);

    const sport: SportType = storeSport || (props.data?.sport as SportType) || fetchedSport || 'football';

    useEffect(() => {
        if (storeSport || props.data?.sport) return;

        let isMounted = true;
        async function fetchSport() {
            const targetId = tournamentId || activeCategoryId;
            if (!targetId) return;

            try {
                const data = await ApiClient.fetch<{ tournament?: { sport?: string }; sport?: string }>(`/tournaments/${targetId}`);
                const s = data?.tournament?.sport || data?.sport;
                if (isMounted && s) {
                    setFetchedSport(s as SportType);
                }
            } catch {
                // Ignore error
            }
        }

        fetchSport();
        return () => {
            isMounted = false;
        };
    }, [tournamentId, activeCategoryId, storeSport, props.data?.sport]);

    if (sport === 'volleyball') {
        return <VolleyballStandingNode {...props} />;
    }

    return <FootballStandingNode {...props} />;
});

StandingNode.displayName = "StandingNode";

export { FootballStandingNode, VolleyballStandingNode };
