"use client";

import { MatchScoreBoxProps } from "./types";
import { FootballScoreBox } from "./football-score-box";
import { VolleyballScoreBox } from "./volleyball-score-box";

export function MatchScoreBox(props: MatchScoreBoxProps) {
    const isVolleyball = props.sport === "volleyball" || props.sport?.includes("volleyball");

    if (isVolleyball) {
        return <VolleyballScoreBox {...props} />;
    }

    return <FootballScoreBox {...props} />;
}

export type { MatchScoreBoxProps };
