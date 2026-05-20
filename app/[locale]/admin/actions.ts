"use server";

import {  createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, AuditLog, Tournament } from "@/types";
import { logActivity } from "@/lib/audit";

import { requireAdminAuth } from "@/lib/admin-auth";

// --- Users ---

export async function getAdminStats() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { totalUsers: 0, activeTournaments: 0, totalRevenue: 0, proUsers: 0 };

    const supabase = createAdminClient();

    // Total Users
    const { count: totalUsers } = await supabase.from("users").select("*", { count: 'exact', head: true });

    // Active Tournaments
    const { count: activeTournaments } = await supabase.from("tournaments").select("*", { count: 'exact', head: true }).eq("status", "active");

    // Total Revenue
    const { data: payments } = await supabase.from("payments").select("amount").eq("status", "success");
    const totalRevenue = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    // Pro Users (users with a success payment for monthly/yearly)
    const { data: proPayments } = await supabase.from("payments").select("user_id").eq("status", "success").in("plan", ["monthly", "yearly"]);
    const proUsers = new Set(proPayments?.map(p => p.user_id)).size || 0;

    return {
        totalUsers: totalUsers || 0,
        activeTournaments: activeTournaments || 0,
        totalRevenue,
        proUsers
    };
}

export async function getUsers() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return [];

    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, role")
        .limit(5000);

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data;
}

export async function updateUserRole(userId: string, newRole: string): Promise<ActionResponse> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const { error } = await auth.supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('UPDATE_USER_ROLE', 'user', userId, { new_role: newRole, by_admin: auth.user.id });
    revalidatePath("/admin");
    return { success: true };
}

export async function getGlobalPlayers() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return [];

    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();
    const { data: players, error } = await supabase
        .from("global_players")
        .select("*")
        .order("name", { ascending: true })
        .limit(1000);

    if (error) {
        console.error("Error fetching global players:", error);
        return [];
    }

    return players;
}

export async function createGlobalPlayer(name: string, data: Record<string, unknown> = {}): Promise<ActionResponse> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const { data: player, error } = await auth.supabase
        .from("global_players")
        .insert({
            name,
            ...data,
            created_by: auth.user.id
        })
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('CREATE_GLOBAL_PLAYER', 'global_player', player.id, { name });
    revalidatePath("/admin/players");
    return { success: true };
}

export async function getAuditLogsWithUsers() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return [];

    const { data: logs, error } = await auth.supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

    if (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }

    const users = await getUsers();

    return logs.map((log: AuditLog) => {
        const user = users?.find((u: { id: string; email?: string | null }) => u.id === log.user_id);
        return {
            ...log,
            user: user ? { email: user.email } : undefined
        };
    });
}

export async function getSupabaseAuthAuditLogs() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return [];

    console.log("[DEBUG] Fetching Auth Audit Logs...");

    // Call the RPC function we added to the database
    const { data: logs, error } = await auth.supabase.rpc('admin_get_auth_logs').limit(5000);

    if (error) {
        console.error("[ERROR] fetching Supabase auth audit logs:", error);
        // Instead of swallowing the error, return a pseudo-log with the error message
        // so we can see it directly in the UI for debugging.
        return [{
            id: 'error-id',
            payload: { error: error.message, details: error.details, code: error.code },
            ip_address: 'System',
            created_at: new Date().toISOString()
        }];
    }

    console.log("[DEBUG] Successfully fetched auth logs, count:", logs?.length);
    return logs || [];
}

// --- Tournaments ---

export async function getAllTournaments() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return [];

    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();

    const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select('*')
        .order("created_at", { ascending: false })
        .limit(5000);

    if (error) {
        console.error("Error fetching tournaments:", error);
        return [];
    }

    // Fetch users for mapping
    const { data: users } = await supabase
        .from("users")
        .select("id, email, full_name");

    const userMap = new Map(users?.map((u: { id: string; email?: string | null; full_name?: string | null }) => [u.id, u]) || []);

    // Map profile to owner_email for convenience
    return tournaments.map((t: any) => {
        const userId = t.organizer_id || t.user_id;
        const user = userMap.get(userId);
        return {
            ...t,
            user_id: userId,
            format: 'knockout',
            sport: 'football',
            owner_email: user?.email || 'Unknown',
            profiles: user ? { email: user.email, full_name: user.full_name } : null
        };
    });
}

export async function deleteTournamentAsAdmin(tournamentId: string): Promise<ActionResponse> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const { error } = await auth.supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('DELETE_TOURNAMENT_ADMIN', 'tournament', tournamentId, { by_admin: auth.user.id });
    revalidatePath("/admin");
    return { success: true };
}
