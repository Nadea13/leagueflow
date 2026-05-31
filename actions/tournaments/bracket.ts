"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, BracketCanvasData } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";

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

    const supabase = await createClient();

    let targetCategoryId = inputCategoryId;
    if (!targetCategoryId) {
        // Fetch first category as fallback
        const { data: categories } = await supabase
            .from("tournament_categories")
            .select("id")
            .eq("tournament_id", tournamentId);
        targetCategoryId = categories && categories.length > 0 ? categories[0].id : undefined;
    }

    if (!targetCategoryId) {
        return { success: false, error: "Tournament category not found" };
    }

    const categoryId = targetCategoryId;

    // 1. Fetch teams for auto-mapping placeholders to IDs
    const { data: tournamentTeams } = await supabase
        .from('tournament_teams')
        .select('team_id, team:teams(name)')
        .eq('tournament_category_id', categoryId);

    const teams = (tournamentTeams || []).map((tt) => {
        const teamObj = Array.isArray(tt.team) ? tt.team[0] : tt.team;
        return {
            id: tt.team_id as string,
            name: (teamObj?.name as string) || ""
        };
    });

    // Fetch all active matches in the category to resolve connections
    const { data: dbMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_category_id', categoryId)
        .is('deleted_at', null);

    const activeDbMatches = dbMatches || [];

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
                return team?.id || null;
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
                const groupTeamIds = rankings.map((name: string) => teams?.find(t => t.name === name)?.id).filter(Boolean);
                const groupMatches = activeDbMatches.filter(m => 
                    m.stage === 'group' &&
                    m.home_team_id && m.away_team_id && 
                    groupTeamIds.includes(m.home_team_id) && 
                    groupTeamIds.includes(m.away_team_id)
                );

                const isGroupFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
                if (isGroupFinished) {
                    const team = teams?.find(t => t.name === teamName);
                    return team?.id || null;
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
                        if (hScore < aScore) return dbM.home_team_id;
                        if (aScore < hScore) return dbM.away_team_id;
                    }
                }
            }
        }

        return null;
    };

    // 2. Collect all node_ids currently in the canvas
    const activeNodeIds = canvasData.nodes
        .filter(n => n.type === 'matchNode')
        .map(n => n.id);

    // 3. Soft-delete matches whose node_id is no longer in the canvas
    //    (i.e. the match node was deleted by the user)
    const orphanedMatchIds = (activeDbMatches || [])
        .filter(m => m.node_id && !activeNodeIds.includes(m.node_id))
        .map(m => m.id);

    if (orphanedMatchIds.length > 0) {
        await supabase
            .from('matches')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', orphanedMatchIds);
    }

    // 4. Process matches in nodes — create new or update existing
    const updatedNodes = [...canvasData.nodes];
    
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
                
                const baseRecord = {
                    tournament_category_id: categoryId,
                    node_id: node.id,
                    placeholder_home: match.placeholderA || null,
                    placeholder_away: match.placeholderB || null,
                    home_team_id: resolvedHomeId || homeTeam?.id || null,
                    away_team_id: resolvedAwayId || awayTeam?.id || null,
                    scheduled_at: match.match_date && match.match_time 
                        ? `${match.match_date}T${match.match_time}:00Z` 
                        : null,
                    round: 1, // Default round
                    stage: (matches.length > 1 ? 'group' : 'knockout') as 'group' | 'knockout',
                    match_index: i + 1
                };

                const insertRecord = {
                    ...baseRecord,
                    status: 'scheduled' as const,
                    is_manual: true
                };

                const matchId = match.dbId || match.matchId;

                if (matchId) {
                    // Check if this match still exists (not soft-deleted)
                    const { data: existingMatch } = await supabase
                        .from('matches')
                        .select('id')
                        .eq('id', matchId)
                        .is('deleted_at', null)
                        .single();

                    if (existingMatch) {
                        // Update existing (do not overwrite status)
                        await supabase
                            .from('matches')
                            .update(baseRecord)
                            .eq('id', matchId);
                    } else {
                        // Match was soft-deleted, create a new one
                        const { data: newMatch } = await supabase
                            .from('matches')
                            .insert(insertRecord)
                            .select('id')
                            .single();
                        
                        if (newMatch) {
                            matches[i] = { ...match, dbId: newMatch.id };
                        }
                    }
                } else {
                    // Create new
                    const { data: newMatch } = await supabase
                        .from('matches')
                        .insert(insertRecord)
                        .select('id')
                        .single();
                    
                    if (newMatch) {
                        matches[i] = { ...match, dbId: newMatch.id };
                    }
                }
            }
        }
    }

    // 5. Save the final updated canvas data
    const { error } = await supabase
        .from("tournament_categories")
        .update({ canvas_data: canvasData })
        .eq("id", categoryId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, data: canvasData };
}
