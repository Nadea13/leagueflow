"use server";

import { createClient } from "@/utils/supabase/server";
import { ActionResponse } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function createInviteLink(tournamentId: string): Promise<ActionResponse<{ code: string; url: string }>> {
    const supabase = await createClient();

    try {
        // 1. Get Current User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Not authenticated" };

        // 2. Check if an active invite already exists
        const { data: existing } = await supabase
            .from("tournament_invites")
            .select("code")
            .eq("tournament_id", tournamentId)
            .single();

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (existing) {
            return {
                success: true,
                data: {
                    code: existing.code,
                    url: `${baseUrl}/invite/${existing.code}`
                }
            };
        }

        // 3. Create new invite
        const code = generateCode();

        // Use 'upsert' just in case of race conditions, though 'insert' is fine.
        const { error } = await supabase
            .from("tournament_invites")
            .insert({
                tournament_id: tournamentId,
                code: code,
                role: 'editor',
                created_by: user.id
            });

        if (error) {
            console.error("Supabase Error:", error);
            // Return the specific DB error for debugging (User can remove this later)
            return { success: false, error: error.message };
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}/settings`);

        return {
            success: true,
            data: {
                code,
                url: `${baseUrl}/invite/${code}`
            }
        };

    } catch (error) {
        console.error("Server Action Error:", error);
        return { success: false, error: "Internal Error" };
    }
}

export async function joinTournament(code: string): Promise<ActionResponse> {
    const supabase = await createClient();

    try {
        // 1. Validate Code
        const { data: invite, error: inviteError } = await supabase
            .from("tournament_invites")
            .select("*, tournament:tournaments(id, name)")
            .eq("code", code)
            .single();

        if (inviteError || !invite) {
            return { success: false, error: "Invalid or expired invite code." };
        }

        // 2. Get Current User
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            // Should be handled by middleware/page protection, but double check
            return { success: false, error: "You must be logged in to join." };
        }

        // 3. Check if already a member
        const { data: existingMember } = await supabase
            .from("tournament_members")
            .select("id")
            .eq("tournament_id", invite.tournament_id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            return { success: true, message: "Already a member" }; // Client can redirect
        }

        // 4. Add Member
        const { error: joinError } = await supabase
            .from("tournament_members")
            .insert({
                tournament_id: invite.tournament_id,
                user_id: user.id,
                role: invite.role || 'editor',
                status: 'accepted'
            });

        if (joinError) {
            console.error("Error joining tournament:", joinError);
            return { success: false, error: "Failed to join tournament." };
        }

        // Success - Validation handled, client should redirect
        return { success: true, data: { tournamentId: invite.tournament_id } };

    } catch (error) {
        console.error("Error in joinTournament:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function getInviteDetails(code: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tournament_invites")
        .select(`
            *,
            tournament:tournaments(name, format)
        `)
        .eq("code", code)
        .single();

    return { data, error };
}
