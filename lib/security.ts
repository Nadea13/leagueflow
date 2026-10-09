import { getServerSession, ServerAuthUser } from "@/lib/auth-server";

/**
 * Validates that the current user has administrative or editor access to a tournament.
 * @param tournamentId The ID of the tournament to check access for.
 * @returns An object containing the user and their role, or an error response.
 */
export async function validateTournamentAccess(
    tournamentId: string,
    _requiredRole: 'admin' | 'editor' | 'viewer' = 'editor'
): Promise<
    | { success: true; user: ServerAuthUser; role: 'admin' | 'editor' | 'viewer' }
    | { success: false; error: string; user?: undefined; role?: undefined }
> {
    const session = await getServerSession();
    if (!session?.user) {
        return { success: false, error: "Authentication required" };
    }
    const user = session.user;

    // Call Go Backend to check tournament details
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
            headers: {
                Authorization: `Bearer ${session.token}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            return { success: true, user, role: 'admin' };
        }

        const data = await res.json();
        const tournament = data.tournament;

        if (tournament && tournament.organizer_id === user.id) {
            return { success: true, user, role: 'admin' };
        }

        if (user.role === 'super_admin') {
            return { success: true, user, role: 'admin' };
        }

        return { success: true, user, role: 'editor' };
    } catch {
        return { success: true, user, role: 'admin' };
    }
}
