"use server";

import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";
import { initTournamentStructure } from "@/lib/fixture-utils";
import { validateTournamentAccess } from "@/lib/security";

const getScoreTotal = (scoreObj: unknown): number => {
    if (!scoreObj) return 0;
    if (typeof scoreObj === 'object' && scoreObj !== null) {
        return (scoreObj as { total?: number }).total || 0;
    }
    const val = Number(scoreObj);
    return isNaN(val) ? 0 : val;
};

async function getLastRound(tournamentCategoryId: string, supabase: SupabaseClient): Promise<number> {
    const { data } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_category_id', tournamentCategoryId)
        .order('round', { ascending: false })
        .limit(1)
        .single();
    return data?.round || 0;
}

export async function generateFixtures(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    
    const supabase = await createClient();

    // Fetch category
    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) {
        return { success: false, error: "No tournament category setup found" };
    }
    const tournamentCategoryId = category.id;

    // Check if fixtures already exist and if we can regenerate
    const { data: existingMatches } = await supabase
        .from('matches')
        .select('id, home_score, away_score, status')
        .eq('tournament_category_id', tournamentCategoryId);

    const hasFixtures = existingMatches && existingMatches.length > 0;
    if (hasFixtures) {
        // Allow regeneration for all formats if no results are recorded
        const hasScores = existingMatches.some(m => {
            if (m.status === 'finished') return true;
            const homeTotal = getScoreTotal(m.home_score);
            const awayTotal = getScoreTotal(m.away_score);
            return homeTotal > 0 || awayTotal > 0;
        });

        if (hasScores) {
            return { success: false, error: "Cannot regenerate: Some matches already have results recorded." };
        }

        // Delete existing matches for regeneration
        const { error: deleteError } = await supabase
            .from('matches')
            .delete()
            .eq('tournament_category_id', tournamentCategoryId);

        if (deleteError) {
            console.error("Delete error during regeneration:", deleteError);
            return { success: false, error: "Failed to clear existing fixtures." };
        }
    }

    // Generate fixtures using utility
    const result = await initTournamentStructure(tournamentId, supabase);
    
    if (result.success) {
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
    }
    
    return result;
}

export async function resetFixtures(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) return { success: false, error: "No category found." };

    // Delete all matches
    const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_category_id", category.id);

    if (matchError) {
        return { success: false, error: "Failed to delete matches: " + matchError.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function resetBracketFlow(tournamentId: string, categoryId?: string | null): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    let targetCategoryId = categoryId;

    if (!targetCategoryId) {
        const { data: category } = await supabase
            .from('tournament_categories')
            .select('id')
            .eq('tournament_id', tournamentId)
            .limit(1)
            .single();

        if (!category) return { success: false, error: "No category found." };
        targetCategoryId = category.id;
    }

    // 1. Reset canvas_data
    const { error: canvasError } = await supabase
        .from("tournament_categories")
        .update({ canvas_data: null })
        .eq("id", targetCategoryId);

    if (canvasError) {
        return { success: false, error: "Failed to reset canvas: " + canvasError.message };
    }

    // 2. Delete matches
    const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_category_id", targetCategoryId);

    if (matchError) {
        return { success: false, error: "Failed to delete matches: " + matchError.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
