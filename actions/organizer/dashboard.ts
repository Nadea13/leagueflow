'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, TournamentStatus, SportType } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { ensureProfileExists } from "@/lib/profile";
import { initTournamentStructure } from "@/lib/fixture-utils";

export async function createTournament(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const name = formData.get("name") as string;
        const format = formData.get("format") as string;
        const sport = (formData.get("sport") as string) || 'football';
        const description = formData.get("description") as string;
        const start_date = formData.get("start_date") as string;
        const end_date = formData.get("end_date") as string;
        const number_of_pitches = parseInt(formData.get("number_of_pitches") as string) || 1;
        const document_deadline = formData.get("document_deadline") as string;
        const max_teams = parseInt(formData.get("max_teams") as string) || 8;
        const advancing_teams = parseInt(formData.get("advancing_teams") as string) || null;

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
        // Pro locks removed for all users

        const { data: tournament, error } = await supabase.from("tournaments").insert({
            user_id: user.id,
            name,
            format,
            sport,
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
    } catch (_error) {
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
            id, name, format, sport, description, status, is_registration_open, created_at, user_id, start_date, end_date, number_of_pitches, max_teams,
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
                sport,
                status,
                is_registration_open,
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

    interface TournamentWithCount extends Record<string, unknown> {
        id: string;
        name: string;
        status: TournamentStatus;
        format: string;
        sport: SportType;
        description: string | null;
        is_registration_open: boolean;
        plan?: 'free' | 'tournament' | 'monthly' | 'yearly';
        user_id: string;
        created_at: string;
        tournament_teams: { count: number }[];
        payments: { plan: string; status: string }[];
    }

    // Filter shared tournaments by query locally since the nested structure makes it tricky to filter at the DB level easily
    let sharedTournaments = (sharedMemberships || [])
        .map((m: { role: string; tournaments: unknown }) => ({ ...(m.tournaments as TournamentWithCount), role: m.role }))
        .filter((t: TournamentWithCount) => t && t.id && t.user_id !== user.id);

    if (query) {
        const lowerQuery = query.toLowerCase();
        sharedTournaments = sharedTournaments.filter((t: TournamentWithCount) => t.name?.toLowerCase().includes(lowerQuery));
    }

    // Merge and Sort
    const tournaments = [
        ...(ownedTournaments || []).map(t => {
            const tournament = t as unknown as TournamentWithCount;
            return {
                ...tournament,
                role: 'owner',
                current_teams: tournament.tournament_teams?.[0]?.count || 0,
                sport: tournament.sport as SportType,
                plan: (tournament.payments?.some((p: { status: string; plan: string }) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament')) ? 'tournament' : 'free') as 'tournament' | 'free'
            };
        }),
        ...sharedTournaments.map(t => ({
            ...t,
            current_teams: t.tournament_teams?.[0]?.count || 0,
            sport: t.sport as SportType,
            plan: (t.payments?.some((p: { status: string; plan: string }) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament')) ? 'tournament' : 'free') as 'tournament' | 'free'
        }))
    ].sort((a, b) =>
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

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from("profiles")
            .update({ 
                is_organizer: true,
                role: 'organizer' 
            })
            .eq("id", user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }
}
