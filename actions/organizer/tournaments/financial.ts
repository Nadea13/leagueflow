"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, TeamPayment } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";

export async function getTeamPayments(tournamentId: string): Promise<ActionResponse<TeamPayment[]>> {
    const access = await validateTournamentAccess(tournamentId, 'viewer');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("team_payments")
        .select(`
            *,
            tournament_teams (name, logo_url)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at");

    if (error) {
        return { success: false, error: error.message };
    }

    const payments = (data || []).map((p: Record<string, unknown> & { tournament_teams?: { name: string; logo_url: string | null } | null }) => ({
        ...p,
        team: p.tournament_teams ? { name: p.tournament_teams.name, logo_url: p.tournament_teams.logo_url } : null,
    }));

    return { success: true, data: payments as TeamPayment[] };
}

export async function updateTeamPayment(
    tournamentId: string,
    teamId: string,
    status: 'pending' | 'paid' | 'waived',
    amount?: number,
    notes?: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase
        .from("team_payments")
        .upsert({
            tournament_id: tournamentId,
            team_id: teamId,
            status,
            amount: amount ?? 0,
            notes: notes || null,
            paid_at: status === 'paid' ? new Date().toISOString() : null,
        }, {
            onConflict: 'tournament_id,team_id'
        });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function getFinancialSummary(tournamentId: string): Promise<ActionResponse<{
    totalTeams: number;
    paidTeams: number;
    pendingTeams: number;
    waivedTeams: number;
    totalExpected: number;
    totalReceived: number;
}>> {
    const access = await validateTournamentAccess(tournamentId, 'viewer');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("team_payments")
        .select("*")
        .eq("tournament_id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    const payments = data || [];
    const summary = {
        totalTeams: payments.length,
        paidTeams: payments.filter(p => p.status === 'paid').length,
        pendingTeams: payments.filter(p => p.status === 'pending').length,
        waivedTeams: payments.filter(p => p.status === 'waived').length,
        totalExpected: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        totalReceived: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    };

    return { success: true, data: summary };
}
