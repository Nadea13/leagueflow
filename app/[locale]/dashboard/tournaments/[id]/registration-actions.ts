"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";

export async function approveRegistration(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check: Only the tournament owner (Admin) can approve registrations
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const adminSupabase = createAdminClient();

    // 1. Fetch registration data from tournament_teams
    const { data: reg, error: fetchError } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            payment_status,
            registration_status,
            tournament_categories!inner (
                tournament_id
            )
        `)
        .eq("id", registrationId)
        .single();

    if (fetchError || !reg) {
        return { success: false, error: "Registration not found" };
    }

    if ((reg.tournament_categories as any)?.tournament_id !== tournamentId) {
        return { success: false, error: "Registration does not belong to this tournament" };
    }

    if (reg.payment_status === 'paid' && reg.registration_status === 'approved') {
        return { success: false, error: "Registration already approved" };
    }

    // 2. Update Registration Status
    const { error: updateError } = await adminSupabase
        .from("tournament_teams")
        .update({ 
            payment_status: 'paid',
            registration_status: 'approved'
        })
        .eq("id", registrationId);

    if (updateError) {
        return { success: false, error: "Failed to update registration: " + updateError.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true, message: "Registration approved and synced!" };
}

export async function rejectRegistration(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check: Only the tournament owner (Admin) can reject registrations
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const adminSupabase = createAdminClient();

    // 1. Fetch registration data to verify tournament ownership
    const { data: reg, error: fetchError } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            tournament_categories!inner (
                tournament_id
            )
        `)
        .eq("id", registrationId)
        .single();

    if (fetchError || !reg || (reg.tournament_categories as any)?.tournament_id !== tournamentId) {
        return { success: false, error: "Registration not found" };
    }

    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({ 
            payment_status: 'rejected',
            registration_status: 'rejected'
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to reject registration: " + error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true, message: "Registration rejected" };
}
