'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, TournamentRules } from "@/types/index";

export async function getTournamentRules(tournamentId: string): Promise<ActionResponse<TournamentRules>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tournament_rules")
        .select("*")
        .eq("tournament_id", tournamentId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        return { success: false, error: error.message };
    }

    // Return defaults if none exist
    if (!data) {
        return {
            success: true,
            data: {
                tournament_id: tournamentId,
                half_duration: 45,
                extra_time_duration: 15,
                max_squad_size: null,
                min_squad_size: null,
                max_substitutions: 5,
                yellow_card_ban_threshold: 3,
                red_card_ban_matches: 1,
                points_for_win: 3,
                points_for_draw: 1,
                points_for_loss: 0,
            }
        };
    }

    return { success: true, data: data as TournamentRules };
}

export async function updateTournamentRules(
    tournamentId: string,
    rules: Partial<Omit<TournamentRules, 'tournament_id' | 'created_at' | 'updated_at'>>
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("tournament_rules")
        .upsert({
            tournament_id: tournamentId,
            ...rules,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'tournament_id'
        });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
