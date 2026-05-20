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
        const sport_id = formData.get("sport_id") as string;
        const description = formData.get("description") as string;
        const start_date = formData.get("start_date") as string;
        const end_date = formData.get("end_date") as string;
        const document_deadline = formData.get("document_deadline") as string;

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Just-in-time profile creation safety
        const profileCreated = await ensureProfileExists(supabase, user);
        if (!profileCreated) {
            return { success: false, error: "Failed to initialize user profile. Please try again or contact support." };
        }

        if (!name) {
            return { success: false, error: "Name is required" };
        }

        if (!sport_id) {
            return { success: false, error: "Sport is required" };
        }

        if (!start_date || !end_date || !document_deadline) {
            return { success: false, error: "Dates and document deadline are required" };
        }

        const { data: tournament, error } = await supabase.from("tournaments").insert({
            organizer_id: user.id,
            sport_id,
            name,
            description: description || null,
            start_date,
            end_date,
            document_deadline,
        }).select().single();

        if (error) {
            console.error("Create tournament error:", error);
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

        await logActivity('CREATE_TOURNAMENT', 'tournament', tournament.id, { name });

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
            id, name, description, status, is_registration_open, created_at, organizer_id, start_date, end_date, sport_id, logo_img,
            sports:sport_id(sport_name)
        `)
        .eq("organizer_id", user.id)
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
                description,
                status,
                is_registration_open,
                created_at,
                organizer_id,
                start_date,
                end_date,
                sport_id,
                logo_img,
                sports:sport_id(sport_name)
            )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

    interface TournamentWithCount extends Record<string, unknown> {
        id: string;
        name: string;
        status: TournamentStatus;
        format?: string;
        sport?: SportType;
        description: string | null;
        is_registration_open: boolean;
        plan?: 'free' | 'tournament' | 'monthly' | 'yearly';
        organizer_id: string;
        created_at: string;
        sports?: { sport_name: string };
        payments?: { plan: string; status: string }[];
        logo_img?: string | null;
    }

    // Filter shared tournaments by query locally since the nested structure makes it tricky to filter at the DB level easily
    let sharedTournaments = (sharedMemberships || [])
        .map((m: { role: string; tournaments: unknown }) => ({ ...(m.tournaments as TournamentWithCount), role: m.role }))
        .filter((t: TournamentWithCount) => t && t.id && t.organizer_id !== user.id);

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
                user_id: tournament.organizer_id,
                current_teams: 0,
                format: 'knockout',
                sport: (tournament.sports?.sport_name?.toLowerCase() || 'football') as SportType,
                plan: (tournament.payments?.some((p: { status: string; plan: string }) => p.status === 'success' && (p.plan === 'tournament' || p.plan === 'per_tournament')) ? 'tournament' : 'free') as 'tournament' | 'free'
            };
        }),
        ...sharedTournaments.map(t => ({
            ...t,
            user_id: t.organizer_id,
            current_teams: 0,
            format: 'knockout',
            sport: (t.sports?.sport_name?.toLowerCase() || 'football') as SportType,
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
            .from("users")
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

export async function createTournamentCategory(
    tournamentId: string,
    ageCategoryId: number,
    genderType: string,
    maxTeams: number
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Validate that user is organizer or has admin/editor role for this tournament
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("organizer_id")
            .eq("id", tournamentId)
            .single();

        if (!tournament) {
            return { success: false, error: "Tournament not found" };
        }

        const isOwner = tournament.organizer_id === user.id;
        let isMember = false;

        if (!isOwner) {
            const { data: membership } = await supabase
                .from("tournament_members")
                .select("role")
                .eq("tournament_id", tournamentId)
                .eq("user_id", user.id)
                .eq("status", "accepted")
                .in("role", ["admin", "editor"])
                .single();
            
            if (membership) {
                isMember = true;
            }
        }

        if (!isOwner && !isMember) {
            return { success: false, error: "Unauthorized to modify this tournament" };
        }

        // Insert category
        const { data: newCategory, error } = await supabase
            .from("tournament_categories")
            .insert({
                tournament_id: tournamentId,
                age_category_id: ageCategoryId,
                gender_type: genderType,
                max_teams: maxTeams
            })
            .select()
            .single();

        if (error) {
            console.error("Create tournament category error:", error);
            return { success: false, error: error.message };
        }

        await logActivity('CREATE_TOURNAMENT_CATEGORY', 'tournament_category', newCategory.id, { 
            tournament_id: tournamentId,
            age_category_id: ageCategoryId,
            gender_type: genderType,
            max_teams: maxTeams
        });

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/${tournamentId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Unexpected error in createTournamentCategory:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

