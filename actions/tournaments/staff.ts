"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
    created_at: string;
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
            created_at,
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
        status: item.status as 'pending' | 'accepted' | 'rejected',
        created_at: item.created_at,
    }));

    return { success: true, data: invites };
}

/**
 * Get all team registrations for user-owned teams.
 */
export async function getUserRegistrations(): Promise<ActionResponse<Array<{
    id: string;
    team_id: string;
    team_name: string;
    tournament_name: string;
    registration_status: 'pending' | 'approved' | 'rejected';
    payment_status: 'pending' | 'paid' | 'waived' | 'failed';
    created_at: string;
}>>> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: true, data: [] };
    }

    // 1. Get user's teams
    const { data: userTeams, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null);

    if (teamsError || !userTeams || userTeams.length === 0) {
        return { success: true, data: [] };
    }

    const teamIds = userTeams.map(t => t.id);

    // 2. Get registrations for these teams
    const { data: regData, error: regError } = await supabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            registration_status,
            payment_status,
            created_at,
            team:teams (
                name
            ),
            tournament_categories (
                gender_type,
                age_categories (
                    category_name
                ),
                tournaments (
                    name
                )
            )
        `)
        .in("team_id", teamIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (regError) {
        console.error("Error fetching user registrations:", regError);
        return { success: false, error: regError.message };
    }

    interface RegistrationRow {
        id: string;
        team_id: string;
        registration_status: string;
        payment_status: string;
        created_at: string;
        team: { name: string } | null | Array<{ name: string }>;
        tournament_categories: {
            gender_type?: string;
            age_categories?: { category_name: string } | null | Array<{ category_name: string }>;
            tournaments: { name: string } | null | Array<{ name: string }>;
        } | null | Array<{
            gender_type?: string;
            age_categories?: { category_name: string } | null | Array<{ category_name: string }>;
            tournaments: { name: string } | null | Array<{ name: string }>;
        }>;
    }

    const registrations = (regData as unknown as RegistrationRow[] || []).map((item) => {
        const team = Array.isArray(item.team) ? item.team[0] : item.team;
        const teamName = team?.name || "Unknown Team";
        const category = Array.isArray(item.tournament_categories) ? item.tournament_categories[0] : item.tournament_categories;
        const tournament = category?.tournaments;
        const rawTournamentName = (Array.isArray(tournament) ? tournament[0] : tournament)?.name || "Unknown Tournament";

        const ageCategoryObj = Array.isArray(category?.age_categories) ? category.age_categories[0] : category?.age_categories;
        const ageName = ageCategoryObj?.category_name;
        const gender = category?.gender_type;

        let tournamentName = rawTournamentName;
        if (ageName) {
            const formattedGender = gender ? ` - ${gender.charAt(0).toUpperCase() + gender.slice(1)}` : "";
            tournamentName = `${rawTournamentName} ${ageName}${formattedGender}`;
        }

        return {
            id: item.id,
            team_id: item.team_id,
            team_name: teamName,
            tournament_name: tournamentName,
            registration_status: item.registration_status as 'pending' | 'approved' | 'rejected',
            payment_status: item.payment_status as 'pending' | 'paid' | 'waived' | 'failed',
            created_at: item.created_at,
        };
    });

    return { success: true, data: registrations };
}

/**
 * Get team management requests submitted by the current user.
 */
export async function getUserTeamManagementRequests(): Promise<ActionResponse<Array<{
    id: string;
    team_name: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}>>> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: true, data: [] };
    }

    const { data, error } = await adminSupabase
        .from("team_management_requests")
        .select(`
            id,
            status,
            created_at,
            team:teams (
                name
            )
        `)
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching team management requests:", error);
        return { success: false, error: error.message };
    }

    interface MgmtRequestRow {
        id: string;
        status: string;
        created_at: string;
        team: { name: string } | null | Array<{ name: string }>;
    }

    const requests = (data as unknown as MgmtRequestRow[] || []).map((item) => {
        const team = Array.isArray(item.team) ? item.team[0] : item.team;
        return {
            id: item.id,
            team_name: team?.name || "Unknown Team",
            status: item.status as 'pending' | 'approved' | 'rejected',
            created_at: item.created_at,
        };
    });

    return { success: true, data: requests };
}

/**
 * Get team management requests submitted by other users for teams in tournaments where the current user is organizer or collaborator.
 */
export async function getIncomingTeamManagementRequests(): Promise<ActionResponse<Array<{
    id: string;
    team_id: string;
    team_name: string;
    requester_name: string;
    requester_email: string;
    contact_phone: string;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}>>> {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: true, data: [] };
        }

        // 1. Get tournaments where user is organizer
        const { data: ownedTournaments } = await adminSupabase
            .from("tournaments")
            .select("id")
            .eq("organizer_id", user.id);

        // 2. Get tournaments where user is an accepted collaborator
        const { data: collabTournaments } = await adminSupabase
            .from("tournament_invitations")
            .select("tournament_id")
            .eq("user_id", user.id)
            .eq("status", "accepted");

        const tournamentIds = [
            ...(ownedTournaments || []).map(t => t.id),
            ...(collabTournaments || []).map(t => t.tournament_id)
        ];

        if (tournamentIds.length === 0) {
            return { success: true, data: [] };
        }

        // 3. Get teams registered in these tournaments
        const { data: registeredTeams } = await adminSupabase
            .from("tournament_teams")
            .select(`
                team_id,
                tournament_categories!inner (
                    tournament_id
                )
            `)
            .in("tournament_categories.tournament_id", tournamentIds);

        const teamIds = Array.from(new Set((registeredTeams || []).map(t => t.team_id)));

        if (teamIds.length === 0) {
            return { success: true, data: [] };
        }

        // 4. Get team management requests for these teams
        const { data: requests, error } = await adminSupabase
            .from("team_management_requests")
            .select(`
                id,
                team_id,
                requester_id,
                contact_phone,
                message,
                status,
                created_at
            `)
            .in("team_id", teamIds)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching incoming team management requests:", error);
            return { success: false, error: error.message };
        }

        if (!requests || requests.length === 0) {
            return { success: true, data: [] };
        }

        // 5. Gather team names
        const uniqueTeamIds = Array.from(new Set(requests.map(r => r.team_id)));
        const { data: teamsData } = await adminSupabase
            .from("teams")
            .select("id, name")
            .in("id", uniqueTeamIds);
        const teamMap = new Map((teamsData || []).map(t => [t.id, t.name]));

        // 6. Gather requester profile info from public.users
        const uniqueRequesterIds = Array.from(new Set(requests.map(r => r.requester_id)));
        const { data: usersData } = await adminSupabase
            .from("users")
            .select("id, full_name, email")
            .in("id", uniqueRequesterIds);
        const userMap = new Map((usersData || []).map(u => [u.id, { name: u.full_name, email: u.email }]));

        const formatted = requests.map((item) => {
            const teamName = teamMap.get(item.team_id) || "Unknown Team";
            const requester = userMap.get(item.requester_id);
            return {
                id: item.id,
                team_id: item.team_id,
                team_name: teamName,
                requester_name: requester?.name || "Unknown User",
                requester_email: requester?.email || "",
                contact_phone: item.contact_phone,
                message: item.message,
                status: item.status as 'pending' | 'approved' | 'rejected',
                created_at: item.created_at,
            };
        });

        return { success: true, data: formatted };
    } catch (error) {
        console.error("Unexpected error in getIncomingTeamManagementRequests:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Approve a team management request, transferring team ownership (user_id) to the requester.
 */
export async function approveTeamManagementRequest(
    requestId: string
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // 1. Fetch the request details
        const { data: request, error: fetchError } = await adminSupabase
            .from("team_management_requests")
            .select("team_id, requester_id, status")
            .eq("id", requestId)
            .single();

        if (fetchError || !request) {
            return { success: false, error: "Request not found" };
        }

        if (request.status !== "pending") {
            return { success: false, error: "Request is already processed" };
        }

        // 2. Update request status to approved
        const { error: updateReqError } = await adminSupabase
            .from("team_management_requests")
            .update({ status: "approved" })
            .eq("id", requestId);

        if (updateReqError) {
            return { success: false, error: updateReqError.message };
        }

        // 3. Update the team owner (user_id) to the requester_id
        const { error: updateTeamError } = await adminSupabase
            .from("teams")
            .update({ user_id: request.requester_id })
            .eq("id", request.team_id);

        if (updateTeamError) {
            return { success: false, error: updateTeamError.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error in approveTeamManagementRequest:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

/**
 * Reject a team management request.
 */
export async function rejectTeamManagementRequest(
    requestId: string
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // 1. Update request status to rejected
        const { error } = await adminSupabase
            .from("team_management_requests")
            .update({ status: "rejected" })
            .eq("id", requestId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error in rejectTeamManagementRequest:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

