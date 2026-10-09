"use server";

import { revalidatePath } from "next/cache";
import { ActionResponse, BracketCanvasData } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";
import { ApiClient } from "@/lib/api-client";

interface MatchNodeData {
    matches?: Array<{
        dbId?: string;
        matchId?: string;
        placeholderA?: string;
        placeholderB?: string;
        match_date?: string;
        match_time?: string;
    }>;
}

export async function saveBracketCanvas(
    tournamentId: string,
    canvasData: BracketCanvasData,
    inputCategoryId?: string
): Promise<ActionResponse<BracketCanvasData>> {
    const access = await validateTournamentAccess(tournamentId, "editor");
    if (!access.success) {
        return { success: false, error: access.error };
    }

    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    let targetCategoryId = inputCategoryId;
    if (!targetCategoryId) {
        try {
            const tourRes = await fetch(`${apiUrl}/tournaments/${tournamentId}`, { cache: 'no-store' });
            if (tourRes.ok) {
                const tourData = await tourRes.json();
                const categories = tourData.categories || [];
                targetCategoryId = categories.length > 0 ? categories[0].id : undefined;
            }
        } catch (e) {
            console.error("Error fetching tournament categories fallback:", e);
        }
    }

    if (!targetCategoryId) {
        return { success: false, error: "Tournament category not found" };
    }

    const categoryId = targetCategoryId;

    // 1. Fetch teams for auto-mapping placeholders to IDs
    let teams: Array<{ id: string; team_id: string; name: string }> = [];
    try {
        const rawTeams = await ApiClient.fetch<any[]>(`/tournaments/${tournamentId}/teams?category_id=${categoryId}`);
        teams = (rawTeams || []).map((tt: any) => {
            const teamObj = tt.team || {};
            return {
                id: tt.id as string,
                team_id: (tt.team_id || tt.team?.id) as string,
                name: (teamObj.name || tt.team_name || "") as string
            };
        });
    } catch (e) {
        console.error("Error fetching tournament teams in saveBracketCanvas:", e);
    }

    // Fetch all active matches in the category to resolve connections
    let activeDbMatches: any[] = [];
    try {
        const rawMatches = await ApiClient.fetch<any[]>(`/tournaments/${tournamentId}/categories/${categoryId}/matches`);
        activeDbMatches = rawMatches || [];
    } catch (e) {
        console.error("Error fetching active matches in saveBracketCanvas:", e);
    }

    // Helper to resolve team ID from connected edges on the server
    const resolveTeamId = (nodeId: string, slot: 'a' | 'b', matchIndex: number): string | null => {
        const handleId = `slot-${slot}-${matchIndex}`;
        const edge = canvasData.edges.find(e => e.target === nodeId && e.targetHandle === handleId);
        if (!edge) return null;

        const sourceNode = canvasData.nodes.find(n => n.id === edge.source);
        if (!sourceNode) return null;

        if (sourceNode.type === 'teamListNode') {
            const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
            if (teamIdMatch) {
                const teamId = teamIdMatch[1];
                const team = teams?.find(t => String(t.id) === String(teamId));
                return team?.team_id || null;
            }
        }

        if (sourceNode.type === 'standingNode' || sourceNode.type === 'groupNode') {
            const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
            if (rankMatch) {
                const rankIndex = parseInt(rankMatch[1], 10);
                const rankings = (sourceNode.data as { rankings?: string[] }).rankings || [];
                const teamName = rankings[rankIndex];
                if (!teamName || teamName === "TBD") return null;

                // Check if all matches for the teams in this standing/group node are finished
                const groupTeamIds = rankings.map((name: string) => teams?.find(t => t.name === name)?.team_id).filter(Boolean);
                const groupMatches = activeDbMatches.filter(m => 
                    m.stage === 'group' &&
                    m.home_team_id && m.away_team_id && 
                    groupTeamIds.includes(m.home_team_id) && 
                    groupTeamIds.includes(m.away_team_id)
                );

                const isGroupFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
                if (isGroupFinished) {
                    const team = teams?.find(t => t.name === teamName);
                    return team?.team_id || null;
                }
            }
        }

        if (sourceNode.type === 'matchNode') {
            const winnerMatch = edge.sourceHandle?.match(/winner-(\d+)/);
            if (winnerMatch) {
                const winnerIndex = parseInt(winnerMatch[1], 10);
                const sourceMatches = (sourceNode.data as MatchNodeData).matches || [];
                const sourceMatch = sourceMatches[winnerIndex];
                if (sourceMatch && (sourceMatch.dbId || sourceMatch.matchId)) {
                    const matchId = sourceMatch.dbId || sourceMatch.matchId;
                    const dbM = activeDbMatches.find(m => m.id === matchId);
                    if (dbM && dbM.status === 'finished') {
                        const hScore = typeof dbM.home_score === 'object' && dbM.home_score !== null && 'total' in dbM.home_score ? Number((dbM.home_score as { total?: number | string }).total) || 0 : Number(dbM.home_score) || 0;
                        const aScore = typeof dbM.away_score === 'object' && dbM.away_score !== null && 'total' in dbM.away_score ? Number((dbM.away_score as { total?: number | string }).total) || 0 : Number(dbM.away_score) || 0;
                        if (hScore > aScore) return dbM.home_team_id;
                        if (aScore > hScore) return dbM.away_team_id;
                    }
                }
            }
            const loserMatch = edge.sourceHandle?.match(/loser-(\d+)/);
            if (loserMatch) {
                const loserIndex = parseInt(loserMatch[1], 10);
                const sourceMatches = (sourceNode.data as MatchNodeData).matches || [];
                const sourceMatch = sourceMatches[loserIndex];
                if (sourceMatch && (sourceMatch.dbId || sourceMatch.matchId)) {
                    const matchId = sourceMatch.dbId || sourceMatch.matchId;
                    const dbM = activeDbMatches.find(m => m.id === matchId);
                    if (dbM && dbM.status === 'finished') {
                        const hScore = typeof dbM.home_score === 'object' && dbM.home_score !== null && 'total' in dbM.home_score ? Number((dbM.home_score as { total?: number | string }).total) || 0 : Number(dbM.home_score) || 0;
                        const aScore = typeof dbM.away_score === 'object' && dbM.away_score !== null && 'total' in dbM.away_score ? Number((dbM.away_score as { total?: number | string }).total) || 0 : Number(dbM.away_score) || 0;
                        if (hScore > aScore) return dbM.home_team_id;
                        if (aScore < hScore) return dbM.away_team_id;
                    }
                }
            }
        }

        return null;
    };

    // 2. Process matches in nodes — prepare for sync
    const updatedNodes = [...canvasData.nodes];
    const matchesToSync: any[] = [];
    const validMatchIds: string[] = [];
    
    for (const node of updatedNodes) {
        if (node.type === 'matchNode') {
            const nodeData = node.data as MatchNodeData;
            const matches = nodeData.matches || [];
            
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                
                // Try to map placeholders to real team IDs
                const homeTeam = teams?.find(t => t.name === match.placeholderA);
                const awayTeam = teams?.find(t => t.name === match.placeholderB);

                const resolvedHomeId = resolveTeamId(node.id, 'a', i);
                const resolvedAwayId = resolveTeamId(node.id, 'b', i);
                
                const matchId = match.dbId || match.matchId;
                if (matchId) {
                    validMatchIds.push(matchId);
                }

                const scheduledAt = match.match_date && match.match_time 
                    ? `${match.match_date}T${match.match_time}:00Z` 
                    : null;

                matchesToSync.push({
                    id: matchId || undefined,
                    tournament_category_id: categoryId,
                    node_id: node.id,
                    placeholder_home: match.placeholderA || null,
                    placeholder_away: match.placeholderB || null,
                    placeholder_a: match.placeholderA || null,
                    placeholder_b: match.placeholderB || null,
                    home_team_id: resolvedHomeId || homeTeam?.team_id || null,
                    away_team_id: resolvedAwayId || awayTeam?.team_id || null,
                    scheduled_at: scheduledAt,
                    scheduled_time: scheduledAt,
                    round: 1,
                    round_number: 1,
                    stage: matches.length > 1 ? 'group' : 'knockout',
                    match_index: i + 1,
                    match_number: i + 1,
                    status: 'scheduled',
                    is_manual: true
                });
            }
        }
    }

    // 3. Sync matches to Go backend API
    try {
        const syncResp = await ApiClient.fetch<{ message: string; matches: any[] }>(`/tournaments/${tournamentId}/categories/${categoryId}/sync-matches`, {
            method: 'POST',
            body: JSON.stringify({
                matches: matchesToSync,
                valid_ids: validMatchIds
            })
        });

        const syncedMatches = syncResp?.matches || [];

        // Map synced match IDs back into node matches
        for (const node of updatedNodes) {
            if (node.type === 'matchNode') {
                const nodeData = node.data as MatchNodeData;
                const matches = nodeData.matches || [];
                for (let i = 0; i < matches.length; i++) {
                    const match = matches[i];
                    const synced = syncedMatches.find(sm => sm.node_id === node.id && sm.match_index === (i + 1));
                    if (synced && synced.id) {
                        matches[i] = { ...match, dbId: synced.id, matchId: synced.id };
                    }
                }
            }
        }
    } catch (syncErr) {
        console.error("Error syncing matches to backend:", syncErr);
    }

    // 4. Save the final updated canvas data to backend
    const returnData: BracketCanvasData = {
        ...canvasData,
        nodes: updatedNodes
    };

    try {
        const updateRes = await fetch(`${apiUrl}/tournaments/${tournamentId}/categories/${categoryId}/canvas`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ canvas_data: returnData }),
        });

        if (!updateRes.ok) {
            const errData = await updateRes.json().catch(() => ({}));
            return { success: false, error: errData.error || `Failed to update canvas data: HTTP ${updateRes.status}` };
        }
    } catch (err) {
        console.error("Failed to save canvas data to backend:", err);
        return { success: false, error: err instanceof Error ? err.message : "Failed to save canvas data" };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/organizer/tournaments/${tournamentId}`);

    return { success: true, data: returnData };
}
