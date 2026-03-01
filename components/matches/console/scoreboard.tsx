import { Match, EventType } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EVENT_TYPES } from "./constants";
import { useTranslations } from "next-intl";

interface ScoreboardProps {
    match: Match;
    homeScore: number;
    awayScore: number;
    isPro?: boolean;
    readOnly?: boolean;
    onAction: (teamId: string, type: EventType) => void;
}

export function Scoreboard({ match, homeScore, awayScore, isPro = false, readOnly = false, onAction }: ScoreboardProps) {
    const t = useTranslations("Console");

    const TeamScore = ({ team, teamId, score, isHome }: { team: any; teamId: string | null; score: number; isHome: boolean }) => (
        <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-none border shadow-sm w-full">
            {team?.logo_url && <img src={team.logo_url} className="w-16 h-16 object-contain" alt={team.name} />}
            <h3 className="font-bold text-center line-clamp-1" title={team?.name}>{team?.name}</h3>
            <div className="text-6xl font-black">{score}</div>
            <div className="grid grid-cols-3 gap-2 w-full mt-2">
                {!readOnly && EVENT_TYPES.filter(t => t.type !== 'var' && (isPro || t.type === 'goal')).map(evt => (
                    <Button
                        key={evt.type}
                        variant="outline"
                        size="sm"
                        className={cn("h-10 p-0 flex flex-col items-center justify-center gap-0.5", evt.color)}
                        onClick={() => teamId && onAction(teamId, evt.type)}
                        disabled={!teamId}
                        title={t(evt.label)}
                    >
                        <evt.icon className="h-4 w-4" />
                        <span className="text-[10px] uppercase font-bold hidden sm:inline">{t(evt.label)}</span>
                    </Button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center w-full">
            <TeamScore team={match.home_team} teamId={match.home_team_id} score={homeScore} isHome={true} />
            <div className="text-2xl font-black text-muted-foreground/30">VS</div>
            <TeamScore team={match.away_team} teamId={match.away_team_id} score={awayScore} isHome={false} />
        </div>
    );
}
