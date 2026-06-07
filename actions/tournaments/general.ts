"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse, SportType, TournamentStatus } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { validateTournamentAccess } from "@/lib/security";
import { validateUploadedFile } from "@/lib/file-validation";

export async function addTeam(
    tournamentId: string,
    prevState: unknown,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const contact_name = formData.get("contact_name") as string;
    const contact_phone = formData.get("contact_phone") as string;
    const contact_email = formData.get("contact_email") as string;
    const logoFile = formData.get("logo") as File;
    const logoUrlInput = formData.get("logo_url") as string;
    const requestedCategoryId = formData.get("tournament_category_id") as string | null;

    if (!name) {
        return { success: false, error: "Team name is required" };
    }

    // Security Check: Ensure user is authorized
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    const user = access.user;

    // Fetch tournament data: sport_id, registration_fee
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("sport_id, registration_fee")
        .eq("id", tournamentId)
        .single();

    // Keep team additions scoped to the builder category that initiated them.
    let categoryQuery = supabase
        .from("tournament_categories")
        .select("id")
        .eq("tournament_id", tournamentId)
        .is("deleted_at", null);

    categoryQuery = requestedCategoryId
        ? categoryQuery.eq("id", requestedCategoryId)
        : categoryQuery.order("created_at", { ascending: true }).limit(1);

    const { data: tournamentCategory } = await categoryQuery.maybeSingle();

    if (!tournamentCategory) {
        return { success: false, error: "Tournament category setup not found" };
    }

    let logo_url = logoUrlInput || null;

    // Handle File Upload if URL is not provided
    if (!logo_url && logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    // Insert into global teams table
    const { data: globalTeam, error: globalTeamError } = await supabase
        .from("teams")
        .insert({
            name,
            sport_id: tournament?.sport_id,
            user_id: user.id,
            description: description || '',
            contact_name: contact_name || '',
            contact_phone: contact_phone || '',
            contact_email: contact_email || '',
            logo_img: logo_url || null,
            is_roster_locked: false,
        })
        .select("id")
        .single();

    if (globalTeamError) {
        console.error("Global team insert failed", globalTeamError);
        return { success: false, error: `Failed to create team: ${globalTeamError.message}` };
    }

    const { error } = await supabase.from("tournament_teams").insert({
        tournament_category_id: tournamentCategory?.id,
        team_id: globalTeam.id,
        payment_status: 'paid',
        slip_img: null,
        registration_status: 'approved',
        remark: null,
        created_at: new Date().toISOString(),
    }).select().single();

    if (error) {
        // Rollback global team if tournament_teams insert fails
        await supabase.from("teams").delete().eq("id", globalTeam.id);
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('ADD_TEAM', 'tournament', tournamentId, { team_name: name });
    return { success: true };
}

export async function assignTeamGroup(
    teamId: string,
    groupName: string | null,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    // Group name is removed in tournament_teams, stub to return success: true
    return { success: true };
}

export async function updateTeam(
    teamId: string,
    formData: FormData,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const contact_name = formData.get("contact_name") as string;
    const contact_phone = formData.get("contact_phone") as string;
    const logoFile = formData.get("logo") as File;
    const existingLogoUrl = formData.get("existing_logo_url") as string;

    let logo_url = existingLogoUrl;

    // Handle File Upload
    if (logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${tournamentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('team-logos')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('team-logos')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    // Get team_id from tournament_teams
    const { data: registration } = await supabase
        .from("tournament_teams")
        .select("team_id")
        .eq("id", teamId)
        .single();

    if (!registration || !registration.team_id) {
        return { success: false, error: "Team registration not found" };
    }

    const updateData: Record<string, string | null> = {
        name,
        description: description || null,
        logo_img: logo_url || null
    };
    if (contact_name) updateData.contact_name = contact_name;
    if (contact_phone) updateData.contact_phone = contact_phone;

    const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", registration.team_id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('UPDATE_TEAM', 'team', registration.team_id, { name, tournament_id: tournamentId });
    return { success: true };
}

export async function deleteTeam(teamId: string, tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Fetch the tournament_team to get its global team_id (if any)
    const { data: team } = await supabase
        .from("tournament_teams")
        .select("team_id")
        .eq("id", teamId)
        .single();

    const now = new Date().toISOString();

    // 1. Soft-delete the tournament_team
    const { error: ttError } = await adminSupabase
        .from("tournament_teams")
        .update({ deleted_at: now })
        .eq("id", teamId);

    if (ttError) {
        return { success: false, error: ttError.message };
    }

    const globalTeamId = team?.team_id || teamId;

    // Fetch player_ids from player_sports
    const { data: psRecords } = await adminSupabase
        .from("player_sports")
        .select("player_id")
        .or(`team_id.eq.${globalTeamId},team_id.eq.${teamId}`);

    // 2. Soft-delete player_sports
    await adminSupabase
        .from("player_sports")
        .update({ deleted_at: now })
        .or(`team_id.eq.${globalTeamId},team_id.eq.${teamId}`);

    // 3. Soft-delete players
    if (psRecords && psRecords.length > 0) {
        const playerIds = psRecords.map((r: { player_id: string }) => r.player_id);
        await adminSupabase
            .from("players")
            .update({ deleted_at: now })
            .in("id", playerIds);
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('DELETE_TEAM', 'team', globalTeamId, { tournament_id: tournamentId });
    return { success: true };
}

export async function updateTournament(
    tournamentId: string,
    prevState: unknown,
    formData: FormData
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();
    const formType = formData.get("form_type") as string;
    const updateData: Record<string, unknown> = {};

    if (formType === 'general' || !formType) {
        if (formData.has("name")) updateData.name = formData.get("name") as string;
        if (formData.has("status")) updateData.status = formData.get("status") as string;
        if (formData.has("description")) updateData.description = formData.get("description") as string;
        if (formData.has("start_date")) updateData.start_date = formData.get("start_date") as string || null;
        if (formData.has("end_date")) updateData.end_date = formData.get("end_date") as string || null;
        if (formData.has("document_deadline")) updateData.document_deadline = formData.get("document_deadline") as string || null;
    }

    if (formType === 'registration' || !formType) {
        if (formType === 'registration') {
            updateData.is_registration_open = formData.get("is_registration_open") === 'true';
        } else if (formData.has("is_registration_open")) {
            updateData.is_registration_open = formData.get("is_registration_open") === 'true';
        }

        if (formData.has("registration_fee")) updateData.registration_fee = Number(formData.get("registration_fee") || 0);
        if (formData.has("bank_name")) updateData.bank_name = formData.get("bank_name") as string;
        if (formData.has("bank_account_name")) updateData.bank_account_name = formData.get("bank_account_name") as string;
        if (formData.has("bank_account_number")) updateData.bank_account_number = formData.get("bank_account_number") as string;
    }

    if (formType === 'venue' || !formType) {
        if (formData.has("location_name")) updateData.location_name = formData.get("location_name") as string || null;
        if (formData.has("google_map_url")) updateData.google_map_url = formData.get("google_map_url") as string || null;
    }

    // Resolve category and update max_teams
    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (category && formData.has("max_teams")) {
        const max_teams = Number(formData.get("max_teams") || 8);
        await supabase
            .from("tournament_categories")
            .update({ max_teams })
            .eq("id", category.id);
    }

    if (Object.keys(updateData).length === 0) {
        return { success: true };
    }

    if (updateData.name === "") {
        return { success: false, error: "Tournament name is required" };
    }

    const { error } = await supabase
        .from("tournaments")
        .update(updateData)
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    await logActivity('UPDATE_TOURNAMENT', 'tournament', tournamentId, updateData);
    return { success: true };
}

export async function deleteTournament(tournamentId: string) {
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase
        .from("tournaments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", tournamentId);

    if (error) {
        return { success: false, error: error.message };
    }

    await logActivity('DELETE_TOURNAMENT', 'tournament', tournamentId, {});

    redirect("/dashboard/tournaments");
}

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

        const { ensureProfileExists } = await import("@/lib/profile");
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
            await supabase.from("tournament_invitations").insert({
                tournament_id: tournament.id,
                user_id: user.id,
                email: user.email,
                role: 'co_organizer',
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
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (query) {
        ownedQuery = ownedQuery.ilike("name", `%${query}%`);
    }

    const { data: ownedTournaments } = await ownedQuery;

    // Fetch Shared Tournaments (where user is an accepted collaborator)
    const { data: sharedMemberships } = await supabase
        .from("tournament_invitations")
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
                sports:sport_id(sport_name),
                deleted_at
            )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .is("deleted_at", null)
        .is("tournaments.deleted_at", null);

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
                .from("tournament_invitations")
                .select("role")
                .eq("tournament_id", tournamentId)
                .eq("user_id", user.id)
                .eq("status", "accepted")
                .in("role", ["co_organizer", "staff"])
                .is("deleted_at", null)
                .maybeSingle();
            
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
    } catch (error) {
        console.error("Unexpected error in createTournamentCategory:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

