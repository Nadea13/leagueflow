'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";

export async function createTeamGlobal(
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const tournamentId = formData.get("tournament_id") as string;
    const logoFile = formData.get("logo") as File;

    if (!name) {
        return { success: false, error: "Team name is required" };
    }

    // Check Team Limit for Free Plan ONLY if assigned to a tournament
    if (tournamentId) {
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("plan")
            .eq("id", tournamentId)
            .single();

        if (tournament && (!tournament.plan || tournament.plan === 'free')) {
            const { count } = await supabase
                .from("teams")
                .select("*", { count: 'exact', head: true })
                .eq("tournament_id", tournamentId);

            if (count !== null && count >= 8) {
                return { success: false, error: "Team limit reached for this tournament (Max 8 for Free Plan). Upgrade to Pro to add more." };
            }
        }
    }

    let logo_url = null;

    // Handle File Upload
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    const { error } = await supabase.from("teams").insert({
        tournament_id: tournamentId || null,
        name,
        logo_url,
        created_at: new Date().toISOString(),
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/teams`);
    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    revalidatePath(`/dashboard/teams/tournament/${tournamentId}`);
    return { success: true };
}

export async function updateTeamGlobal(
    teamId: string,
    formData: FormData,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const logoFile = formData.get("logo") as File;
    const existingLogoUrl = formData.get("existing_logo_url") as string;

    let logo_url = existingLogoUrl;

    // Handle File Upload
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    const tournamentIdForm = formData.get("tournament_id") as string;

    // If a new tournament ID is provided in form, use it. Otherwise keep existing (or let it be null if that's what form sends)
    // Actually, if we put it in the form, we should update it.
    // Assuming the form will send either a valid ID or empty string for null.

    const newTournamentId = tournamentIdForm || null;

    const { error } = await supabase
        .from("teams")
        .update({
            name,
            logo_url: logo_url || null,
            tournament_id: newTournamentId
        })
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/teams`);
    if (tournamentId) {
        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/dashboard/teams/tournament/${tournamentId}`);
    }
    if (newTournamentId && newTournamentId !== tournamentId) {
        revalidatePath(`/dashboard/tournaments/${newTournamentId}`);
        revalidatePath(`/dashboard/teams/tournament/${newTournamentId}`);
    }
    return { success: true };
}

export async function deleteTeamGlobal(teamId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/teams`);
    if (tournamentId) {
        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/dashboard/teams/tournament/${tournamentId}`);
    }
    return { success: true };
}
