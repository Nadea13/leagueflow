"use client";

import { memo } from "react";
import Image from "next/image";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { MatchNodeData, useBracketStore } from "@/lib/stores/bracket-store";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Match, TournamentTeam, MatchEvent } from "@/types";

type MatchNodeType = Node<MatchNodeData, "matchNode">;

export const MatchNode = memo(function MatchNode({
    id,
    data,
    selected,
}: NodeProps<MatchNodeType>) {
    const updateNodeData = useBracketStore((s) => s.updateNodeData);
    const edges = useBracketStore((s) => s.edges);
    const nodes = useBracketStore((s) => s.nodes);
    const storeTeams = useBracketStore((s) => s.teams);
    const storeSport = useBracketStore((s) => s.sport);
    const params = useParams();
    const tournamentId = params.id as string;
    const supabase = createClient();

    const [dbMatches, setDbMatches] = useState<Match[]>([]);
    const [dbEvents, setDbEvents] = useState<MatchEvent[]>([]);
    const [fetchedSport, setFetchedSport] = useState<string | null>(null);
    const [_tick, setTick] = useState(0);
    const matches = useMemo(() => Array.isArray(data.matches) ? data.matches : [], [data.matches]);

    const sport = useMemo(() => {
        const s = storeSport || (data as { sport?: string })?.sport || fetchedSport || 'football';
        return String(s).toLowerCase();
    }, [storeSport, data, fetchedSport]);

    // Local ticker to update the live timer every second
    useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        async function fetchScores() {
            if (tournamentId && !storeSport && !(data as { sport?: string })?.sport) {
                const { data: tourData } = await supabase
                    .from('tournaments')
                    .select('sport, sports(sport_name)')
                    .eq('id', tournamentId)
                    .maybeSingle();

                if (tourData) {
                    const sName = tourData.sport || (tourData.sports as unknown as { sport_name?: string })?.sport_name;
                    if (sName) setFetchedSport(sName.toLowerCase());
                }
            }

            const matchDbIds = matches.map(m => m.dbId).filter(Boolean) as string[];
            if (matchDbIds.length === 0) return;

            const { data: results } = await supabase
                .from('matches')
                .select('*')
                .in('id', matchDbIds)
                .is('deleted_at', null);
            
            if (results) {
                setDbMatches(results);
            }

            const { data: evs } = await supabase
                .from('match_events')
                .select('*')
                .in('match_id', matchDbIds);
            
            if (evs) {
                setDbEvents(evs as MatchEvent[]);
            }
        }

        fetchScores();
        const interval = setInterval(fetchScores, 2000);

        const channel = supabase
            .channel(`match-node-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchScores)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events' }, fetchScores)
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [id, tournamentId, supabase, matches, storeSport, data]);

    return (
        <div
            className={cn(
                "relative w-[320px] border bg-card text-card-foreground transition-all cursor-pointer rounded-sm shadow-md",
                selected
                    ? "border-node-2"
                    : "border-border hover:border-node-2/50"
            )}
        >
            {/* Top Target Handle for Group Connection */}
            <Handle
                type="target"
                position={Position.Top}
                id="group-in"
                className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-2 transition-all z-50"
                style={{ top: "-1px" }}
            />

            {/* ── Header ── */}
            <div className="flex items-center p-2 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-node-2/10 rounded flex items-center justify-center">
                        <span className="text-node-2 text-xs font-bold">VS</span>
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-2">
                        {matches.length > 1 ? "Round" : "Match"}
                    </span>
                    <span className="text-xs font-black tracking-wide">
                        {data.label}
                    </span>
                </div>
            </div>

            {/* ── Match List ── */}
            <div className="flex flex-col divide-y divide-border">
                {matches.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-center text-muted-foreground">
                            No matches in this round
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                    {matches
                        .slice()
                        .sort((a, b) => {
                            const dateA = a.match_date || "9999-12-31";
                            const timeA = a.match_time || "23:59";
                            const dateB = b.match_date || "9999-12-31";
                            const timeB = b.match_time || "23:59";
                            if (dateA !== dateB) return dateA.localeCompare(dateB);
                            return timeA.localeCompare(timeB);
                        })
                        .map((match, index) => {
                            const dbMatch = dbMatches.find(m => 
                                m.id === match.dbId || 
                                (m.placeholder_a === match.placeholderA && m.placeholder_b === match.placeholderB)
                            );

                            // Resolve live teams from edges
                            const getResolvedTeam = (slot: 'a' | 'b') => {
                                // 1. If we have a database match with a team ID assigned, use it
                                if (dbMatch) {
                                    const teamId = slot === 'a' ? dbMatch.home_team_id : dbMatch.away_team_id;
                                    if (teamId) {
                                        const team = storeTeams.find(t => String(t.team_id || t.id) === String(teamId));
                                        if (team) return team.name;
                                    }
                                }

                                // 2. Fall back to resolved placeholder/ranking/label from edge connections
                                const handleId = `slot-${slot}-${index}`;
                                const edge = edges.find(e => e.target === id && e.targetHandle === handleId);
                                if (!edge) return null;

                                const sourceNode = nodes.find(n => n.id === edge.source);
                                if (!sourceNode) return null;

                                // Handle TeamListNode propagation
                                if (sourceNode.type === 'teamListNode') {
                                    const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                                    if (teamIdMatch) {
                                        const teamId = teamIdMatch[1];
                                        const sourceTeams = (sourceNode.data.teams as TournamentTeam[]) || storeTeams;
                                        const team = sourceTeams.find(t => String(t.id) === String(teamId) || String(t.team_id) === String(teamId));
                                        return team?.name || null;
                                    }
                                }

                                // Handle StandingNode/GroupNode propagation
                                if (sourceNode.type === 'standingNode' || sourceNode.type === 'groupNode') {
                                    const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
                                    if (rankMatch) {
                                        const rankIndex = parseInt(rankMatch[1], 10);
                                        const rankings = (sourceNode.data as { rankings?: string[] }).rankings || [];
                                        if (rankings[rankIndex]) return rankings[rankIndex];
                                        
                                        const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                                        return `${rankSuffix} Place (${sourceNode.data.label})`;
                                    }
                                }

                                // Handle MatchNode propagation (Winner / Loser)
                                if (sourceNode.type === 'matchNode') {
                                    const winnerMatch = edge.sourceHandle?.match(/winner-(\d+)/);
                                    if (winnerMatch) {
                                        const winnerIndex = parseInt(winnerMatch[1], 10);
                                        return `Winner (Match ${winnerIndex + 1})`;
                                    }
                                    const loserMatch = edge.sourceHandle?.match(/loser-(\d+)/);
                                    if (loserMatch) {
                                        const loserIndex = parseInt(loserMatch[1], 10);
                                        return `Loser (Match ${loserIndex + 1})`;
                                    }
                                }

                                return null;
                            };

                            const liveTeamA = getResolvedTeam('a');
                            const liveTeamB = getResolvedTeam('b');
                            
                            const matchDate = dbMatch?.match_date || match.match_date;
                            const matchTime = dbMatch?.match_time || match.match_time;

                            const isGroupConnected = edges.some(e => e.target === id && e.targetHandle === 'group-in');

                            return (
                                <div key={match.id || index} className="relative">
                                    {/* Match Number Indicator / Date-Time */}
                                    {(matches.length > 1 || matchDate || matchTime) && (
                                        <div className="px-2 flex items-center justify-between gap-2 mt-1">
                                            {matches.length > 1 ? (
                                                <span className="text-[10px] font-black text-node-2 tracking-tighter">
                                                    Match #{index + 1}
                                                </span>
                                            ) : (
                                                <span />
                                            )}
                                            {dbMatch?.status === 'live' ? (() => {
                                                const elapsed = dbMatch.elapsed_before_pause || 0;
                                                let liveSeconds = elapsed;
                                                
                                                // Check if half time is the latest event
                                                const matchEvents = dbEvents.filter(e => e.match_id === dbMatch.id);
                                                const lastTimerEvent = [...matchEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                                const isNodeHalfTime = lastTimerEvent?.event_type === 'half_time';
                                                
                                                if (isNodeHalfTime) {
                                                    return (
                                                        <span className="text-[10px] font-black text-primary flex items-center gap-1">
                                                            HT
                                                        </span>
                                                    );
                                                }

                                                if (dbMatch.timer_status === 'playing') {
                                                    const markers = matchEvents.filter(e => e.event_type === 'kick_off' || e.event_type === 'match_resumed');
                                                    const latestMarker = markers.length > 0
                                                        ? [...markers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                                                        : null;
                                                        
                                                    if (latestMarker) {
                                                        const markerTimestamp = (latestMarker.extra_info as Record<string, unknown> | undefined)?.start_timestamp as number || new Date(latestMarker.created_at).getTime();
                                                        const diffSeconds = Math.max(0, Math.floor((Date.now() - markerTimestamp) / 1000));
                                                        liveSeconds = elapsed + diffSeconds;
                                                    }
                                                }
                                                
                                                const mins = Math.floor(liveSeconds / 60);
                                                const secs = liveSeconds % 60;
                                                const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                                
                                                return (
                                                    <span className="text-[10px] font-black text-primary flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse"></span>
                                                        {formattedTime}
                                                    </span>
                                                );
                                            })() : (matchDate || matchTime) ? (
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {matchDate && <span>{matchDate}</span>}
                                                    {matchDate && matchTime && <span className="mx-1">| </span>}
                                                    {matchTime && <span>{matchTime}</span>}
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
 
                                    {/* Handles for Slot A */}
                                    {!isGroupConnected && (
                                        <Handle
                                            type="target"
                                            position={Position.Left}
                                            id={`slot-a-${index}`}
                                            className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-2 transition-all z-50"
                                            style={{ top: matches.length > 1 ? "45%" : "25%", left: "-1px" }}
                                        />
                                    )}
 
                                    {/* Handles for Slot B */}
                                    {!isGroupConnected && (
                                        <Handle
                                            type="target"
                                            position={Position.Left}
                                            id={`slot-b-${index}`}
                                            className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-2 transition-all z-50"
                                            style={{ top: matches.length > 1 ? "85%" : "75%", left: "-1px" }}
                                        />
                                    )}
 
                                    {/* Source Handle (Winner) */}
                                    {!isGroupConnected && (
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id={`winner-${index}`}
                                            className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-2 transition-all z-50"
                                            style={{ top: matches.length > 1 ? "45%" : "35%", right: "-1px" }}
                                        />
                                    )}

                                    {/* Source Handle (Loser) */}
                                    {!isGroupConnected && (
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id={`loser-${index}`}
                                            className="!w-2 !h-2 !bg-card !border !border-border !rounded-full hover:!bg-node-2 transition-all z-50"
                                            style={{ top: matches.length > 1 ? "75%" : "65%", right: "-1px" }}
                                        />
                                    )}

                                    <div>
                                        {(() => {
                                            const vballEvents = dbMatch ? dbEvents.filter(e => e.match_id === dbMatch.id && ['point', 'ace', 'spike', 'block'].includes(e.event_type)) : [];
                                            const setPointsMap = new Map<number, { home: number; away: number }>();
                                            if (vballEvents.length > 0) {
                                                vballEvents.forEach(e => {
                                                    const setNum = (e.extra_info as { set?: number } | null)?.set || 1;
                                                    const current = setPointsMap.get(setNum) || { home: 0, away: 0 };
                                                    const isHome = dbMatch?.home_team_id ? e.team_id === dbMatch.home_team_id : (e.extra_info as { team_side?: string } | null)?.team_side === 'home';
                                                    if (isHome) current.home += 1;
                                                    else current.away += 1;
                                                    setPointsMap.set(setNum, current);
                                                });
                                            }

                                            const allSetNumbers = Array.from(setPointsMap.keys()).sort((a, b) => a - b);
                                            const maxLoggedSet = allSetNumbers.length > 0 ? Math.max(...allSetNumbers) : 1;

                                            let derivedHomeSets = 0;
                                            let derivedAwaySets = 0;

                                            for (let s = 1; s <= maxLoggedSet; s++) {
                                                const pts = setPointsMap.get(s) || { home: 0, away: 0 };
                                                const targetPts = (s === 3 || s === 5) ? 15 : 25;
                                                const isFinishedScore = (pts.home >= targetPts || pts.away >= targetPts) && Math.abs(pts.home - pts.away) >= 2;
                                                const isPastSet = s < maxLoggedSet;
                                                if (isPastSet || isFinishedScore) {
                                                    if (pts.home > pts.away) derivedHomeSets += 1;
                                                    else if (pts.away > pts.home) derivedAwaySets += 1;
                                                }
                                            }
                                            const currentSetNumber = vballEvents.length > 0 ? (derivedHomeSets + derivedAwaySets + 1) : 1;
                                            const isEnded = dbMatch?.status === 'finished' || dbMatch?.status === 'canceled';

                                            const latestSetPts = setPointsMap.get(maxLoggedSet) || { home: 0, away: 0 };
                                            const currentSetPts = setPointsMap.get(currentSetNumber) || (isEnded ? latestSetPts : { home: 0, away: 0 });

                                            const getScoreValue = (score: unknown) => (typeof score === 'object' && score !== null && 'total' in score ? (score as Record<string, unknown>).total : score);

                                            const homeSetsWon = vballEvents.length > 0
                                                ? derivedHomeSets
                                                : (dbMatch?.home_score !== null && dbMatch?.home_score !== undefined ? Number(getScoreValue(dbMatch.home_score)) || 0 : 0);

                                            const awaySetsWon = vballEvents.length > 0
                                                ? derivedAwaySets
                                                : (dbMatch?.away_score !== null && dbMatch?.away_score !== undefined ? Number(getScoreValue(dbMatch.away_score)) || 0 : 0);

                                            const isHomeWinner = isEnded && (
                                                dbMatch?.winner_id
                                                    ? dbMatch.winner_id === dbMatch?.home_team_id
                                                    : (homeSetsWon > awaySetsWon || (homeSetsWon === awaySetsWon && (currentSetPts.home > currentSetPts.away || Number(dbMatch?.home_score ?? 0) > Number(dbMatch?.away_score ?? 0))))
                                            );
                                            const isAwayWinner = isEnded && (
                                                dbMatch?.winner_id
                                                    ? dbMatch.winner_id === dbMatch?.away_team_id
                                                    : (awaySetsWon > homeSetsWon || (homeSetsWon === awaySetsWon && (currentSetPts.away > currentSetPts.home || Number(dbMatch?.away_score ?? 0) > Number(dbMatch?.home_score ?? 0))))
                                            );
                                            const isHomeLoser = isEnded && !isHomeWinner && (isAwayWinner || (dbMatch?.winner_id ? dbMatch.winner_id === dbMatch?.away_team_id : true));
                                            const isAwayLoser = isEnded && !isAwayWinner && (isHomeWinner || (dbMatch?.winner_id ? dbMatch.winner_id === dbMatch?.home_team_id : true));

                                            return (
                                                <>
                                                    <SlotRow
                                                        label={liveTeamA || match.placeholderA}
                                                        isResolved={!!liveTeamA}
                                                        score={sport === 'volleyball' ? homeSetsWon : dbMatch?.home_score}
                                                        setPoints={currentSetPts.home}
                                                        isWinner={isHomeWinner}
                                                        isLoser={isHomeLoser}
                                                        status={dbMatch?.status}
                                                        position="top"
                                                        sport={sport}
                                                        onDropTeam={(teamName) => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderA: teamName };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                        onClear={() => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderA: "TBD" };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                    />
                                                    <SlotRow
                                                        label={liveTeamB || match.placeholderB}
                                                        isResolved={!!liveTeamB}
                                                        score={sport === 'volleyball' ? awaySetsWon : dbMatch?.away_score}
                                                        setPoints={currentSetPts.away}
                                                        isWinner={isAwayWinner}
                                                        isLoser={isAwayLoser}
                                                        status={dbMatch?.status}
                                                        position="bottom"
                                                        sport={sport}
                                                        onDropTeam={(teamName) => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderB: teamName };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                        onClear={() => {
                                                            const nextMatches = [...matches];
                                                            nextMatches[index] = { ...nextMatches[index], placeholderB: "TBD" };
                                                            updateNodeData(id, { matches: nextMatches });
                                                        }}
                                                    />
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

function SlotRow({
    label,
    score,
    setPoints,
    isWinner,
    isLoser,
    status,
    isResolved: _isResolved,
    position,
    sport = 'football',
    onDropTeam,
}: {
    label: string;
    score?: unknown;
    setPoints?: number;
    isWinner?: boolean;
    isLoser?: boolean;
    status?: string;
    isResolved?: boolean;
    position: "top" | "bottom";
    sport?: string;
    onDropTeam?: (teamName: string) => void;
    onClear?: () => void;
}) {
    const teams = useBracketStore((s) => s.teams);
    const team = teams.find(
        (t) => t.name.trim().toLowerCase() === label.trim().toLowerCase()
    );

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const hasScore = score !== undefined && score !== null && status !== 'scheduled';
    const displayScore = hasScore
        ? (typeof score === 'object' && score !== null && 'total' in score
            ? String((score as Record<string, unknown>).total)
            : String(score))
        : "";

    return (
        <div 
            className={cn(
                "flex items-center gap-2 p-2 transition-all hover:bg-node-2/5 group/slot cursor-default",
                isLoser && "text-muted-foreground/50 opacity-60"
            )}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
                e.preventDefault();
                const teamName = e.dataTransfer.getData("application/reactflow-team");
                if (teamName && onDropTeam) {
                    onDropTeam(teamName);
                }
            }}
        >
            <div className={cn(
                "w-6 h-6 border rounded-full flex items-center justify-center bg-muted/50 group-hover/slot:border-node-2/50 group-hover/slot:bg-node-2/10 transition-colors overflow-hidden shrink-0",
                isLoser && "opacity-50"
            )}>
                {team?.logo_url ? (
                    <Image
                                src={team.logo_url}
                                alt={label}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                            />
                ) : (
                    <span className="text-[9px] font-black text-muted-foreground group-hover/slot:text-node-2">
                        {team ? getInitials(team.name) : (position === "top" ? "H" : "A")}
                    </span>
                )}
            </div>
            <span className={cn(
                "text-[10px] font-bold tracking-tight truncate flex-1 transition-all",
                label === "TBD" ? "text-muted-foreground" : "",
                isWinner && "text-foreground font-black",
                isLoser && "text-muted-foreground/50"
            )}>
                {label}
            </span>
            {hasScore && (
                <div className={cn(
                    "flex items-center gap-1.5 font-black text-xs transition-colors shrink-0",
                    isWinner && "text-foreground font-black",
                    isLoser && "text-muted-foreground/50"
                )}>
                    {sport === 'volleyball' ? (
                        <>
                            <span className={cn(
                                (status === 'finished' || status === 'canceled')
                                    ? "w-6 h-6 flex items-center justify-center font-black text-xs"
                                    : "text-[10px] font-extrabold tracking-tight"
                            )}>
                                {displayScore}
                            </span>
                            {status !== 'finished' && status !== 'canceled' && (
                                <span className="text-xs font-black text-center">
                                    {setPoints !== undefined ? setPoints : 0}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="w-6 h-6 flex items-center justify-center font-black text-xs">{displayScore}</span>
                    )}
                </div>
            )}
        </div>
    );
}
