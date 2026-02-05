'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { ActionResponse } from "@/types/index";
import { logActivity } from "@/lib/audit";

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect("/login");
}

export async function createTournament(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const name = formData.get("name") as string;
        const format = formData.get("format") as string;
        const start_date = formData.get("start_date") as string;
        const end_date = formData.get("end_date") as string;
        const number_of_pitches = parseInt(formData.get("number_of_pitches") as string) || 1;

        const { data: { user } } = await supabase.auth.getUser();

        if (!name || !format) {
            return { success: false, error: "Name and format are required" };
        }

        const { data: tournament, error } = await supabase.from("tournaments").insert({
            name,
            format,
            start_date: start_date || null,
            end_date: end_date || null,
            number_of_pitches,
            created_at: new Date().toISOString(),
        }).select().single();

        if (error) {
            return { success: false, error: error.message };
        }

        if (user) {
            await supabase.from("tournament_members").insert({
                tournament_id: tournament.id,
                user_id: user.id,
                email: user.email,
                role: 'admin',
                status: 'accepted'
            });
        }

        await logActivity('CREATE_TOURNAMENT', 'tournament', tournament.id, { name, format });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function getDashboardTournaments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch Owned Tournaments
    const { data: ownedTournaments } = await supabase
        .from("tournaments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // Fetch Shared Tournaments (where user is an accepted collaborator)
    const { data: sharedMemberships } = await supabase
        .from("tournament_members")
        .select(`
            tournament_id,
            role,
            tournaments (
                id,
                name,
                format,
                status,
                created_at,
                user_id
            )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

    const sharedTournaments = (sharedMemberships || [])
        .map((m: any) => ({ ...m.tournaments, role: m.role }))
        .filter((t: any) => t && t.id && t.user_id !== user.id);

    // Merge and Sort
    const tournaments = [
        ...(ownedTournaments || []).map(t => ({ ...t, role: 'owner' })),
        ...sharedTournaments
    ].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return tournaments;
}

export async function getUserSubscriptionPlan() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 'free';

    const { data: subscription } = await supabase
        .from("payments")
        .select("plan, subscription_expires_at")
        .eq("user_id", user.id)
        .eq("status", "success")
        .in("plan", ["monthly", "yearly"])
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
