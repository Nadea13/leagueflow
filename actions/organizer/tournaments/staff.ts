"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, TournamentMember } from "@/types";
import { logActivity } from "@/lib/audit";
import { validateTournamentAccess } from "@/lib/security";

/**
 * Invite a collaborator to a tournament by email.
 * Creates a pending tournament_invitations record.
 */
export async function inviteStaff(
    tournamentId: string,
    email: string,
    role: 'co_organizer' | 'staff' | 'referee' = 'staff'
): Promise<ActionResponse<TournamentMember>> {
    const supabase = await createClient();

    // Security Check: Only the tournament owner (Admin) can invite collaborators
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success || !access.user) return { success: false, error: access.error };
    const user = access.user;

    // Check if the email is already invited
    const { data: existing } = await supabase
        .from("tournament_invitations")
        .select("id, status")
        .eq("tournament_id", tournamentId)
        .eq("email", email.toLowerCase())
        .is("deleted_at", null)
        .maybeSingle();

    if (existing) {
        return { success: false, error: "This email has already been invited" };
    }

    // Check if the email is the owner's email
    if (user.email?.toLowerCase() === email.toLowerCase()) {
        return { success: false, error: "You cannot invite yourself" };
    }

    // Create the invitation
    const { data, error } = await supabase
        .from("tournament_invitations")
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

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('INVITE_MEMBER', 'tournament', tournamentId, { email, role });
    return { success: true, data: data as TournamentMember };
}

/**
 * Get all collaborators for a tournament.
 */
export async function getStaffs(
    tournamentId: string
): Promise<ActionResponse<TournamentMember[]>> {
    // Security Check: Only collaborators or owner can see the member list
    const access = await validateTournamentAccess(tournamentId, 'viewer');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tournament_invitations")
        .select("*")
        .eq("tournament_id", tournamentId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching collaborators:", error);
        return { success: false, error: error.message };
    }

    return { success: true, data: data as TournamentMember[] || [] };
}

/**
 * Remove a collaborator from a tournament (soft delete).
 */
export async function removeStaff(
    memberId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    // Security Check: Only the tournament owner (Admin) can remove collaborators
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const { error } = await supabase
        .from("tournament_invitations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", memberId)
        .eq("tournament_id", tournamentId);

    if (error) {
        console.error("Error removing collaborator:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
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
        .select("organizer_id")
        .eq("id", tournamentId)
        .single();

    if (tournament && tournament.organizer_id === user.id) {
        return { success: true, data: { role: 'admin', isOwner: true } };
    }

    // Check if user is a collaborator (by user_id or email)
    const { data: member } = await supabase
        .from("tournament_invitations")
        .select("role, status")
        .eq("tournament_id", tournamentId)
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .eq("status", "accepted")
        .is("deleted_at", null)
        .maybeSingle();

    if (member) {
        const roleMap: Record<'co_organizer' | 'staff' | 'referee', 'admin' | 'editor' | 'viewer'> = {
            co_organizer: 'admin',
            staff: 'editor',
            referee: 'viewer'
        };
        const mappedRole = roleMap[member.role as 'co_organizer' | 'staff' | 'referee'] || 'viewer';
        return { success: true, data: { role: mappedRole, isOwner: false } };
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
        .from("tournament_invitations")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending")
        .is("deleted_at", null)
        .maybeSingle();

    if (fetchError || !member) {
        return { success: false, error: "No pending invite found for your email" };
    }

    // Update the member record
    const { data: updated, error } = await supabase
        .from("tournament_invitations")
        .update({
            user_id: user.id,
            status: 'accepted'
        })
        .eq("id", member.id)
        .select()
        .single();

    if (error || !updated) {
        console.error("Error accepting invite:", error);
        return { success: false, error: error?.message || "Failed to accept invite" };
    }

    // Refresh relevant paths
    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    revalidatePath(`/dashboard/invites`);
    revalidatePath(`/dashboard`);

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
        .from("tournament_invitations")
        .select(`
            id,
            tournament_id,
            role,
            tournaments (
                name
            )
        `)
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending")
        .is("deleted_at", null);

    if (error) {
        console.error("Error fetching pending invites:", error);
        return { success: false, error: error.message };
    }

    const invites = (data || []).map((item) => ({
        id: item.id,
        tournament_id: item.tournament_id,
        tournament_name: (item.tournaments as unknown as { name: string } | null)?.name,
        role: item.role
    }));

    return { success: true, data: invites };
}

/**
 * Reject a collaboration invite.
 * Updates the status to 'rejected'.
 */
export async function rejectInvite(
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
        return { success: false, error: "Please log in to reject the invite" };
    }

    // Find pending invite for this email
    const { data: member, error: fetchError } = await supabase
        .from("tournament_invitations")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending")
        .is("deleted_at", null)
        .maybeSingle();

    if (fetchError || !member) {
        return { success: false, error: "No pending invite found for your email" };
    }

    // Update the member record to rejected
    const { error } = await supabase
        .from("tournament_invitations")
        .update({
            status: 'rejected'
        })
        .eq("id", member.id);

    if (error) {
        console.error("Error rejecting invite:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/invites`);
    revalidatePath(`/dashboard/notifications`);
    revalidatePath(`/dashboard`);

    return { success: true };
}

/**
 * Get all invitations (pending, accepted, rejected) for the current user.
 */
export async function getAllUserInvites(): Promise<ActionResponse<Array<{
    id: string;
    tournament_id: string;
    tournament_name?: string;
    role: string;
    status: 'pending' | 'accepted' | 'rejected';
}>>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
        return { success: true, data: [] };
    }

    const { data, error } = await supabase
        .from("tournament_invitations")
        .select(`
            id,
            tournament_id,
            role,
            status,
            tournaments (
                name
            )
        `)
        .eq("email", user.email.toLowerCase())
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all user invites:", error);
        return { success: false, error: error.message };
    }

    const invites = (data || []).map((item) => ({
        id: item.id,
        tournament_id: item.tournament_id,
        tournament_name: (item.tournaments as unknown as { name: string } | null)?.name,
        role: item.role,
        status: item.status as 'pending' | 'accepted' | 'rejected'
    }));

    return { success: true, data: invites };
}
