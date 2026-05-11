"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, BracketCanvasData } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";

export async function saveBracketCanvas(
    tournamentId: string,
    canvasData: BracketCanvasData
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, "editor");
    if (!access.success) {
        return { success: false, error: access.error };
    }

    const supabase = await createClient();

    const { error } = await supabase
        .from("tournaments")
        .update({ canvas_data: canvasData })
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
