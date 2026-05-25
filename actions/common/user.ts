'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/types";

export async function getUserSubscriptionPlan() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 'free';

    // Just-in-time profile creation safety
    await ensureProfileExists(supabase, user);

    // Check if user is an admin - Admins get Pro features by default for management
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === 'admin') {
        return 'yearly';
    }

    const { data: subscription } = await supabase
        .from("payments")
        .select("plan, subscription_expires_at")
        .eq("user_id", user.id)
        .eq("status", "success")
        .in("plan", ["monthly", "yearly", "manager_pro"])
        .is("tournament_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (subscription) {
        const now = new Date();
        const expiresAt = subscription.subscription_expires_at
            ? new Date(subscription.subscription_expires_at)
            : null;

        return (expiresAt && now > expiresAt) ? 'free' : (subscription.plan || 'free');
    }

    return 'free';
}

export async function getUserTeamLimit() {
    const plan = await getUserSubscriptionPlan();
    if (plan === 'free') return 1;
    return Infinity; // Pro plans have no limit
}

export async function getUserDashboardMetrics() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { totalTeams: 0, assignedTeams: 0, pendingRegistrations: 0 };

    // 1. Get user owned teams
    const { data: userOwnedTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null);
    
    const ownedTeamIds = userOwnedTeams?.map(t => t.id) || [];

    // 2. Get tournaments owned by the user
    const { data: ownedTournaments } = await supabase
        .from("tournaments")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null);
    
    const ownedTournamentIds = ownedTournaments?.map(t => t.id) || [];

    // 3. Find teams registered in user's tournaments
    let organizerTeamIds: string[] = [];
    if (ownedTournamentIds.length > 0) {
        const { data: orgTeamsData } = await supabase
            .from("tournament_teams")
            .select(`
                team_id,
                tournament_categories!inner (
                    tournament_id
                )
            `)
            .in("tournament_categories.tournament_id", ownedTournamentIds)
            .is("deleted_at", null);
        
        if (orgTeamsData) {
            organizerTeamIds = orgTeamsData.map((t: any) => t.team_id);
        }
    }

    // Combine to get unique set of total teams
    const totalTeamIds = new Set([...ownedTeamIds, ...organizerTeamIds]);

    // 4. Find how many of total teams are assigned to a tournament category
    let assignedCount = 0;
    if (totalTeamIds.size > 0) {
        const { count } = await supabase
            .from("tournament_teams")
            .select("team_id", { count: 'exact', head: true })
            .in("team_id", Array.from(totalTeamIds))
            .is("deleted_at", null);
        assignedCount = count || 0;
    }

    // 5. Find pending registrations for the user's owned teams
    let pendingCount = 0;
    if (ownedTeamIds.length > 0) {
        const { count } = await supabase
            .from("tournament_teams")
            .select("id", { count: 'exact', head: true })
            .in("team_id", ownedTeamIds)
            .eq("payment_status", "pending")
            .is("deleted_at", null);
        pendingCount = count || 0;
    }

    return {
        totalTeams: totalTeamIds.size,
        assignedTeams: assignedCount,
        pendingRegistrations: pendingCount
    };
}

export async function getUserProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    return profile;
}

export async function updateProfile(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();
    const fullName = formData.get("fullName") as string;

    const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Direct database update using service role client as well
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const adminSupabase = createAdminClient();
        await adminSupabase
            .from("users")
            .update({ full_name: fullName })
            .eq("id", user.id);
    }

    revalidatePath("/", "layout");
    return { success: true };
}

export async function deleteAccount() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // In a real app, you might want to call a service role function to delete the user from Auth
    // For now, we sign out and the profile deletion would be handled by your business logic/DB cascades
    // or a specialized RPC if available.
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error("Error signing out during deletion:", error);
    }

    redirect("/");
}

export async function getMasterPlayer() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("master_players")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching master player profile:", error);
        return null;
    }
    return data;
}

export async function createMasterPlayer(formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const gender = formData.get("gender") as string;
        const birthday = formData.get("birthday") as string;
        const tel = formData.get("tel") as string;

        if (!firstName || !lastName || !gender || !birthday) {
            return { success: false, error: "First name, last name, gender, and birthday are required" };
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: user.id,
                first_name: firstName,
                last_name: lastName,
                gender,
                birthday,
                tel,
                status: 'active',
                verified: true
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating master player:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to create master player profile" };
    }
}

export async function getAllPublicTournaments() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tournaments")
        .select(`
            id, name, logo_img, cover_img, description, location_name, google_map_url, status, start_date, end_date, document_deadline, registration_fee, bank_name, bank_account_name, bank_account_number
        `)
        .in("status", ["upcoming", "ongoing"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all tournaments:", error);
        return [];
    }
    return data || [];
}

export async function searchMasterPlayers(query: string) {
    const adminSupabase = createAdminClient();

    let dbQuery = adminSupabase
        .from("master_players")
        .select("*");

    if (query && query.trim().length > 0) {
        // Search in both first_name and last_name
        dbQuery = dbQuery.or(`first_name.ilike.%${query.trim()}%,last_name.ilike.%${query.trim()}%`);
    }

    const { data, error } = await dbQuery
        .order("first_name", { ascending: true })
        .limit(20);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}
