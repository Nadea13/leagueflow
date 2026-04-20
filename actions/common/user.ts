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
        .from("profiles")
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

    // Get tournaments owned by the user
    const { data: ownedTournaments } = await supabase
        .from("tournaments")
        .select("id")
        .eq("user_id", user.id);
    
    const ownedTournamentIds = ownedTournaments?.map(t => t.id) || [];

    // Construct conditions for teams
    const teamConditions = [`user_id.eq.${user.id}`];
    if (ownedTournamentIds.length > 0) {
        teamConditions.push(`tournament_id.in.(${ownedTournamentIds.join(',')})`);
    }

    const [teamsRes, regsRes] = await Promise.all([
        supabase.from("teams").select("id, tournament_id").or(teamConditions.join(',')),
        supabase.from("registrations").select("id").eq("user_id", user.id).eq("payment_status", "PENDING")
    ]);

    const teams = teamsRes.data || [];
    const regs = regsRes.data || [];

    return {
        totalTeams: teams.length,
        assignedTeams: teams.filter(t => t.tournament_id).length,
        pendingRegistrations: regs.length
    };
}

export async function getUserProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
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

