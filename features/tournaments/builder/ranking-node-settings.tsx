"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import {
    Trophy,
    Flame,
    Search,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { ApiClient } from "@/lib/api-client";
import { Match, TournamentTeam, TournamentStatus } from "@/types";
import { isMatchEnded } from "./match-node";
import { updateTournamentStatus } from "@/actions/tournaments/general";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/ui/header";
import { cn } from "@/lib/utils";

export interface ResolvedTeam {
    id: string;
    name: string;
    logo_url?: string | null;
}

export interface UnifiedRankingItem {
    id: string;
    team: ResolvedTeam;
    type: 'champion' | 'runner_up' | 'third' | 'fourth' | 'knockout' | 'group' | 'active' | 'unranked';
    rank?: number;
    isTie?: boolean;
    stageLabel: string;
    nextOpponent?: string;
    isActive?: boolean;
}

export function RankingNodeSettings({
    tournamentId,
    categoryId,
    currentTournamentStatus,
    onStatusChange,
}: {
    tournamentId: string;
    categoryId?: string;
    currentTournamentStatus?: string;
    onStatusChange?: (status: TournamentStatus) => void;
}) {
    const locale = useLocale();
    const { nodes, edges, teams: storeTeams, matches: storeMatches, setMatches: setStoreMatches, fetchTeams } = useBracketStore();
    const [localMatches, setLocalMatches] = React.useState<Match[]>([]);
    const [_isLoading, setIsLoading] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Use storeMatches from useBracketStore (canvas polls every 5s and syncs live scores in real-time)
    const matches = storeMatches && storeMatches.length > 0 ? storeMatches : localMatches;

    // 1. Fetch matches & teams for category via ApiClient
    const fetchCategoryMatches = React.useCallback(async () => {
        if (!tournamentId) return;
        setIsLoading(true);
        try {
            if (categoryId) {
                fetchTeams(categoryId);
            }
            const url = categoryId
                ? `/tournaments/${tournamentId}/categories/${categoryId}/matches`
                : `/tournaments/${tournamentId}/matches`;
            const data = await ApiClient.fetch<any[]>(url);
            if (data && Array.isArray(data)) {
                const mappedMatches = (data as Match[]).map(match => {
                    let match_date = match.match_date;
                    let match_time = match.match_time;
                    if (match.scheduled_at) {
                        const parts = match.scheduled_at.split('T');
                        match_date = parts[0];
                        match_time = parts[1]?.substring(0, 5) || null;
                    }

                    const home_team = match.home_team ? {
                        id: match.home_team.id || match.home_team_id || "",
                        name: match.home_team.name || "",
                        logo_url: (match.home_team as { logo_img?: string | null }).logo_img || match.home_team.logo_url || undefined
                    } : undefined;

                    const away_team = match.away_team ? {
                        id: match.away_team.id || match.away_team_id || "",
                        name: match.away_team.name || "",
                        logo_url: (match.away_team as { logo_img?: string | null }).logo_img || match.away_team.logo_url || undefined
                    } : undefined;

                    return {
                        ...match,
                        match_date,
                        match_time,
                        home_team,
                        away_team
                    };
                });
                setStoreMatches(mappedMatches);
                setLocalMatches(mappedMatches);
            }
        } catch (err) {
            console.error("Failed to fetch matches for rankings:", err);
        } finally {
            setIsLoading(false);
        }
    }, [tournamentId, categoryId, setStoreMatches, fetchTeams]);

    React.useEffect(() => {
        if (categoryId) {
            fetchTeams(categoryId);
        }
        fetchCategoryMatches();
    }, [categoryId, fetchCategoryMatches, fetchTeams]);

    // 2. Compute rankings from nodes, edges, matches, and teams
    const { items, activeCount } = React.useMemo(() => {
        const teamMap = new Map<string, ResolvedTeam>();
        const teamListNodes = nodes.filter(n => n.type === 'teamListNode');

        // Extract verified teams that belong to teamListNode
        const getTeamListNodeTeams = (): TournamentTeam[] => {
            const listTeams: TournamentTeam[] = [];
            const seenIds = new Set<string>();

            teamListNodes.forEach(tNode => {
                const explicitTeams = (tNode.data as { teams?: TournamentTeam[] })?.teams;
                if (Array.isArray(explicitTeams) && explicitTeams.length > 0) {
                    explicitTeams.forEach(t => {
                        const id = String(t.team_id || t.id);
                        if (!seenIds.has(id)) {
                            seenIds.add(id);
                            listTeams.push(t);
                        }
                    });
                }
            });

            if (listTeams.length > 0) return listTeams;

            // Follow the exact same filter as TeamListNode component on canvas
            return storeTeams.filter((team: TournamentTeam & { tournament_category_id?: string | null }) => {
                if (categoryId && team.tournament_category_id && String(team.tournament_category_id) !== String(categoryId)) {
                    return false;
                }
                if ((team as any).deleted_at) {
                    return false;
                }
                const rs = String(team.registration_status || '').toLowerCase();
                const ps = String(team.payment_status || '').toLowerCase();
                if (rs === 'rejected' || ps === 'rejected' || rs === 'pending') {
                    return false;
                }
                return rs === 'approved' || rs === 'confirmed' || ps === 'paid';
            });
        };

        const teamListNodeTeams = getTeamListNodeTeams();

        // Register all store teams
        storeTeams.forEach(t => {
            const canonicalId = String(t.team_id || t.id);
            const resolved: ResolvedTeam = {
                id: canonicalId,
                name: t.name,
                logo_url: t.logo_url,
            };
            if (t.id) teamMap.set(String(t.id), resolved);
            if (t.team_id) teamMap.set(String(t.team_id), resolved);
            if (t.name) {
                teamMap.set(t.name.trim(), resolved);
                teamMap.set(t.name.trim().toLowerCase(), resolved);
            }
        });

        // Also register verified teams from teamListNode
        teamListNodeTeams.forEach(t => {
            const canonicalId = String(t.team_id || t.id);
            const resolved: ResolvedTeam = {
                id: canonicalId,
                name: t.name,
                logo_url: t.logo_url,
            };
            if (t.id) teamMap.set(String(t.id), resolved);
            if (t.team_id) teamMap.set(String(t.team_id), resolved);
            if (t.name) {
                teamMap.set(t.name.trim(), resolved);
                teamMap.set(t.name.trim().toLowerCase(), resolved);
            }
        });

        // Helper to resolve a team by ID or name
        const resolveTeam = (idOrName?: string | null): ResolvedTeam | undefined => {
            if (!idOrName) return undefined;
            const trimmed = String(idOrName).trim();
            if (!trimmed) return undefined;
            const lower = trimmed.toLowerCase();
            if (teamMap.has(trimmed)) return teamMap.get(trimmed);
            if (teamMap.has(lower)) return teamMap.get(lower);
            if (
                trimmed === "TBD" ||
                trimmed === "Bye" ||
                trimmed.startsWith("Winner of") ||
                trimmed.startsWith("Winner (") ||
                trimmed.startsWith("Loser of") ||
                trimmed.startsWith("Loser (") ||
                trimmed.includes("Place (")
            ) {
                return undefined;
            }

            const foundStore = storeTeams.find(
                st => st.name.trim().toLowerCase() === lower ||
                      String(st.id) === trimmed ||
                      String(st.team_id) === trimmed
            );
            if (foundStore) {
                const resolved: ResolvedTeam = {
                    id: String(foundStore.team_id || foundStore.id),
                    name: foundStore.name,
                    logo_url: foundStore.logo_url,
                };
                teamMap.set(trimmed, resolved);
                teamMap.set(lower, resolved);
                return resolved;
            }

            // Auto-create resolved team if not found
            const newTeam: ResolvedTeam = { id: trimmed, name: trimmed };
            teamMap.set(trimmed, newTeam);
            teamMap.set(lower, newTeam);
            return newTeam;
        };

        const matchNodes = nodes.filter(n => n.type === 'matchNode');
        const standingNodes = nodes.filter(n => n.type === 'standingNode');
        const groupNodes = nodes.filter(n => n.type === 'groupNode');

        // Resolve match results dynamically with upstream winner/loser DAG propagation
        interface MatchOutcome {
            nodeId: string;
            matchIndex: number;
            dbMatch?: Match;
            homeTeam?: ResolvedTeam;
            awayTeam?: ResolvedTeam;
            isFinished: boolean;
            winner?: ResolvedTeam;
            loser?: ResolvedTeam;
            label: string;
        }

        const outcomeCache = new Map<string, MatchOutcome>();

        const getMatchNodeTeam = (targetNodeId: string, matchIdx: number, slot: 'a' | 'b', visited = new Set<string>()): ResolvedTeam | undefined => {
            const cycleKey = `${targetNodeId}-${matchIdx}-${slot}`;
            if (visited.has(cycleKey)) return undefined;
            visited.add(cycleKey);

            const node = matchNodes.find(n => n.id === targetNodeId);
            if (!node) return undefined;

            const nodeMatches = (node.data as any)?.matches || [];
            const mItem = nodeMatches[matchIdx];
            const matchNumber = matchIdx + 1;

            // 1. Find dbMatch
            const dbMatch = matches.find(dbm =>
                (mItem?.dbId && dbm.id === mItem.dbId) ||
                (mItem?.matchId && dbm.id === mItem.matchId) ||
                (mItem?.id && dbm.id === mItem.id) ||
                (dbm.node_id === targetNodeId && ((dbm.idx_match ?? dbm.match_index ?? (dbm as any).match_number) === matchNumber)) ||
                (mItem?.placeholderA && mItem?.placeholderB && (
                    (dbm.placeholder_a === mItem.placeholderA && dbm.placeholder_b === mItem.placeholderB) ||
                    (dbm.ph_home === mItem.placeholderA && dbm.ph_away === mItem.placeholderB)
                ))
            );

            if (slot === 'a') {
                const teamFromDb = resolveTeam(dbMatch?.home_team_id) || resolveTeam((dbMatch?.home_team as any)?.id) || resolveTeam(dbMatch?.home_team?.name);
                if (teamFromDb) return teamFromDb;
            } else {
                const teamFromDb = resolveTeam(dbMatch?.away_team_id) || resolveTeam((dbMatch?.away_team as any)?.id) || resolveTeam(dbMatch?.away_team?.name);
                if (teamFromDb) return teamFromDb;
            }

            // 2. Check incoming edge
            const targetHandle = `slot-${slot}-${matchIdx}`;
            const edge = edges.find(e => e.target === targetNodeId && (e.targetHandle === targetHandle || e.targetHandle === `slot-${slot}`));
            if (edge) {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode?.type === 'teamListNode') {
                    const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
                    if (teamIdMatch) {
                        const team = resolveTeam(teamIdMatch[1]);
                        if (team) return team;
                    }
                } else if (sourceNode?.type === 'standingNode' || sourceNode?.type === 'groupNode') {
                    const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
                    if (rankMatch) {
                        const rankIndex = parseInt(rankMatch[1], 10);
                        const rankings = (sourceNode.data as { rankings?: string[] }).rankings || [];
                        if (rankings[rankIndex]) {
                            const team = resolveTeam(rankings[rankIndex]);
                            if (team) return team;
                        }
                    }
                } else if (sourceNode?.type === 'matchNode') {
                    const winnerMatch = edge.sourceHandle?.match(/winner-(\d+)/);
                    const loserMatch = edge.sourceHandle?.match(/loser-(\d+)/);
                    const isWinner = !!winnerMatch || (!edge.sourceHandle || edge.sourceHandle.startsWith('winner'));
                    const sMatchIdx = winnerMatch ? parseInt(winnerMatch[1], 10) : loserMatch ? parseInt(loserMatch[1], 10) : 0;

                    const sOutcome = getOutcome(sourceNode.id, sMatchIdx, visited);
                    if (sOutcome?.isFinished) {
                        const advancedTeam = isWinner ? sOutcome.winner : sOutcome.loser;
                        if (advancedTeam) return advancedTeam;
                    }
                }
            }

            // 3. Fallback to placeholder
            const placeholder = slot === 'a' ? mItem?.placeholderA : mItem?.placeholderB;
            return resolveTeam(placeholder);
        };

        const getOutcome = (nodeId: string, matchIdx: number, visited = new Set<string>()): MatchOutcome | undefined => {
            const key = `${nodeId}-${matchIdx}`;
            if (outcomeCache.has(key)) return outcomeCache.get(key);

            const node = matchNodes.find(n => n.id === nodeId);
            if (!node) return undefined;

            const nodeMatches = (node.data as any)?.matches || [];
            const mItem = nodeMatches[matchIdx] || { placeholderA: "TBD", placeholderB: "TBD" };
            const matchNumber = matchIdx + 1;
            const nodeLabel = (node.data as any)?.label || "Match";

            const dbMatch = matches.find(dbm =>
                (mItem?.dbId && dbm.id === mItem.dbId) ||
                (mItem?.matchId && dbm.id === mItem.matchId) ||
                (mItem?.id && dbm.id === mItem.id) ||
                (dbm.node_id === nodeId && ((dbm.idx_match ?? dbm.match_index ?? (dbm as any).match_number) === matchNumber)) ||
                (mItem?.placeholderA && mItem?.placeholderB && (
                    (dbm.placeholder_a === mItem.placeholderA && dbm.placeholder_b === mItem.placeholderB) ||
                    (dbm.ph_home === mItem.placeholderA && dbm.ph_away === mItem.placeholderB)
                ))
            );

            const homeTeam = getMatchNodeTeam(nodeId, matchIdx, 'a', new Set(visited));
            const awayTeam = getMatchNodeTeam(nodeId, matchIdx, 'b', new Set(visited));

            const status = dbMatch?.status;
            const isFinished = isMatchEnded(status) || status === 'finished' || status === 'completed' || status === 'canceled' || status === 'cancelled' || !!dbMatch?.winner_id;

            let winner: ResolvedTeam | undefined;
            let loser: ResolvedTeam | undefined;

            if (isFinished && homeTeam && awayTeam) {
                let isHomeWon = false;
                let isAwayWon = false;

                if (dbMatch?.winner_id) {
                    const wid = String(dbMatch.winner_id);
                    const resolvedWinner = resolveTeam(wid);
                    if (resolvedWinner) {
                        if (resolvedWinner.id === homeTeam.id || resolvedWinner.name.toLowerCase() === homeTeam.name.toLowerCase()) {
                            isHomeWon = true;
                        } else if (resolvedWinner.id === awayTeam.id || resolvedWinner.name.toLowerCase() === awayTeam.name.toLowerCase()) {
                            isAwayWon = true;
                        }
                    }
                    if (!isHomeWon && !isAwayWon) {
                        if (wid === String(dbMatch.home_team_id) || wid === String(homeTeam.id) || wid.toLowerCase() === homeTeam.name.toLowerCase()) {
                            isHomeWon = true;
                        } else if (wid === String(dbMatch.away_team_id) || wid === String(awayTeam.id) || wid.toLowerCase() === awayTeam.name.toLowerCase()) {
                            isAwayWon = true;
                        }
                    }
                }

                if (!isHomeWon && !isAwayWon) {
                    const getScoreVal = (s: unknown) => (typeof s === 'object' && s !== null && 'total' in s ? Number((s as any).total) || 0 : Number(s) || 0);
                    const hScore = getScoreVal(dbMatch?.home_score);
                    const aScore = getScoreVal(dbMatch?.away_score);

                    if (hScore > aScore) {
                        isHomeWon = true;
                    } else if (aScore > hScore) {
                        isAwayWon = true;
                    }
                }

                if (isHomeWon) {
                    winner = homeTeam;
                    loser = awayTeam;
                } else if (isAwayWon) {
                    winner = awayTeam;
                    loser = homeTeam;
                }
            }

            const outcome: MatchOutcome = {
                nodeId,
                matchIndex: matchNumber,
                dbMatch,
                homeTeam,
                awayTeam,
                isFinished,
                winner,
                loser,
                label: nodeLabel,
            };

            outcomeCache.set(key, outcome);
            return outcome;
        };

        const matchOutcomes: MatchOutcome[] = [];
        matchNodes.forEach(node => {
            const nodeMatches = (node.data as any)?.matches || [];
            nodeMatches.forEach((_: any, idx: number) => {
                const outcome = getOutcome(node.id, idx);
                if (outcome) matchOutcomes.push(outcome);
            });
        });

        // Identify Knockout DAG Structure
        const thirdPlaceNodeIds = new Set<string>();
        matchNodes.forEach(node => {
            const hasLoserInput = edges.some(e => e.target === node.id && e.sourceHandle?.startsWith('loser'));
            const labelLower = ((node.data as { label?: string })?.label || "").toLowerCase();
            if (hasLoserInput || labelLower.includes('3rd') || labelLower.includes('third') || labelLower.includes('อันดับ 3')) {
                thirdPlaceNodeIds.add(node.id);
            }
        });

        const grandFinalNodeIds = new Set<string>();
        matchNodes.forEach(node => {
            if (thirdPlaceNodeIds.has(node.id)) return;
            const hasOutgoingWinner = edges.some(e =>
                e.source === node.id &&
                (!e.sourceHandle || e.sourceHandle.startsWith('winner')) &&
                matchNodes.some(targetNode => targetNode.id === e.target)
            );
            if (!hasOutgoingWinner) {
                grandFinalNodeIds.add(node.id);
            }
        });

        const nodeDistanceMap = new Map<string, number>();

        grandFinalNodeIds.forEach(id => {
            nodeDistanceMap.set(id, 0);
        });

        let changed = true;
        let maxIter = 10;
        while (changed && maxIter > 0) {
            changed = false;
            maxIter--;
            edges.forEach(edge => {
                if (thirdPlaceNodeIds.has(edge.target)) return;
                if ((!edge.sourceHandle || edge.sourceHandle.startsWith('winner')) && nodeDistanceMap.has(edge.target)) {
                    const targetDist = nodeDistanceMap.get(edge.target)!;
                    const currentSourceDist = nodeDistanceMap.get(edge.source);
                    const newDist = targetDist + 1;
                    if (currentSourceDist === undefined || newDist > currentSourceDist) {
                        nodeDistanceMap.set(edge.source, newDist);
                        changed = true;
                    }
                }
            });
        }

        const eliminatedTiers: Array<{
            tierName: 'champion' | 'runner_up' | 'third' | 'fourth' | 'knockout' | 'group';
            stageLabel: string;
            teams: ResolvedTeam[];
        }> = [];

        const assignedTeamIds = new Set<string>();
        const markAssigned = (team: ResolvedTeam) => {
            assignedTeamIds.add(team.id);
            assignedTeamIds.add(team.name.toLowerCase());
        };
        const isTeamAssigned = (team: ResolvedTeam) => {
            return assignedTeamIds.has(team.id) || assignedTeamIds.has(team.name.toLowerCase());
        };

        // 1. Grand Final Winner & Loser
        const champions: ResolvedTeam[] = [];
        const runnerUps: ResolvedTeam[] = [];

        grandFinalNodeIds.forEach(finalId => {
            const finalOutcomes = matchOutcomes.filter(mo => mo.nodeId === finalId);
            finalOutcomes.forEach(fo => {
                if (fo.winner) {
                    champions.push(fo.winner);
                    markAssigned(fo.winner);
                }
                if (fo.loser) {
                    runnerUps.push(fo.loser);
                    markAssigned(fo.loser);
                }
            });
        });

        // 2. 3rd Place Match
        const thirdPlaceWinners: ResolvedTeam[] = [];
        const fourthPlaceLosers: ResolvedTeam[] = [];

        thirdPlaceNodeIds.forEach(tpId => {
            const tpOutcomes = matchOutcomes.filter(mo => mo.nodeId === tpId);
            tpOutcomes.forEach(tpo => {
                if (tpo.winner && !isTeamAssigned(tpo.winner)) {
                    thirdPlaceWinners.push(tpo.winner);
                    markAssigned(tpo.winner);
                }
                if (tpo.loser && !isTeamAssigned(tpo.loser)) {
                    fourthPlaceLosers.push(tpo.loser);
                    markAssigned(tpo.loser);
                }
            });
        });

        if (thirdPlaceWinners.length > 0) {
            eliminatedTiers.push({
                tierName: 'third',
                stageLabel: locale === 'th' ? "อันดับ 3 (3rd Place)" : "3rd Place",
                teams: thirdPlaceWinners,
            });
        }

        if (fourthPlaceLosers.length > 0) {
            eliminatedTiers.push({
                tierName: 'fourth',
                stageLabel: locale === 'th' ? "อันดับ 4 (4th Place)" : "4th Place",
                teams: fourthPlaceLosers,
            });
        }

        // 3. Knockout Losers by Round Distance
        const distanceToNodes = new Map<number, string[]>();
        nodeDistanceMap.forEach((dist, nId) => {
            if (dist === 0) return;
            const list = distanceToNodes.get(dist) || [];
            list.push(nId);
            distanceToNodes.set(dist, list);
        });

        const sortedDistances = Array.from(distanceToNodes.keys()).sort((a, b) => a - b);

        sortedDistances.forEach(dist => {
            const nodesInDist = distanceToNodes.get(dist) || [];
            const losersInRound: ResolvedTeam[] = [];

            nodesInDist.forEach(nId => {
                const hasNextLoserMatch = edges.some(e =>
                    e.source === nId &&
                    e.sourceHandle?.startsWith('loser') &&
                    matchNodes.some(tn => tn.id === e.target)
                );

                const outcomes = matchOutcomes.filter(mo => mo.nodeId === nId);
                outcomes.forEach(o => {
                    if (o.loser && !isTeamAssigned(o.loser)) {
                        if (!hasNextLoserMatch) {
                            losersInRound.push(o.loser);
                            markAssigned(o.loser);
                        }
                    }
                });
            });

            if (losersInRound.length > 0) {
                let stageName = "";
                if (dist === 1) {
                    stageName = locale === 'th' ? "ตกรอบรองชนะเลิศ (Semifinals)" : "Semifinalist";
                } else if (dist === 2) {
                    stageName = locale === 'th' ? "ตกรอบ 8 ทีมสุดท้าย (Quarterfinals)" : "Quarterfinalist";
                } else if (dist === 3) {
                    stageName = locale === 'th' ? "ตกรอบ 16 ทีมสุดท้าย (Round of 16)" : "Round of 16";
                } else {
                    stageName = locale === 'th' ? `ตกรอบน็อคเอาท์ (รอบที่ ${dist + 1})` : `Knockout Round ${dist + 1}`;
                }

                eliminatedTiers.push({
                    tierName: dist === 1 && thirdPlaceNodeIds.size === 0 ? 'third' : 'knockout',
                    stageLabel: stageName,
                    teams: losersInRound,
                });
            }
        });

        // 4. Standings / Group Stage Non-Advancing Teams
        interface GroupStandingsData {
            label: string;
            rankings: ResolvedTeam[];
            advancingCount: number;
        }

        const groupsData: GroupStandingsData[] = [];

        standingNodes.forEach(sNode => {
            const rawRankings = (sNode.data as { rankings?: string[] })?.rankings || [];
            const advCount = Number(sNode.data.advancingCount) || 2;
            const label = (sNode.data.label as string) || "Group";

            const resolvedRankings: ResolvedTeam[] = [];
            rawRankings.forEach(name => {
                const t = resolveTeam(name);
                if (t) resolvedRankings.push(t);
            });

            if (resolvedRankings.length > 0) {
                groupsData.push({
                    label,
                    rankings: resolvedRankings,
                    advancingCount: advCount,
                });
            }
        });

        if (groupsData.length === 0) {
            groupNodes.forEach(gNode => {
                const rawTeams = (gNode.data as { teams?: string[] })?.teams || [];
                const advCount = Number(gNode.data.advancingCount) || 2;
                const label = (gNode.data.label as string) || "Group";

                const resolvedTeams: ResolvedTeam[] = [];
                rawTeams.forEach(name => {
                    const t = resolveTeam(name);
                    if (t) resolvedTeams.push(t);
                });

                if (resolvedTeams.length > 0) {
                    groupsData.push({
                        label,
                        rankings: resolvedTeams,
                        advancingCount: advCount,
                    });
                }
            });
        }

        if (groupsData.length > 0) {
            const maxTeamsInGroup = Math.max(...groupsData.map(g => g.rankings.length));
            let maxAdv = Math.max(...groupsData.map(g => g.advancingCount));
            if (maxAdv >= maxTeamsInGroup) maxAdv = 0;

            for (let pos = maxAdv; pos < maxTeamsInGroup; pos++) {
                const teamsAtPos: ResolvedTeam[] = [];

                groupsData.forEach(g => {
                    const team = g.rankings[pos];
                    if (team && !isTeamAssigned(team)) {
                        teamsAtPos.push(team);
                        markAssigned(team);
                    }
                });

                if (teamsAtPos.length > 0) {
                    const posNum = pos + 1;
                    const suffix = locale === 'th' ? `อันดับ ${posNum} ของกลุ่ม` : `Group ${posNum}${posNum === 1 ? 'st' : posNum === 2 ? 'nd' : posNum === 3 ? 'rd' : 'th'} Place`;
                    eliminatedTiers.push({
                        tierName: 'group',
                        stageLabel: suffix,
                        teams: teamsAtPos,
                    });
                }
            }
        }

        // 5. Find Active Teams (ทีมที่ยังอยู่ในการแข่งขัน)
        const allTeamsMap = new Map<string, ResolvedTeam>();

        if (teamListNodes.length > 0) {
            // Priority: "ranking ให้แสดงทีมที่อยู่ใน teamlistnode"
            teamListNodeTeams.forEach(t => {
                const res = resolveTeam(String(t.team_id || t.id)) || resolveTeam(t.name);
                if (res) allTeamsMap.set(res.name.toLowerCase(), res);
            });
        } else {
            storeTeams.forEach(t => {
                const res = resolveTeam(String(t.team_id || t.id)) || resolveTeam(t.name);
                if (res) allTeamsMap.set(res.name.toLowerCase(), res);
            });
            matchOutcomes.forEach(mo => {
                if (mo.homeTeam) allTeamsMap.set(mo.homeTeam.name.toLowerCase(), mo.homeTeam);
                if (mo.awayTeam) allTeamsMap.set(mo.awayTeam.name.toLowerCase(), mo.awayTeam);
            });
        }

        const activeList: { team: ResolvedTeam; currentStage: string; nextOpponent?: string }[] = [];

        allTeamsMap.forEach(team => {
            if (!isTeamAssigned(team)) {
                const activeMatch = matchOutcomes.find(mo =>
                    !mo.isFinished && (
                        (mo.homeTeam && (mo.homeTeam.id === team.id || mo.homeTeam.name.toLowerCase() === team.name.toLowerCase())) ||
                        (mo.awayTeam && (mo.awayTeam.id === team.id || mo.awayTeam.name.toLowerCase() === team.name.toLowerCase()))
                    )
                );

                let currentStage = locale === 'th' ? "อยู่ในการแข่งขัน" : "In Contention";
                let nextOpponent: string | undefined;

                if (activeMatch) {
                    currentStage = activeMatch.label;
                    const isHome = activeMatch.homeTeam?.id === team.id || activeMatch.homeTeam?.name.toLowerCase() === team.name.toLowerCase();
                    const opp = isHome ? activeMatch.awayTeam?.name : activeMatch.homeTeam?.name;
                    if (opp && opp !== "TBD" && opp !== "Bye") {
                        nextOpponent = opp;
                    }
                } else if (groupsData.length > 0) {
                    const inGroup = groupsData.find(g => g.rankings.some(rt => rt.id === team.id || rt.name.toLowerCase() === team.name.toLowerCase()));
                    if (inGroup) {
                        currentStage = `${locale === 'th' ? "รอบแบ่งกลุ่ม" : "Group Stage"} (${inGroup.label})`;
                    }
                } else {
                    currentStage = locale === 'th' ? "รอการแข่งขัน" : "Waiting for match";
                }

                activeList.push({
                    team,
                    currentStage,
                    nextOpponent,
                });
            }
        });

        // 6. Build Single Unified Ranking List
        const unifiedList: UnifiedRankingItem[] = [];

        // Champion
        if (champions.length > 0) {
            champions.forEach(team => {
                unifiedList.push({
                    id: team.id,
                    team,
                    type: 'champion',
                    rank: 1,
                    stageLabel: locale === 'th' ? "ชนะเลิศ (Champion)" : "Champion",
                    isActive: false,
                });
            });
        }

        // Runner-up
        if (runnerUps.length > 0) {
            runnerUps.forEach(team => {
                unifiedList.push({
                    id: team.id,
                    team,
                    type: 'runner_up',
                    rank: 2,
                    stageLabel: locale === 'th' ? "รองชนะเลิศอันดับ 1" : "Runner-up",
                    isActive: false,
                });
            });
        }

        // Active Teams
        if (activeList.length > 0) {
            activeList.forEach(item => {
                unifiedList.push({
                    id: item.team.id,
                    team: item.team,
                    type: 'active',
                    stageLabel: item.currentStage,
                    nextOpponent: item.nextOpponent,
                    isActive: true,
                });
            });
        }

        // Eliminated Tiers (3rd place, 4th place, Knockout rounds, Group stages)
        const decidedTopCount = (champions.length > 0 ? champions.length : 0) + (runnerUps.length > 0 ? runnerUps.length : 0);
        let currentRank = decidedTopCount + activeList.length + 1;

        eliminatedTiers.forEach(tier => {
            const tierCount = tier.teams.length;
            const isTie = tierCount > 1;

            tier.teams.forEach(team => {
                unifiedList.push({
                    id: team.id,
                    team,
                    type: tier.tierName,
                    rank: currentRank,
                    stageLabel: tier.stageLabel,
                    isTie,
                    isActive: false,
                });
            });

            currentRank += tierCount;
        });

        return {
            items: unifiedList,
            activeCount: activeList.length,
        };
    }, [nodes, edges, matches, storeTeams, categoryId, locale]);

    // Filter by search query
    const filteredItems = React.useMemo(() => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(item =>
            item.team.name.toLowerCase().includes(q) ||
            item.stageLabel.toLowerCase().includes(q) ||
            (item.nextOpponent && item.nextOpponent.toLowerCase().includes(q))
        );
    }, [items, searchQuery]);

    // Check if tournament has a determined champion or rank 1 -> auto set status to completed
    const hasChampion = React.useMemo(() => {
        return items.some(item => (item.type === 'champion' || item.rank === 1) && !item.isActive);
    }, [items]);

    React.useEffect(() => {
        if (!hasChampion || !tournamentId) return;
        if (currentTournamentStatus === 'completed' || currentTournamentStatus === 'cancelled') return;

        // If status was manually unlocked in Danger Zone, do not auto-override
        if (typeof window !== 'undefined') {
            const isManuallyUnlocked = sessionStorage.getItem(`tournament_unlocked_${tournamentId}`) === 'true';
            if (isManuallyUnlocked) return;
        }

        updateTournamentStatus(tournamentId, 'completed').then(res => {
            if (res.success) {
                onStatusChange?.('completed');
            }
        }).catch(err => {
            console.error("Failed to auto-update tournament status to completed:", err);
        });
    }, [hasChampion, tournamentId, currentTournamentStatus, onStatusChange]);

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Search and Refresh Bar */}
            <div className="p-4 border-b flex items-center shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        size="sm"
                        placeholder={locale === 'th' ? "ค้นหาชื่อทีมหรือรอบ..." : "Search team or round..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 custom-scrollbar">
                {/* Header Info */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Header level={4}>
                            {locale === 'th' ? "ตารางอันดับการแข่งขัน" : "Tournament Standings"}
                        </Header>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeCount > 0 ? (
                            <Badge variant="success" size="sm" className="font-bold text-[10px] px-2 py-0.5">
                                {locale === 'th'
                                    ? `อยู่ในการแข่งขัน ${activeCount}/${items.length}`
                                    : `In Contention ${activeCount}/${items.length}`}
                            </Badge>
                        ) : items.length > 0 ? (
                            <Badge variant="outline" size="sm" className="font-bold text-[10px] px-2 py-0.5 text-muted-foreground border-border">
                                <CheckCircle2 className="size-3 text-emerald-500" />
                                {locale === 'th'
                                    ? `เสร็จสิ้นการแข่งขัน (${items.length}/${items.length})`
                                    : `Completed (${items.length}/${items.length})`}
                            </Badge>
                        ) : null}
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="py-8 text-center border border-dashed rounded-sm bg-muted/10 p-6">
                        <AlertCircle className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold text-foreground">
                            {locale === 'th' ? "ยังไม่มีข้อมูลทีมในการแข่งขัน" : "No teams found"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[260px] mx-auto">
                            {locale === 'th'
                                ? "เมื่อเพิ่มทีมในสายการแข่งขันและบันทึกผล อันดับจะถูกประมวลผลอัตโนมัติ"
                                : "Add teams and record match outcomes to view standings."}
                        </p>
                    </div>
                ) : (
                    <div className="border border-border bg-card rounded-sm divide-y divide-border overflow-hidden">
                        {filteredItems.map((item, idx) => {
                            const isChamp = item.type === 'champion';
                            const isSecond = item.type === 'runner_up';
                            const isThird = item.type === 'third';
                            const isPodium = isChamp || isSecond || isThird;

                            return (
                                <div
                                    key={`${item.id}-${idx}`}
                                    className={cn(
                                        "flex items-center justify-between p-2.5 transition-all gap-2",
                                        isChamp && "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent",
                                        isSecond && "bg-gradient-to-r from-slate-400/10 via-slate-400/5 to-transparent",
                                        isThird && "bg-gradient-to-r from-amber-700/10 via-amber-700/5 to-transparent",
                                        item.isActive && "bg-muted/10 hover:bg-muted/30",
                                        !isPodium && !item.isActive && "hover:bg-muted/30"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Rank / Status Badge */}
                                        <div
                                            className={cn(
                                                "flex items-center justify-center font-bold text-sm shrink-0",
                                                isChamp && "text-amber-800 dark:text-amber-600 font-bold",
                                                isSecond && "text-slate-600 dark:text-slate-600 font-bold",
                                                isThird && "text-amber-800 dark:text-amber-600 font-bold",
                                                item.isActive && "text-primary",
                                                !isPodium && !item.isActive && "text-sm"
                                            )}
                                        >
                                            {isChamp ? (
                                                <Trophy className="size-4 fill-amber-800 dark:fill-amber-600" />
                                            ) : isSecond ? (
                                                <span className="">2</span>
                                            ) : isThird ? (
                                                <span className="">3</span>
                                            ) : item.isActive ? (
                                                <Flame className="size-4 fill-primary" />
                                            ) : (
                                                item.rank ?? "-"
                                            )}
                                        </div>

                                        {/* Team Crest & Name */}
                                        <div className="size-9 rounded-full bg-muted-foreground/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {item.team.logo_url ? (
                                                <Image
                                                    src={item.team.logo_url}
                                                    alt={item.team.name}
                                                    width={28}
                                                    height={28}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-muted-foreground">
                                                    {item.team.name.slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "text-xs truncate",
                                                    isChamp ? "font-black text-amber-500 text-sm" : isSecond ? "font-black text-foreground" : "font-bold text-foreground"
                                                )}>
                                                    {item.team.name}
                                                </span>
                                                {item.isTie && (
                                                    <span className="text-[9px] text-muted-foreground font-semibold shrink-0">
                                                        ({locale === 'th' ? "ร่วม" : "tied"})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground truncate">
                                                {item.stageLabel}
                                                {item.nextOpponent && (
                                                    <span className="text-foreground/80 font-bold ml-1">
                                                        vs {item.nextOpponent}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stage / Status Badge on right */}
                                    <div className="shrink-0 flex items-center">
                                        {isChamp ? (
                                            <div className="text-amber-500 dark:text-amber-500 text-xs font-bold">
                                                1st
                                            </div>
                                        ) : isSecond ? (
                                            <div className="text-slate-600 dark:text-slate-600 text-xs font-bold">
                                                2nd
                                            </div>
                                        ) : isThird ? (
                                            <div className="text-amber-800 dark:text-amber-600 text-xs font-bold">
                                                3rd
                                            </div>
                                        ) : item.isActive ? (
                                            <div className="text-xs text-primary font-bold">
                                                {locale === 'th' ? "กำลังแข่งขัน" : "Active"}
                                            </div>
                                        ) : (
                                            <div className="text-xs font-bold text-muted-foreground">
                                                #{item.rank}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
