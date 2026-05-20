"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, BracketCanvasData } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";

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

    const teams = (tournamentTeams || []).map((tt: any) => ({
        id: tt.team_id,
        name: tt.team?.name || ""
    }));

    // 2. Process matches in nodes
    const updatedNodes = [...canvasData.nodes];
    
    for (const node of updatedNodes) {
        if (node.type === 'matchNode') {
            const nodeData = node.data as any;
            const matches = nodeData.matches || [];
            
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                
                // Try to map placeholders to real team IDs
                const homeTeam = teams?.find(t => t.name === match.placeholderA);
                const awayTeam = teams?.find(t => t.name === match.placeholderB);
                
                const matchRecord = {
                    tournament_category_id: categoryId,
                    node_id: node.id,
                    placeholder_home: match.placeholderA || null,
                    placeholder_away: match.placeholderB || null,
                    home_team_id: homeTeam?.id || null,
                    away_team_id: awayTeam?.id || null,
                    scheduled_at: match.match_date && match.match_time 
                        ? `${match.match_date}T${match.match_time}:00Z` 
                        : null,
                    round: 1, // Default round
                    stage: (matches.length > 1 ? 'group' : 'knockout') as any, // match_stage_enum
                    status: 'scheduled' as any,
                    is_manual: true,
                    match_index: i + 1
                };

                const matchId = match.dbId || match.matchId;

                if (matchId) {
                    // Update existing
                    await supabase
                        .from('matches')
                        .update(matchRecord)
                        .eq('id', matchId);
                } else {
                    // Create new
                    const { data: newMatch, error: createError } = await supabase
                        .from('matches')
                        .insert(matchRecord)
                        .select('id')
                        .single();
                    
                    if (newMatch) {
                        matches[i] = { ...match, dbId: newMatch.id };
                    }
                }
            }
        }
    }

    // 3. Save the final updated canvas data
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
