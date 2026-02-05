"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, TournamentMember } from "@/types";
import { logActivity } from "@/lib/audit";

/**
 * Invite a collaborator to a tournament by email.
 * Creates a pending TournamentMember record.
 */
export async function inviteCollaborator(
    tournamentId: string,
    email: string,
    role: 'editor' | 'viewer' = 'editor'
): Promise<ActionResponse<TournamentMember>> {
    const supabase = await createClient();

    // Verify the current user is the owner (admin) of the tournament
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // Check if the current user owns this tournament
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("user_id")
        .eq("id", tournamentId)
        .single();

    if (!tournament || tournament.user_id !== user.id) {
        return { success: false, error: "Only the tournament owner can invite collaborators" };
    }

    // Check if the email is already invited
    const { data: existing } = await supabase
        .from("tournament_members")
        .select("id, status")
        .eq("tournament_id", tournamentId)
        .eq("email", email.toLowerCase())
        .single();

    if (existing) {
        return { success: false, error: "This email has already been invited" };
    }

    // Check if the email is the owner's email
    if (user.email?.toLowerCase() === email.toLowerCase()) {
        return { success: false, error: "You cannot invite yourself" };
    }

    // Create the invitation
    const { data, error } = await supabase
        .from("tournament_members")
        .insert({
            tournament_id: tournamentId,
            email: email.toLowerCase(),
            role: role,
            status: 'pending',
            user_id: null // Will be linked when they accept
        })
        .select()
        .single();

    if (error) {
        console.error("Error inviting collaborator:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('INVITE_MEMBER', 'tournament', tournamentId, { email, role });
    return { success: true, data };
}

/**
 * Get all collaborators for a tournament.
 */
export async function getCollaborators(
    tournamentId: string
): Promise<ActionResponse<TournamentMember[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tournament_members")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching collaborators:", error);
        return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
}

/**
 * Remove a collaborator from a tournament.
 */
export async function removeCollaborator(
    memberId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    // Verify the current user is the owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    const { data: tournament } = await supabase
        .from("tournaments")
        .select("user_id")
        .eq("id", tournamentId)
        .single();

    if (!tournament || tournament.user_id !== user.id) {
        return { success: false, error: "Only the tournament owner can remove collaborators" };
    }

    const { error } = await supabase
        .from("tournament_members")
        .delete()
        .eq("id", memberId)
        .eq("tournament_id", tournamentId);

    if (error) {
        console.error("Error removing collaborator:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('REMOVE_MEMBER', 'tournament', tournamentId, { member_id: memberId });
    return { success: true };
}

/**
 * Get the current user's role for a specific tournament.
 * Returns null if the user has no access.
 */
export async function getUserRole(
    tournamentId: string
): Promise<ActionResponse<{ role: 'admin' | 'editor' | 'viewer' | null; isOwner: boolean }>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: true, data: { role: null, isOwner: false } };
    }

    // Check if user is the owner
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("user_id")
        .eq("id", tournamentId)
        .single();

    if (tournament && tournament.user_id === user.id) {
        return { success: true, data: { role: 'admin', isOwner: true } };
    }

    // Check if user is a collaborator (by user_id or email)
    const { data: member } = await supabase
        .from("tournament_members")
        .select("role, status")
        .eq("tournament_id", tournamentId)
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .eq("status", "accepted")
        .single();

    if (member) {
        return { success: true, data: { role: member.role, isOwner: false } };
    }

    return { success: true, data: { role: null, isOwner: false } };
}

/**
 * Accept a collaboration invite.
 * Links the current user to the pending member record.
 */
export async function acceptInvite(
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
        return { success: false, error: "Please log in to accept the invite" };
    }

    // Find pending invite for this email
    const { data: member, error: fetchError } = await supabase
        .from("tournament_members")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending")
        .single();

    if (fetchError || !member) {
        return { success: false, error: "No pending invite found for your email" };
    }

    // Update the member record
    const { error } = await supabase
        .from("tournament_members")
        .update({
            user_id: user.id,
            status: 'accepted'
        })
        .eq("id", member.id);

    if (error) {
        console.error("Error accepting invite:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

/**
 * Check if the current user has a pending invite for any tournament.
 * Used on dashboard to show notifications.
 */
export async function getPendingInvites(): Promise<ActionResponse<Array<{
    id: string;
    tournament_id: string;
    tournament_name?: string;
    role: string;
}>>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
        return { success: true, data: [] };
    }

    const { data, error } = await supabase
        .from("tournament_members")
        .select(`
            id,
            tournament_id,
            role,
            tournaments (
                name
            )
        `)
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending");

    if (error) {
        console.error("Error fetching pending invites:", error);
        return { success: false, error: error.message };
    }

    const invites = (data || []).map((item: any) => ({
        id: item.id,
        tournament_id: item.tournament_id,
        tournament_name: item.tournaments?.name,
        role: item.role
    }));

    return { success: true, data: invites };
}
