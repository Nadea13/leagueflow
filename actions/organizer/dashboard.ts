'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { ensureProfileExists } from "@/lib/profile";
import { initTournamentStructure } from "@/lib/fixture-utils";
import { getUserSubscriptionPlan } from "@/actions/common/user";

export async function createTournament(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const name = formData.get("name") as string;
        const format = formData.get("format") as string;
        const description = formData.get("description") as string;
        const start_date = formData.get("start_date") as string;
        const end_date = formData.get("end_date") as string;
        const number_of_pitches = parseInt(formData.get("number_of_pitches") as string) || 1;
        const document_deadline = formData.get("document_deadline") as string;
        let max_teams = parseInt(formData.get("max_teams") as string) || 8;
        let advancing_teams = parseInt(formData.get("advancing_teams") as string) || null;

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Just-in-time profile creation safety
        const profileCreated = await ensureProfileExists(supabase, user);
        if (!profileCreated) {
            return { success: false, error: "Failed to initialize user profile. Please try again or contact support." };
        }

        if (!name || !format) {
            return { success: false, error: "Name and format are required" };
        }

        // Check Pro Status for Team Limit
        const userPlan = await getUserSubscriptionPlan();
        const isPro = userPlan === 'monthly' || userPlan === 'yearly';

        if (!isPro && max_teams > 8) {
            max_teams = 8;
        }

        const { data: tournament, error } = await supabase.from("tournaments").insert({
            user_id: user.id,
            name,
            format,
            description: description || null,
            start_date: start_date || null,
            end_date: end_date || null,
            number_of_pitches,
            max_teams,
            advancing_teams,
            document_deadline: document_deadline || null,
            created_at: new Date().toISOString(),
        }).select().single();

        if (error) {
            console.error("Create tournament error:", error);
            return { success: false, error: error.message };
        }

        // --- AUTOMATED PRE-PLANNING ---
        // Automatically generate brackets/fixtures immediately after creation (ONLY for knockout)
        if (format === 'knockout') {
            try {
                await initTournamentStructure(tournament.id, supabase);
            } catch (genError) {
                console.error("Auto-generation failed:", genError);
            }
        }
        // ------------------------------

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

export async function getDashboardTournaments(query?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch Owned Tournaments
    let ownedQuery = supabase
        .from("tournaments")
        .select(`
            id, name, format, description, status, created_at, user_id, start_date, end_date, number_of_pitches, max_teams,
            tournament_teams(count),
            payments(plan, status)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (query) {
        ownedQuery = ownedQuery.ilike("name", `%${query}%`);
    }

    const { data: ownedTournaments } = await ownedQuery;

    // Fetch Shared Tournaments (where user is an accepted collaborator)
    const { data: sharedMemberships } = await supabase
        .from("tournament_members")
        .select(`
            tournament_id,
            role,
            tournaments!inner (
                id,
                name,
                format,
                status,
                created_at,
                user_id,
                start_date,
                end_date,
                number_of_pitches,
                max_teams,
                tournament_teams(count),
                payments(plan, status)
            )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

    // Filter shared tournaments by query locally since the nested structure makes it tricky to filter at the DB level easily
    let sharedTournaments = (sharedMemberships || [])
        .map((m: any) => ({ ...m.tournaments, role: m.role }))
        .filter((t: any) => t && t.id && t.user_id !== user.id);

    if (query) {
        const lowerQuery = query.toLowerCase();
        sharedTournaments = sharedTournaments.filter((t: any) => t.name?.toLowerCase().includes(lowerQuery));
    }

    // Merge and Sort
    const tournaments = [
        ...(ownedTournaments || []).map(t => ({
            ...t,
            role: 'owner',
            current_teams: (t as any).tournament_teams?.[0]?.count || 0,
            plan: (t as any).payments?.some((p: any) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament')) ? 'tournament' : 'free'
        })),
        ...sharedTournaments.map(t => ({
            ...t,
            current_teams: (t as any).tournament_teams?.[0]?.count || 0,
            plan: (t as any).payments?.some((p: any) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament')) ? 'tournament' : 'free'
        }))
    ].sort((a, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return tournaments;
}

export async function registerAsOrganizer(): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const { error } = await supabase
            .from("profiles")
            .update({ role: 'organizer' })
            .eq("id", user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
