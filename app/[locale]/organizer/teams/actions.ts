'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Team } from "@/types/index";
import { getUserTeamLimit } from "@/app/[locale]/dashboard/actions";

export async function createTeamGlobal(
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };
    const name = formData.get("name") as string;
    const tournamentId = formData.get("tournament_id") as string;
    const logoFile = formData.get("logo") as File;

    if (!name) {
        return { success: false, error: "Team name is required" };
    }

    // Check Global Team Limit (1 for Free, Unlimited for Pro)
    const teamLimit = await getUserTeamLimit();
    if (teamLimit !== Infinity) {
        // Count teams owned by this user
        const { count: ownedCount } = await supabase
            .from("teams")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", user.id);

        if (ownedCount !== null && ownedCount >= teamLimit) {
            return { 
                success: false, 
                error: `Team limit reached (${teamLimit} team for Free plan). Upgrade to Manager Pro for unlimited teams.` 
            };
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
        user_id: user.id, // Record ownership
        name,
        logo_url,
        created_at: new Date().toISOString(),
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/teams`);
    revalidatePath(`/organizer/tournaments/${tournamentId}`);
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
        })
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/teams`);
    if (tournamentId) {
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        revalidatePath(`/dashboard/teams/tournament/${tournamentId}`);
    }
    if (newTournamentId && newTournamentId !== tournamentId) {
        revalidatePath(`/organizer/tournaments/${newTournamentId}`);
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
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        revalidatePath(`/dashboard/teams/tournament/${tournamentId}`);
    }
    return { success: true };
}

export async function getMyTeams(): Promise<ActionResponse<Team[]>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase
        .from("teams")
        .select("*, tournament:tournaments(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
