"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types";
import { logActivity } from "@/lib/audit";

// --- Users ---

export async function getUsers() {
    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role");

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data;
}

export async function updateUserRole(userId: string, newRole: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (currentProfile?.role !== 'admin') {
        return { success: false, error: "Forbidden: Admins only" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('UPDATE_USER_ROLE', 'user', userId, { new_role: newRole, by_admin: user.id });
    revalidatePath("/admin");
    return { success: true };
}

export async function getAuditLogsWithUsers() {
    const supabase = await createClient();

    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }

    const users = await getUsers();

    return logs.map((log: any) => {
        const user = users?.find((u: any) => u.id === log.user_id);
        return {
            ...log,
            user: user ? { email: user.email } : undefined
        };
    });
}

// --- Tournaments ---

export async function getAllTournaments() {
    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();

    const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select('*')
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching tournaments:", error);
        return [];
    }

    // Fetch users for mapping
    const { data: users } = await supabase
        .from("profiles")
        .select("id, email, full_name");

    const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);

    // Map profile to owner_email for convenience
    return tournaments.map((t: any) => {
        const user = userMap.get(t.user_id);
        return {
            ...t,
            owner_email: user?.email || 'Unknown',
            profiles: user ? { email: user.email, full_name: user.full_name } : null
        };
    });
}

export async function deleteTournamentAsAdmin(tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    // Check admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (currentProfile?.role !== 'admin') {
        return { success: false, error: "Forbidden: Admins only" };
    }

    const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('DELETE_TOURNAMENT_ADMIN', 'tournament', tournamentId, { by_admin: user.id });
    revalidatePath("/admin");
    return { success: true };
}