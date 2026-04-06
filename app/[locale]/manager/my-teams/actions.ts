'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";
import { validateUploadedFile } from "@/lib/file-validation";

export async function createTeam(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const logoFile = formData.get("logo") as File;
        const description = formData.get("description") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }

        let logoUrl = null;

        // Handle logo upload if provided
        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("team-logos")
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload error:", uploadError);
                return { success: false, error: "Failed to upload logo: " + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from("team-logos")
                .getPublicUrl(filePath);

            logoUrl = publicUrl;
        }

        // Insert team record
        const { error: insertError } = await supabase
            .from("teams")
            .insert({
                name,
                logo_url: logoUrl,
                description: description || null,
                user_id: user.id,
                created_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error("Create team error:", insertError);
            return { success: false, error: insertError.message };
        }

        revalidatePath("/manager/my-teams");
        revalidatePath("/manager/dashboard");
        revalidatePath("/organizer/dashboard"); // In case it's used there
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in createTeam:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function getMyTeams(): Promise<ActionResponse<any[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const { data, error } = await supabase
            .from("teams")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error in getMyTeams:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function updateTeamGlobal(teamId: string, formData: FormData, tournamentId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const logoFile = formData.get("logo") as File;
        const description = formData.get("description") as string;
        const existingLogoUrl = formData.get("existing_logo_url") as string;

        if (!name) {
            return { success: false, error: "Team name is required" };
        }

        let logoUrl = existingLogoUrl;

        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("team-logos")
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload error:", uploadError);
                return { success: false, error: "Failed to upload logo: " + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from("team-logos")
                .getPublicUrl(filePath);

            logoUrl = publicUrl;
        }

        const { error } = await supabase
            .from("teams")
            .update({
                name,
                logo_url: logoUrl,
                description: description || null,
            })
            .eq("id", teamId)
            .eq("user_id", user.id); // Ensure ownership

        if (error) {
            console.error("Update team error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/manager/my-teams");
        revalidatePath(`/manager/my-teams/${teamId}`);
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in updateTeamGlobal:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function deleteTeamGlobal(teamId: string, tournamentId: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const { error } = await supabase
            .from("teams")
            .delete()
            .eq("id", teamId)
            .eq("user_id", user.id); // Ensure ownership

        if (error) {
            console.error("Delete team error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/manager/my-teams");
        
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in deleteTeamGlobal:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}
