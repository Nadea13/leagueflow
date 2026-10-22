"use client";

import { memo } from "react";
import Image from "next/image";
import { Handle, Position, NodeProps, Node, useUpdateNodeInternals } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { MatchNodeData, useBracketStore } from "@/lib/stores/bracket-store";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Match, TournamentTeam } from "@/types";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";
import { ApiClient } from "@/lib/api-client";

type MatchNodeType = Node<MatchNodeData, "matchNode">;
type MatchItem = NonNullable<MatchNodeData['matches']>[number];

const LIVE_STATUSES = new Set(['live', 'warmup', 'first_half', 'half_time', 'second_half', 'extra_time', 'penalties', 'in_progress']);
const ENDED_STATUSES = new Set(['finished', 'completed', 'canceled', 'cancelled']);

export const isMatchLive = (status?: string | null) => !!status && LIVE_STATUSES.has(status);
export const isMatchEnded = (status?: string | null) => !!status && ENDED_STATUSES.has(status);

export const MatchNode = memo(function MatchNode({
    id,
    data,
    selected,
}: NodeProps<MatchNodeType>) {
    const updateNodeInternals = useUpdateNodeInternals();
    const updateNodeData = useBracketStore((s) => s.updateNodeData);
    const edges = useBracketStore((s) => s.edges);
    const nodes = useBracketStore((s) => s.nodes);
    const storeTeams = useBracketStore((s) => s.teams);
    const storeSport = useBracketStore((s) => s.sport);
    const storeMatches = useBracketStore((s) => s.matches);
    const setStoreMatches = useBracketStore((s) => s.setMatches);
    const activeCategoryId = useBracketStore((s) => s.activeCategoryId);
    const params = useParams();
    const locale = useLocale();
    const tournamentId = params.id as string;

    const handleAddMatch = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextMatches = [...(Array.isArray(data.matches) ? data.matches : [])];
        nextMatches.push({
            id: `m-${Date.now()}-${nextMatches.length + 1}`,
            placeholderA: "TBD",
            placeholderB: "TBD",
        });
        updateNodeData(id, { matches: nextMatches });
    };

    const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
    const matches = useMemo(() => Array.isArray(data.matches) ? data.matches : [], [data.matches]);

    const sport = useMemo(() => {
        const s = storeSport || (data as { sport?: string })?.sport || 'football';
        return String(s).toLowerCase();
    }, [storeSport, data]);

    // Local ticker to update the live timer every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTimestamp(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fallback match fetching if store doesn't have matches yet
    useEffect(() => {
        let isMounted = true;
        async function fetchInitialMatches() {
            if (storeMatches.length > 0 || !tournamentId) return;
            try {
                const targetCatId = activeCategoryId || undefined;
                const endpoint = targetCatId 
                    ? `/tournaments/${tournamentId}/categories/${targetCatId}/matches`
                    : `/tournaments/${tournamentId}/matches`;
                const data = await ApiClient.fetch<Match[]>(endpoint);
                if (isMounted && data && data.length > 0) {
                    setStoreMatches(data);
                }
            } catch {
                // non-blocking
            }
        }
        fetchInitialMatches();
        return () => {
            isMounted = false;
        };
    }, [tournamentId, activeCategoryId, storeMatches.length, setStoreMatches]);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, matches, storeMatches, updateNodeInternals]);

    const findDbMatch = (item: MatchItem | undefined, index: number): Match | undefined => {
        if (!item) return undefined;
        return storeMatches.find(m => 
            (item.dbId && m.id === item.dbId) || 
            (item.matchId && m.id === item.matchId) ||
            (m.node_id === id && ((m.idx_match ?? m.match_index) === (index + 1))) ||
            (item.placeholderA && item.placeholderB && (
                (m.placeholder_a === item.placeholderA && m.placeholder_b === item.placeholderB) ||
                (m.ph_home === item.placeholderA && m.ph_away === item.placeholderB)
            ))
        );
    };

    const renderMatchStatus = (m: MatchItem | undefined, dbM: Match | undefined) => {
        if (!m) return null;
        const matchDate = dbM?.match_date || m.match_date;
        const matchTime = dbM?.match_time || m.match_time;

        const isLive = isMatchLive(dbM?.status);
        const isEnded = isMatchEnded(dbM?.status);

        if (isLive) {
            if (sport === 'volleyball') {
                const homeSets = typeof dbM?.home_score === 'number' ? dbM.home_score : 0;
                const awaySets = typeof dbM?.away_score === 'number' ? dbM.away_score : 0;
                const currentSetNum = (homeSets + awaySets) + 1;
                return (
                    <span className="text-[10px] font-black text-primary flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse"></span>
                        SET {currentSetNum}
                    </span>
                );
            }

            if (dbM?.status === 'half_time') {
                return (
                    <span className="text-[10px] font-black text-amber-500 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        HT
                    </span>
                );
            }

            const elapsed = dbM?.elapsed_seconds ?? dbM?.elapsed_before_pause ?? (typeof dbM?.minute === 'number' ? dbM.minute * 60 : 0);
            let liveSeconds = elapsed;

            if (dbM?.timer_status === 'playing' && dbM?.updated_at) {
                const updatedTime = new Date(dbM.updated_at).getTime();
                if (!isNaN(updatedTime) && currentTimestamp > updatedTime) {
                    liveSeconds += Math.floor((currentTimestamp - updatedTime) / 1000);
                }
            }

            const mins = Math.floor(liveSeconds / 60);
            const secs = liveSeconds % 60;
            const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            return (
                <span className="text-[10px] font-black text-primary flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse"></span>
                    {formattedTime}
                </span>
            );
        }

        if (isEnded) {
            const isCanceled = dbM?.status === 'canceled' || dbM?.status === 'cancelled';
            return (
                <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded border uppercase",
                    isCanceled ? "text-destructive bg-destructive/10 border-destructive/20" : "text-muted-foreground bg-muted/50 border-border"
                )}>
                    {isCanceled ? 'Canceled' : 'FT'}
                </span>
            );
        }

        if (matchDate || matchTime) {
            return (
                <span className="text-[10px] font-semibold text-muted-foreground">
                    {matchDate && <span>{matchDate}</span>}
                    {matchDate && matchTime && <span className="mx-1">|</span>}
                    {matchTime && <span>{matchTime}</span>}
                </span>
            );
        }

        return null;
    };

    const singleMatch = matches[0];
    const singleDbMatch = findDbMatch(singleMatch, 0);
    const _hasLiveMatch = matches.some((item, i) => isMatchLive(findDbMatch(item, i)?.status));

    return (
        <div
            className={cn(
                "relative w-[320px] border bg-card text-card-foreground transition-all cursor-pointer rounded-sm shadow-md",
                selected
                    ? "border-node-2"
                    : "border-node-2/50 hover:border-node-2"
            )}
        >
            {/* Top Target Handle for Group Connection */}
            <Handle
                type="target"
                position={Position.Top}
                id="group-in"
                className="!w-2 !h-2 !bg-card !border !border-node-2/50 !rounded-full hover:!bg-node-2 transition-all z-50"
                style={{ top: "-1px" }}
            />

            {/* ── Header ── */}
            <div className="flex items-center justify-between p-2 border-b border-node-2/50 gap-2">
                <div className="flex items-center gap-2 truncate min-w-0">
                    <div className="w-6 h-6 bg-node-2/10 rounded flex items-center justify-center shrink-0">
                        <span className="text-node-2 text-xs font-bold">VS</span>
                    </div>
                    <span className="text-xs font-black tracking-wide text-node-2 shrink-0">
                        {matches.length > 1 ? "Round" : "Match"}
                    </span>
                    <span className="text-xs font-black tracking-wide truncate">
                        {data.label}
                    </span>
                </div>

                {/* Right side of Header: Date & Time or Live Status for single match */}
                {matches.length === 1 && (
                    <div className="flex items-center shrink-0 ml-auto">
                        {renderMatchStatus(singleMatch, singleDbMatch)}
                    </div>
                )}
            </div>

            {/* ── Match List ── */}
            <div className="flex flex-col divide-y divide-border">
                {matches.length === 0 ? (
                    <div className="p-4 text-center flex flex-col items-center gap-2">
                        <p className="text-[10px] text-center text-muted-foreground">
                            {locale === "th" ? "ยังไม่มีแมตช์ในโหนดนี้" : "No matches in this round"}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] gap-1 px-2 border-node-2/40 text-node-2 hover:bg-node-2/10"
                            onClick={handleAddMatch}
                        >
                            <Plus className="h-4 w-4" />
                            {locale === "th" ? "เพิ่มแมตช์" : "Add Match"}
                        </Button>
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
                            const dbMatch = findDbMatch(match, index);

                            // Resolve live teams from edges or database assignments
                            const getResolvedTeam = (slot: 'a' | 'b') => {
                                // 1. If we have a database match with a team ID assigned, use it
                                if (dbMatch) {
                                    const teamId = slot === 'a' ? dbMatch.home_team_id : dbMatch.away_team_id;
                                    if (teamId) {
                                        const team = storeTeams.find(t => String(t.team_id || t.id) === String(teamId));
                                        if (team?.name) return team.name;
                                    }
                                    if (slot === 'a' && dbMatch.home_team?.name) return dbMatch.home_team.name;
                                    if (slot === 'b' && dbMatch.away_team?.name) return dbMatch.away_team.name;
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
                                    const loserMatch = edge.sourceHandle?.match(/loser-(\d+)/);
                                    const isWinnerHandle = !!winnerMatch;
                                    const matchIdx = winnerMatch ? parseInt(winnerMatch[1], 10) : loserMatch ? parseInt(loserMatch[1], 10) : -1;

                                    if (matchIdx !== -1) {
                                        const sourceMatches = Array.isArray(sourceNode.data.matches) ? (sourceNode.data.matches as any[]) : [];
                                        const sourceMatchItem = sourceMatches[matchIdx];

                                        const sourceDbMatch = storeMatches.find(m =>
                                            (sourceMatchItem?.dbId && m.id === sourceMatchItem.dbId) ||
                                            (sourceMatchItem?.matchId && m.id === sourceMatchItem.matchId) ||
                                            (m.node_id === sourceNode.id && ((m.idx_match ?? m.match_index) === (matchIdx + 1))) ||
                                            (sourceMatchItem && m.placeholder_a === sourceMatchItem.placeholderA && m.placeholder_b === sourceMatchItem.placeholderB) ||
                                            (sourceMatchItem && m.ph_home === sourceMatchItem.placeholderA && m.ph_away === sourceMatchItem.placeholderB)
                                        );

                                        const isSourceEnded = isMatchEnded(sourceDbMatch?.status);

                                        if (isSourceEnded && sourceDbMatch) {
                                            let winnerTeamId: string | null = sourceDbMatch.winner_id || null;
                                            let loserTeamId: string | null = null;

                                            const getScoreNum = (score: unknown) => {
                                                if (typeof score === 'object' && score !== null && 'total' in score) {
                                                    return Number((score as { total?: number }).total) || 0;
                                                }
                                                return Number(score ?? 0);
                                            };
                                            const homeScore = getScoreNum(sourceDbMatch.home_score);
                                            const awayScore = getScoreNum(sourceDbMatch.away_score);

                                            if (!winnerTeamId) {
                                                if (homeScore > awayScore) {
                                                    winnerTeamId = sourceDbMatch.home_team_id;
                                                    loserTeamId = sourceDbMatch.away_team_id;
                                                } else if (awayScore > homeScore) {
                                                    winnerTeamId = sourceDbMatch.away_team_id;
                                                    loserTeamId = sourceDbMatch.home_team_id;
                                                }
                                            } else {
                                                loserTeamId = winnerTeamId === sourceDbMatch.home_team_id
                                                    ? sourceDbMatch.away_team_id
                                                    : sourceDbMatch.home_team_id;
                                            }

                                            const targetTeamId = isWinnerHandle ? winnerTeamId : loserTeamId;

                                            if (targetTeamId) {
                                                const team = storeTeams.find(t => String(t.team_id || t.id) === String(targetTeamId));
                                                if (team?.name) return team.name;

                                                if (String(sourceDbMatch.home_team_id) === String(targetTeamId) && sourceDbMatch.home_team?.name) {
                                                    return sourceDbMatch.home_team.name;
                                                }
                                                if (String(sourceDbMatch.away_team_id) === String(targetTeamId) && sourceDbMatch.away_team?.name) {
                                                    return sourceDbMatch.away_team.name;
                                                }
                                            }

                                            if (!targetTeamId && homeScore !== awayScore) {
                                                const isHomeWinner = homeScore > awayScore;
                                                const wantHome = isWinnerHandle ? isHomeWinner : !isHomeWinner;
                                                const chosen = wantHome ? sourceMatchItem?.placeholderA : sourceMatchItem?.placeholderB;
                                                if (chosen && chosen !== 'TBD') return chosen;
                                            }
                                        }

                                        const labelBase = sourceNode.data.label ? `${sourceNode.data.label}` : `Match ${matchIdx + 1}`;
                                        if (isWinnerHandle) {
                                            return `Winner (${labelBase})`;
                                        } else {
                                            return `Loser (${labelBase})`;
                                        }
                                    }
                                }

                                return null;
                            };

                            const liveTeamA = getResolvedTeam('a');
                            const liveTeamB = getResolvedTeam('b');

                            const isGroupConnected = edges.some(e => e.target === id && e.targetHandle === 'group-in');

                            return (
                                <div key={match.id || index} className="relative">
                                    {/* Sub-header for multi-match round nodes */}
                                    {matches.length > 1 && (
                                        <div className="px-2 py-1 flex items-center justify-between gap-2 border-b bg-muted/20">
                                            <span className="text-[10px] font-black text-node-2 tracking-tighter">
                                                Match #{index + 1}
                                            </span>
                                            <div className="flex items-center shrink-0">
                                                {renderMatchStatus(match, dbMatch)}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        {(() => {
                                            const isEnded = isMatchEnded(dbMatch?.status);

                                            const getScoreValue = (score: unknown) => (typeof score === 'object' && score !== null && 'total' in score ? (score as Record<string, unknown>).total : score);

                                            const homeScoreVal = dbMatch?.home_score !== null && dbMatch?.home_score !== undefined ? Number(getScoreValue(dbMatch.home_score)) || 0 : 0;
                                            const awayScoreVal = dbMatch?.away_score !== null && dbMatch?.away_score !== undefined ? Number(getScoreValue(dbMatch.away_score)) || 0 : 0;

                                            const isHomeWinner = isEnded && (
                                                dbMatch?.winner_id
                                                    ? dbMatch.winner_id === dbMatch?.home_team_id
                                                    : homeScoreVal > awayScoreVal
                                            );
                                            const isAwayWinner = isEnded && (
                                                dbMatch?.winner_id
                                                    ? dbMatch.winner_id === dbMatch?.away_team_id
                                                    : awayScoreVal > homeScoreVal
                                            );
                                            const isHomeLoser = isEnded && !isHomeWinner && (isAwayWinner || (dbMatch?.winner_id ? dbMatch.winner_id === dbMatch?.away_team_id : homeScoreVal < awayScoreVal));
                                            const isAwayLoser = isEnded && !isAwayWinner && (isHomeWinner || (dbMatch?.winner_id ? dbMatch.winner_id === dbMatch?.home_team_id : awayScoreVal < homeScoreVal));

                                            return (
                                                <div className="flex flex-col divide-y divide-border">
                                                    {/* Slot A Row with Handles */}
                                                    <div className="relative">
                                                        {!isGroupConnected && (
                                                            <Handle
                                                                type="target"
                                                                position={Position.Left}
                                                                id={`slot-a-${index}`}
                                                                className="!w-2 !h-2 !bg-card !border !border-node-2/50 !rounded-full hover:!bg-node-2 transition-all z-50"
                                                                style={{ left: "-1px" }}
                                                            />
                                                        )}
                                                        {!isGroupConnected && (
                                                            <Handle
                                                                type="source"
                                                                position={Position.Right}
                                                                id={`winner-${index}`}
                                                                className="!w-2 !h-2 !bg-card !border !border-node-2/50 !rounded-full hover:!bg-node-2 transition-all z-50"
                                                                style={{ right: "-1px" }}
                                                            />
                                                        )}
                                                        <SlotRow
                                                            label={liveTeamA || match.placeholderA}
                                                            logoUrl={dbMatch?.home_team?.logo_url}
                                                            isResolved={!!liveTeamA}
                                                            score={dbMatch?.home_score}
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
                                                    </div>

                                                    {/* Slot B Row with Handles */}
                                                    <div className="relative">
                                                        {!isGroupConnected && (
                                                            <Handle
                                                                type="target"
                                                                position={Position.Left}
                                                                id={`slot-b-${index}`}
                                                                className="!w-2 !h-2 !bg-card !border !border-node-2/50 !rounded-full hover:!bg-node-2 transition-all z-50"
                                                                style={{ left: "-1px" }}
                                                            />
                                                        )}
                                                        {!isGroupConnected && (
                                                            <Handle
                                                                type="source"
                                                                position={Position.Right}
                                                                id={`loser-${index}`}
                                                                className="!w-2 !h-2 !bg-card !border !border-node-2/50 !rounded-full hover:!bg-node-2 transition-all z-50"
                                                                style={{ right: "-1px" }}
                                                            />
                                                        )}
                                                        <SlotRow
                                                            label={liveTeamB || match.placeholderB}
                                                            logoUrl={dbMatch?.away_team?.logo_url}
                                                            isResolved={!!liveTeamB}
                                                            score={dbMatch?.away_score}
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
                                                    </div>
                                                </div>
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
    logoUrl,
    score,
    setPoints,
    isWinner,
    isLoser,
    status,
    isResolved: _isResolved,
    position,
    sport = 'football',
    onDropTeam,
    onClear: _onClear,
}: {
    label: string;
    logoUrl?: string | null;
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

    const isEnded = isMatchEnded(status);
    const hasScore = score !== undefined && score !== null && status !== 'scheduled';
    const displayScore = hasScore
        ? (typeof score === 'object' && score !== null && 'total' in score
            ? String((score as Record<string, unknown>).total)
            : String(score))
        : "";

    const displayLogo = logoUrl || team?.logo_url;

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
                {displayLogo ? (
                    <Image
                        src={displayLogo}
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
                                isEnded
                                    ? "w-6 h-6 flex items-center justify-center font-black text-xs"
                                    : "text-[10px] font-extrabold tracking-tight"
                            )}>
                                {displayScore}
                            </span>
                            {!isEnded && (
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
