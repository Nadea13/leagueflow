import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";


/**
 * Validates that the current user has administrative or editor access to a tournament.
 * @param tournamentId The ID of the tournament to check access for.
 * @returns An object containing the user and their role, or an error response.
 */
export async function validateTournamentAccess(
    tournamentId: string,
    requiredRole: 'admin' | 'editor' | 'viewer' = 'editor'
): Promise<
    | { success: true; user: User; role: 'admin' | 'editor' | 'viewer' }
    | { success: false; error: string; user?: undefined; role?: undefined }
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    // 1. Check if the user is the owner (Admin)
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("organizer_id")
        .eq("id", tournamentId)
        .single();

    if (tournament && tournament.organizer_id === user.id) {
        return { success: true, user, role: 'admin' };
    }

    // 2. Check if the user is an accepted collaborator
    const { data: member } = await supabase
        .from("tournament_members")
        .select("role")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .single();

    if (!member) {
        return { success: false, error: "Access denied: You are not a collaborator for this tournament" };
    }

    // Role Hierarchy Check
    // admin (0) > editor (1) > viewer (2)
    const roleWeights = { admin: 0, editor: 1, viewer: 2 };
    const userRole = member.role as 'editor' | 'viewer';
    
    if (roleWeights[userRole] > roleWeights[requiredRole]) {
        return { 
            success: false, 
            error: `Access denied: Required role '${requiredRole}', but you are a '${userRole}'` 
        };
    }

    return { success: true, user, role: userRole };
}
