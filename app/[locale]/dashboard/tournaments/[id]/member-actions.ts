"use server";

import { createClient } from "@/utils/supabase/server";
import { ActionResponse, TournamentMember } from "@/types";
import { revalidatePath } from "next/cache";

export async function getMembers(tournamentId: string): Promise<ActionResponse<TournamentMember[]>> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("tournament_members")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching members:", JSON.stringify(error, null, 2));
            return { success: false, error: error.message || "Failed to fetch members" };
        }

        return { success: true, data: data as TournamentMember[] };
    } catch (error) {
        console.error("Error in getMembers:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function inviteMember(
    tournamentId: string,
    email: string,
    role: "admin" | "editor" | "viewer"
): Promise<ActionResponse<TournamentMember>> {
    const supabase = await createClient();

    try {
        // 1. Check if user exists (Optional: requires a generic public profile table or similar if you want to link immediately)
        // For now, we search in the auth-linked public table if you have one, OR we just invite by email.
        // Assuming we rely on the DB constraints and logic.

        // We will insert with email. If a trigger finds a user, it links it.
        // Or we can try to find a user ID if we have a way.
        // Simplest MVP: Insert email.

        const { data, error } = await supabase
            .from("tournament_members")
            .insert({
                tournament_id: tournamentId,
                email: email,
                role: role,
                status: "pending"
            })
            .select() // Select to return the created row
            .single();

        if (error) {
            console.error("Error inviting member:", JSON.stringify(error, null, 2));
            if (error.code === "23505") {
                return { success: false, error: "User already invited or is a member." };
            }
            return { success: false, error: error.message || "Failed to invite member" };
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}/settings`);
        return { success: true, data: data as TournamentMember };
    } catch (error) {
        console.error("Error in inviteMember:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function removeMember(
    memberId: string,
    tournamentId: string
): Promise<ActionResponse<void>> {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from("tournament_members")
            .delete()
            .eq("id", memberId);

        if (error) {
            console.error("Error removing member:", error);
            return { success: false, error: "Failed to remove member" };
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}/settings`);
        return { success: true };
    } catch (error) {
        console.error("Error in removeMember:", error);
        return { success: false, error: "Internal server error" };
    }
}
