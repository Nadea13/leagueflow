"use server";

import { createAdminClient } from "@/utils/supabase/server";
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

    // 1. Fetch registration data
    const { data: reg, error: fetchError } = await adminSupabase
        .from("registrations")
        .select("*")
        .eq("id", registrationId)
        .single();

    if (fetchError || !reg) {
        return { success: false, error: "Registration not found" };
    }

    if (reg.payment_status === 'PAID') {
        return { success: false, error: "Registration already approved" };
    }

    // 2. Update Registration Status
    const { error: updateError } = await adminSupabase
        .from("registrations")
        .update({ payment_status: 'PAID' })
        .eq("id", registrationId);

    if (updateError) {
        return { success: false, error: "Failed to update registration: " + updateError.message };
    }

    // 3. Create or Update Tournament Team Participation
    let teamId = reg.tournament_team_id;

    if (!teamId) {
        // Fallback for older registrations
        const { data: teamData, error: teamInsertError } = await adminSupabase
            .from("tournament_teams")
            .insert({
                tournament_id: tournamentId,
                team_id: reg.existing_team_id || null,
                user_id: reg.user_id,
                name: reg.team_name,
                created_at: new Date().toISOString(),
                logo_url: reg.logo_url || null,
            })
            .select()
            .single();

        if (teamInsertError) {
            console.error("Team insert error:", teamInsertError);
            return { success: false, error: "Failed to create team: " + teamInsertError.message };
        }
        teamId = teamData.id;

        // Link Registration to the created Participation
        await adminSupabase
            .from("registrations")
            .update({ tournament_team_id: teamId })
            .eq("id", registrationId);
            
        // Copy Players for fallback case
        if (reg.existing_team_id) {
            const { data: sourcePlayers } = await adminSupabase
                .from("players")
                .select("*")
                .or(`team_id.eq.${reg.existing_team_id},global_team_id.eq.${reg.existing_team_id}`);

            if (sourcePlayers && sourcePlayers.length > 0) {
                const playersToInsert = sourcePlayers.map(p => ({
                    team_id: teamId,
                    global_team_id: null,
                    name: p.name,
                    number: p.number,
                    position: p.position,
                    global_player_id: p.global_player_id,
                    created_at: new Date().toISOString()
                }));
                await adminSupabase.from("players").insert(playersToInsert);
            }
        }
    }

    // 4. Create Team Payment for Financial Summary
    const { data: tournament } = await adminSupabase
        .from("tournaments")
        .select("registration_fee")
        .eq("id", tournamentId)
        .single();

    await adminSupabase
        .from("team_payments")
        .upsert({
            tournament_id: tournamentId,
            team_id: teamId,
            amount: Number(tournament?.registration_fee || 0),
            status: 'paid',
            paid_at: new Date().toISOString(),
            notes: `Registration Ref: ${reg.trans_ref}`,
        }, {
            onConflict: 'tournament_id,team_id'
        });

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
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

    const { error } = await adminSupabase
        .from("registrations")
        .update({ payment_status: 'REJECTED' })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to reject registration: " + error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, message: "Registration rejected" };
}
