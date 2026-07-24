"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse, SportType, TournamentStatus, Match } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { validateTournamentAccess } from "@/lib/security";
import { validateUploadedFile } from "@/lib/file-validation";
import { initTournamentStructure } from "@/lib/fixture-utils";
import { propagateGroupStandings, propagateKnockoutResults } from "@/actions/tournaments/matches";

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

    // Fetch tournament data: sport_id
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("sport_id")
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

    const teamId = crypto.randomUUID();
    let logo_url = logoUrlInput || null;

    // Handle File Upload if URL is not provided
    if (!logo_url && logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${teamId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('teams')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('teams')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
    }

    // Insert into global teams table
    const { data: globalTeam, error: globalTeamError } = await supabase
        .from("teams")
        .insert({
            id: teamId,
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

    // Get team_id from tournament_teams
    const { data: registration } = await supabase
        .from("tournament_teams")
        .select("team_id")
        .eq("id", teamId)
        .single();

    if (!registration || !registration.team_id) {
        return { success: false, error: "Team registration not found" };
    }

    // Handle File Upload
    if (logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${registration.team_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('teams')
            .upload(filePath, logoFile);

        if (uploadError) {
            console.error("Logo upload failed", uploadError);
            return { success: false, error: `Logo upload failed: ${uploadError.message}` };
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('teams')
                .getPublicUrl(filePath);
            logo_url = publicUrl;
        }
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
        if (formData.has("bank_name")) updateData.bank_name = formData.get("bank_name") as string;
        if (formData.has("bank_account_name")) updateData.bank_account_name = formData.get("bank_account_name") as string;
        if (formData.has("bank_account_number")) updateData.bank_account_number = formData.get("bank_account_number") as string;

        // Handle logo and cover file uploads
        const logoFile = formData.get("logo_img") as File | null;
        const coverFile = formData.get("cover_img") as File | null;

        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: `Logo: ${fileCheck.error}` };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${tournamentId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('tournaments')
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload failed", uploadError);
                return { success: false, error: `Logo upload failed: ${uploadError.message}` };
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('tournaments')
                    .getPublicUrl(filePath);
                updateData.logo_img = publicUrl;
            }
        } else if (formData.get("logo_img_remove") === 'true') {
            updateData.logo_img = null;
        }

        if (coverFile && coverFile.size > 0) {
            const fileCheck = validateUploadedFile(coverFile);
            if (!fileCheck.valid) return { success: false, error: `Cover: ${fileCheck.error}` };

            const fileExt = coverFile.name.split('.').pop();
            const fileName = `cover-${Date.now()}.${fileExt}`;
            const filePath = `${tournamentId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('tournaments')
                .upload(filePath, coverFile);

            if (uploadError) {
                console.error("Cover upload failed", uploadError);
                return { success: false, error: `Cover upload failed: ${uploadError.message}` };
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('tournaments')
                    .getPublicUrl(filePath);
                updateData.cover_img = publicUrl;
            }
        } else if (formData.get("cover_img_remove") === 'true') {
            updateData.cover_img = null;
        }
    }

    if (formType === 'registration' || !formType) {
        if (formType === 'registration') {
            updateData.is_registration_open = formData.get("is_registration_open") === 'true';
        } else if (formData.has("is_registration_open")) {
            updateData.is_registration_open = formData.get("is_registration_open") === 'true';
        }

        if (formData.has("bank_name")) updateData.bank_name = formData.get("bank_name") as string;
        if (formData.has("bank_account_name")) updateData.bank_account_name = formData.get("bank_account_name") as string;
        if (formData.has("bank_account_number")) updateData.bank_account_number = formData.get("bank_account_number") as string;
    }

    if (formType === 'venue' || !formType) {
        if (formData.has("location_name")) updateData.location_name = formData.get("location_name") as string || null;
        if (formData.has("google_map_url")) updateData.google_map_url = formData.get("google_map_url") as string || null;
    }

    // Resolve category and update max_teams or registration_fee
    const requestedCategoryId = formData.get("tournament_category_id") as string | null;
    
    let targetCategoryId = requestedCategoryId;
    if (!targetCategoryId) {
        const { data: category } = await supabase
            .from('tournament_categories')
            .select('id')
            .eq('tournament_id', tournamentId)
            .limit(1)
            .maybeSingle();
        targetCategoryId = category?.id || null;
    }

    if (targetCategoryId) {
        const catUpdate: Record<string, unknown> = {};
        if (formData.has("max_teams")) {
            catUpdate.max_teams = Number(formData.get("max_teams") || 8);
        }
        if (formData.has("registration_fee")) {
            catUpdate.registration_fee = Number(formData.get("registration_fee") || 0);
        }
        if (Object.keys(catUpdate).length > 0) {
            await supabase
                .from("tournament_categories")
                .update(catUpdate)
                .eq("id", targetCategoryId);
        }
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

        // Subscription & Limit Check
        const { getUserSubscriptionPlan } = await import("@/actions/common/user");
        const activePlan = await getUserSubscriptionPlan();
        const isUnlimitedPlan = activePlan === "yearly" || activePlan === "pro_yearly" || activePlan === "cup_yearly" || activePlan === "customs";
        const isCupPlan = activePlan === "cup";
        const isEventPlan = activePlan === "event" || activePlan === "monthly" || activePlan === "pro" || activePlan === "manager_pro";

        const { getLocale } = await import("next-intl/server");
        const locale = await getLocale();
        const isThai = locale === 'th';

        if (!isUnlimitedPlan) {
            if (isEventPlan || isCupPlan) {
                // Limit: max tournaments created in the current calendar month (Cup: 20, Event: 5)
                const maxMonthlyTournaments = isCupPlan ? 20 : 5;
                const startOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                const { count, error: countError } = await supabase
                    .from("tournaments")
                    .select("id", { count: "exact", head: true })
                    .eq("organizer_id", user.id)
                    .gte("created_at", startOfMonthStr);

                if (countError) {
                    console.error("Error counting tournaments for month:", countError);
                    return { success: false, error: "Failed to verify tournament limit." };
                }

                if (count && count >= maxMonthlyTournaments) {
                    return { 
                        success: false, 
                        error: isThai 
                            ? `แพ็คเกจ ${isCupPlan ? 'Cup' : 'Event'} สามารถสร้างทัวร์นาเมนต์ได้สูงสุด ${maxMonthlyTournaments} รายการต่อเดือนเท่านั้น` 
                            : `${isCupPlan ? 'Cup' : 'Event'} plan allows creating up to ${maxMonthlyTournaments} tournaments per month.` 
                    };
                }
            } else {
                // Free/Starter plan: max 1 tournament overall
                const { count, error: countError } = await supabase
                    .from("tournaments")
                    .select("id", { count: "exact", head: true })
                    .eq("organizer_id", user.id);

                if (countError) {
                    console.error("Error counting tournaments:", countError);
                    return { success: false, error: "Failed to verify tournament limit." };
                }

                if (count && count >= 1) {
                    return { 
                        success: false, 
                        error: isThai 
                            ? "ผู้ใช้ทั่วไปสามารถสร้างทัวร์นาเมนต์ได้สูงสุด 1 รายการเท่านั้น กรุณาอัพเกรดแพ็คเกจ" 
                            : "Free plan users can create only 1 tournament. Please upgrade your plan." 
                    };
                }
            }
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

        const logoFile = formData.get("logo_img") as File | null;
        const coverFile = formData.get("cover_img") as File | null;

        let logo_img: string | null = null;
        let cover_img: string | null = null;

        // Upload Logo
        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: `Logo: ${fileCheck.error}` };

            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${tournament.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('tournaments')
                .upload(filePath, logoFile);

            if (uploadError) {
                console.error("Logo upload failed", uploadError);
                return { success: false, error: `Logo upload failed: ${uploadError.message}` };
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('tournaments')
                    .getPublicUrl(filePath);
                logo_img = publicUrl;
            }
        }

        // Upload Cover
        if (coverFile && coverFile.size > 0) {
            const fileCheck = validateUploadedFile(coverFile);
            if (!fileCheck.valid) return { success: false, error: `Cover: ${fileCheck.error}` };

            const fileExt = coverFile.name.split('.').pop();
            const fileName = `cover-${Date.now()}.${fileExt}`;
            const filePath = `${tournament.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('tournaments')
                .upload(filePath, coverFile);

            if (uploadError) {
                console.error("Cover upload failed", uploadError);
                return { success: false, error: `Cover upload failed: ${uploadError.message}` };
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('tournaments')
                    .getPublicUrl(filePath);
                cover_img = publicUrl;
            }
        }

        // If either was uploaded, update the tournament record
        if (logo_img || cover_img) {
            const updateObj: Record<string, string> = {};
            if (logo_img) updateObj.logo_img = logo_img;
            if (cover_img) updateObj.cover_img = cover_img;

            await supabase
                .from("tournaments")
                .update(updateObj)
                .eq("id", tournament.id);
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
    maxTeams: number,
    registrationFee: number
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

        // Subscription & Limit Check
        const { getUserSubscriptionPlan } = await import("@/actions/common/user");
        const activePlan = await getUserSubscriptionPlan();
        const isUnlimitedPlan = activePlan === "yearly" || activePlan === "pro_yearly" || activePlan === "cup_yearly" || activePlan === "customs";
        const isCupPlan = activePlan === "cup";
        const isEventPlan = activePlan === "event" || activePlan === "monthly" || activePlan === "pro" || activePlan === "manager_pro";

        const { getLocale } = await import("next-intl/server");
        const locale = await getLocale();
        const isThai = locale === 'th';

        if (!isUnlimitedPlan) {
            // Count existing categories for this tournament
            const { count: categoryCount, error: categoryCountError } = await supabase
                .from("tournament_categories")
                .select("id", { count: "exact", head: true })
                .eq("tournament_id", tournamentId)
                .is("deleted_at", null);

            if (categoryCountError) {
                console.error("Error counting tournament categories:", categoryCountError);
                return { success: false, error: "Failed to verify category limit." };
            }

            const maxAllowedCategories = isCupPlan ? 5 : isEventPlan ? 3 : 1;

            if (categoryCount && categoryCount >= maxAllowedCategories) {
                return {
                    success: false,
                    error: isThai
                        ? isCupPlan
                            ? "แพ็คเกจ Cup สามารถสร้างรุ่นการแข่งขันได้สูงสุด 5 รุ่นต่อทัวร์นาเมนต์เท่านั้น"
                            : isEventPlan
                                ? "แพ็คเกจ Event สามารถสร้างรุ่นการแข่งขันได้สูงสุด 3 รุ่นต่อทัวร์นาเมนต์เท่านั้น"
                                : "ผู้ใช้ทั่วไปสามารถสร้างรุ่นการแข่งขันได้สูงสุด 1 รุ่นเท่านั้น กรุณาอัพเกรดแพ็คเกจ"
                        : isCupPlan
                            ? "Cup plan allows up to 5 categories per tournament."
                            : isEventPlan
                                ? "Event plan allows up to 3 categories per tournament."
                                : "Free plan users can create only 1 tournament category. Please upgrade your plan."
                };
            }

            const maxAllowedTeams = isCupPlan ? 128 : isEventPlan ? 32 : 12;
            if (maxTeams > maxAllowedTeams) {
                return {
                    success: false,
                    error: isThai
                        ? isCupPlan
                            ? "แพ็คเกจ Cup สามารถจำกัดจำนวนทีมได้สูงสุด 128 ทีมต่อรุ่นเท่านั้น"
                            : isEventPlan
                                ? "แพ็คเกจ Event สามารถจำกัดจำนวนทีมได้สูงสุด 32 ทีมต่อรุ่นเท่านั้น"
                                : "ผู้ใช้ทั่วไปสามารถจำกัดจำนวนทีมได้สูงสุด 12 ทีมต่อรุ่นเท่านั้น กรุณาอัพเกรดแพ็คเกจ"
                        : isCupPlan
                            ? "Cup plan allows a maximum of 128 teams per category."
                            : isEventPlan
                                ? "Event plan allows a maximum of 32 teams per category."
                                : "Free plan users can set a maximum limit of 12 teams per category. Please upgrade your plan."
                };
            }
        }

        const formattedFee = Math.round(registrationFee * 100) / 100;
        // Insert category
        const { data: newCategory, error } = await supabase
            .from("tournament_categories")
            .insert({
                tournament_id: tournamentId,
                age_category_id: ageCategoryId,
                gender_type: genderType,
                max_teams: maxTeams,
                registration_fee: formattedFee
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
            max_teams: maxTeams,
            registration_fee: registrationFee
        });

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in createTournamentCategory:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

const getScoreTotal = (scoreObj: unknown): number => {
    if (!scoreObj) return 0;
    if (typeof scoreObj === 'object' && scoreObj !== null) {
        const total = (scoreObj as Record<string, unknown>).total;
        const val = Number(total);
        return isNaN(val) ? 0 : val;
    }
    const val = Number(scoreObj);
    return isNaN(val) ? 0 : val;
};

async function getLastRound(tournamentCategoryId: string, supabase: SupabaseClient): Promise<number> {
    const { data } = await supabase
        .from('matches')
        .select('round')
        .eq('tournament_category_id', tournamentCategoryId)
        .order('round', { ascending: false })
        .limit(1)
        .single();
    return data?.round || 0;
}

export async function generateFixtures(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // Fetch category
    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) {
        return { success: false, error: "No tournament category setup found" };
    }
    const tournamentCategoryId = category.id;

    // Check if fixtures already exist and if we can regenerate
    const { data: existingMatches } = await supabase
        .from('matches')
        .select('id, home_score, away_score, status')
        .eq('tournament_category_id', tournamentCategoryId);

    const hasFixtures = existingMatches && existingMatches.length > 0;
    if (hasFixtures) {
        // Allow regeneration for all formats if no results are recorded
        const hasScores = existingMatches.some(m => {
            if (m.status === 'finished') return true;
            const homeTotal = getScoreTotal(m.home_score);
            const awayTotal = getScoreTotal(m.away_score);
            return homeTotal > 0 || awayTotal > 0;
        });

        if (hasScores) {
            return { success: false, error: "Cannot regenerate: Some matches already have results recorded." };
        }

        // Delete existing matches for regeneration
        const { error: deleteError } = await supabase
            .from('matches')
            .delete()
            .eq('tournament_category_id', tournamentCategoryId);

        if (deleteError) {
            console.error("Delete error during regeneration:", deleteError);
            return { success: false, error: "Failed to clear existing fixtures." };
        }
    }

    // Generate fixtures using utility
    const result = await initTournamentStructure(tournamentId, supabase);

    if (result.success) {
        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    }

    return result;
}

export async function generateKnockoutRound(
    tournamentId: string,
    stage: string,
    matchCount: number
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // Fetch category
    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) {
        return { success: false, error: "No tournament category setup found" };
    }
    const tournamentCategoryId = category.id;

    const lastRound = await getLastRound(tournamentCategoryId, supabase);
    const startRound = lastRound + 1;

    const matches = Array(matchCount).fill(0).map((_, i) => ({
        tournament_category_id: tournamentCategoryId,
        home_team_id: null,
        away_team_id: null,
        round: startRound,
        stage: stage,
        status: 'scheduled',
        is_manual: true,
        match_index: i + 1,
        home_score: { total: 0 },
        away_score: { total: 0 }
    }));

    const { error } = await supabase.from('matches').insert(matches);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatchScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    tournamentId: string
): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    // 1. Update Scores & Fetch Updated Record
    const { data: updatedMatch, error } = await supabase
        .from("matches")
        .update({
            home_score: { total: homeScore },
            away_score: { total: awayScore },
        })
        .eq("id", matchId)
        .select('*')
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    // 2. Auto-Advance Winner (Knockout Only)
    if (updatedMatch && updatedMatch.stage !== 'league' && updatedMatch.stage !== 'group') {
        let winnerId = null;

        const homeTotal = getScoreTotal(updatedMatch.home_score);
        const awayTotal = getScoreTotal(updatedMatch.away_score);

        if (homeTotal !== awayTotal) {
            winnerId = homeTotal > awayTotal ? updatedMatch.home_team_id : updatedMatch.away_team_id;
        }

        if (winnerId) {
            // Update status (no winner_id column in matches)
            const { error: winnerError } = await supabase
                .from('matches')
                .update({ status: 'finished' })
                .eq('id', matchId);

            if (winnerError) {
                console.error("Error saving winner status:", winnerError);
            } else {
                // Propagate to next round
                await advanceWinner(updatedMatch, winnerId, supabase);
            }
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('UPDATE_MATCH_SCORE', 'match', matchId, { home_score: homeScore, away_score: awayScore });
    return { success: true };
}

export async function resetFixtures(tournamentId: string): Promise<ActionResponse> {
    // Security Check
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) return { success: false, error: "No category found." };

    // Delete all matches
    const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_category_id", category.id);

    if (matchError) {
        return { success: false, error: "Failed to delete matches: " + matchError.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function createMatch(
    tournamentId: string,
    homeTeamId: string,
    awayTeamId: string,
    round: number,
    stage: string = 'league',
    match_date?: string,
    match_time?: string,
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) return { success: false, error: "No tournament category setup found" };

    let scheduled_at: string | null = null;
    if (match_date) {
        const timePart = match_time || "00:00:00";
        scheduled_at = new Date(`${match_date}T${timePart}`).toISOString();
    }

    let matchStage: 'group' | 'knockout' | 'final' = 'group';
    if (stage === 'league' || stage === 'group') {
        matchStage = 'group';
    } else if (stage === 'final' || stage === 'semi_final' || stage === 'quarter_final' || stage === 'round_of_16' || stage === 'round_of_32' || stage === 'round_of_64') {
        matchStage = stage === 'final' ? 'final' : 'knockout';
    } else {
        matchStage = 'knockout';
    }

    const { error } = await supabase.from('matches').insert({
        tournament_category_id: category.id,
        home_team_id: homeTeamId || null,
        away_team_id: awayTeamId || null,
        round,
        stage: matchStage,
        is_manual: true,
        status: 'scheduled',
        home_score: { total: 0 },
        away_score: { total: 0 },
        scheduled_at
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatch(
    matchId: string,
    data: {
        home_team_id?: string | null;
        away_team_id?: string | null;
        home_score?: number | null;
        away_score?: number | null;
        penalty_home_score?: number | null;
        penalty_away_score?: number | null;
        winner_id?: string | null;
        status?: 'scheduled' | 'live' | 'finished' | 'canceled';
        match_date?: string | null;
        match_time?: string | null;
        venue?: string | null;
        timer_status?: 'playing' | 'paused' | 'stopped';
        elapsed_before_pause?: number;
        current_minute?: number | string;
        winner_to_node_id?: string | null;
    },
    tournamentId: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: currentMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

    const updateData: Record<string, unknown> = {};
    if (data.home_team_id !== undefined) updateData.home_team_id = data.home_team_id;
    if (data.away_team_id !== undefined) updateData.away_team_id = data.away_team_id;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.timer_status !== undefined) updateData.timer_status = data.timer_status;
    if (data.elapsed_before_pause !== undefined) updateData.elapsed_before_pause = data.elapsed_before_pause;
    if (data.winner_to_node_id !== undefined) updateData.winner_to_node_id = data.winner_to_node_id;
    if (data.current_minute !== undefined) {
        const minVal = Number(data.current_minute);
        updateData.current_minute = isNaN(minVal) ? null : minVal;
    }

    if (data.home_score !== undefined && data.home_score !== null) {
        updateData.home_score = { total: data.home_score };
    }
    if (data.away_score !== undefined && data.away_score !== null) {
        updateData.away_score = { total: data.away_score };
    }

    if (data.match_date !== undefined || data.match_time !== undefined) {
        const datePart = data.match_date !== undefined ? data.match_date : (currentMatch?.scheduled_at ? currentMatch.scheduled_at.split('T')[0] : null);
        const timePart = data.match_time !== undefined ? data.match_time : (currentMatch?.scheduled_at ? currentMatch.scheduled_at.split('T')[1]?.substring(0, 5) : null);
        if (datePart) {
            const t = timePart || "00:00";
            updateData.scheduled_at = new Date(`${datePart}T${t}:00`).toISOString();
        } else {
            updateData.scheduled_at = null;
        }
    }

    const { data: updatedMatch, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)
        .select('*')
        .single();

    if (error) {
        console.error("Error updating match:", error);
        return { success: false, error: error.message };
    }

    // Auto-Advance Winner & Propagate Standings
    if (updatedMatch && updatedMatch.status === 'finished') {
        if (updatedMatch.stage === 'group') {
            await propagateGroupStandings(updatedMatch.tournament_category_id, supabase);
        } else {
            await propagateKnockoutResults(updatedMatch, supabase);
        }
    }

    // Auto-Activate Tournament
    if (data.status === 'live') {
        const { data: tournament } = await supabase
            .from('tournaments')
            .select('status')
            .eq('id', tournamentId)
            .single();

        if (tournament && tournament.status !== 'ongoing') {
            const { error: activateError } = await supabase
                .from('tournaments')
                .update({ status: 'ongoing' })
                .eq('id', tournamentId);

            if (activateError) {
                console.error("Error activating tournament:", activateError);
            }
        }
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    await logActivity('UPDATE_MATCH', 'match', matchId, { tournament_id: tournamentId, ...data });
    return { success: true };
}

export async function deleteMatch(matchId: string, tournamentId: string): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function advanceStage(tournamentId: string): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const supabase = await createClient();

    const { data: category } = await supabase
        .from('tournament_categories')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1)
        .single();

    if (!category) return { success: false, error: "No category found." };
    const tournamentCategoryId = category.id;

    // 1. Fetch all matches and teams
    const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_category_id', tournamentCategoryId);

    const { data: teams } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_category_id', tournamentCategoryId)
        .is("deleted_at", null);

    if (!matches || matches.length === 0) {
        return { success: false, error: "No matches found." };
    }

    if (!teams) {
        return { success: false, error: "No teams found." };
    }

    const stageOrder = ['group', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final'];

    if (matches.some(m => m.stage === 'league')) {
        return { success: false, error: "League format does not support automatic stage advancement." };
    }

    let currentStage = 'group';

    for (const stage of stageOrder) {
        const stageMatches = matches.filter(m => m.stage === stage);
        if (stageMatches.length === 0) continue;

        const hasTeams = stageMatches.some(m => m.home_team_id || m.away_team_id);
        const allFinished = stageMatches.every(m => m.status === 'finished');

        if (!hasTeams) {
            break;
        }

        currentStage = stage;

        if (!allFinished) {
            break;
        }
    }

    const currentStageMatches = matches.filter(m => m.stage === currentStage);
    const allFinished = currentStageMatches.every(m => m.status === 'finished');

    if (!allFinished) {
        return { success: false, error: `Not all matches in ${currentStage} are finished.` };
    }

    const nextMatches: Partial<Match>[] = [];

    // Since group_name is removed, we only run knockout stage progression
    if (currentStage === 'group') {
        return { success: false, error: "Group advancement is not supported with the current schema." };
    } else {
        let nextStage = '';
        if (currentStage === 'round_of_16') nextStage = 'quarter_final';
        else if (currentStage === 'quarter_final') nextStage = 'semi_final';
        else if (currentStage === 'semi_final') nextStage = 'final';
        else if (currentStage === 'final') return { success: false, error: "Tournament is already finished." };

        currentStageMatches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const validWinners = currentStageMatches.map(m => {
            const homeTotal = getScoreTotal(m.home_score);
            const awayTotal = getScoreTotal(m.away_score);
            if (homeTotal > awayTotal) return m.home_team_id;
            if (awayTotal > homeTotal) return m.away_team_id;
            return null;
        }).filter(Boolean) as string[];

        if (validWinners.length < 2) {
            return { success: false, error: "Not enough winners to create next round matches." };
        }

        const lastRound = await getLastRound(tournamentCategoryId, supabase);
        const startRound = lastRound + 1;

        if (nextStage === 'final') {
            const { data: finalMatchPlaceholder } = await supabase
                .from('matches')
                .select('*')
                .eq('tournament_category_id', tournamentCategoryId)
                .eq('stage', 'final')
                .single();

            if (finalMatchPlaceholder && validWinners.length >= 2) {
                await supabase.from('matches').update({
                    home_team_id: validWinners[0],
                    away_team_id: validWinners[1],
                    status: 'scheduled'
                }).eq('id', finalMatchPlaceholder.id);

                revalidatePath(`/dashboard/tournaments/${tournamentId}`);
                return { success: true };
            }
        }

        for (let i = 0; i < validWinners.length; i += 2) {
            if (i + 1 < validWinners.length) {
                nextMatches.push({
                    tournament_category_id: tournamentCategoryId,
                    home_team_id: validWinners[i],
                    away_team_id: validWinners[i + 1],
                    round: startRound,
                    stage: nextStage as Match['stage'],
                    status: 'scheduled',
                    is_manual: false,
                    home_score: { total: 0 },
                    away_score: { total: 0 }
                });
            }
        }
    }

    if (nextMatches.length > 0) {
        const { error } = await supabase.from('matches').insert(nextMatches);
        if (error) return { success: false, error: error.message };

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        return { success: true };
    }

    return { success: false, error: "Could not generate next round matches." };
}

export async function addGoal(
    matchId: string,
    teamId: string,
    playerName: string,
    tournamentId: string,
    goalTime?: string | number
): Promise<ActionResponse<{ id: string }>> {
    const supabase = await createClient();

    if (!playerName) return { success: false, error: "Player Name required" };

    const { data: newEvent, error: insertError } = await supabase.from('match_events').insert({
        match_id: matchId,
        team_id: teamId,
        player_id: null,
        event_type: 'goal',
        minute: goalTime ? Number(goalTime) : null,
        extra_info: { player_name: playerName }
    }).select('id').single();

    if (insertError) return { success: false, error: insertError.message };

    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        return { success: false, error: "Match not found for score update" };
    }

    const { count: homeCount } = await supabase
        .from('match_events')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.home_team_id)
        .eq('event_type', 'goal')
        .is('deleted_at', null);

    const { count: awayCount } = await supabase
        .from('match_events')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('team_id', match.away_team_id)
        .eq('event_type', 'goal')
        .is('deleted_at', null);

    const { error: updateError } = await supabase
        .from('matches')
        .update({
            home_score: { total: homeCount || 0 },
            away_score: { total: awayCount || 0 }
        })
        .eq('id', matchId);

    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true, data: { id: newEvent?.id || '' } };
}

export async function deleteGoal(goalId: string, tournamentId: string): Promise<ActionResponse> {
    const supabase = await createClient();

    const { data: event } = await supabase
        .from('match_events')
        .select('match_id')
        .eq('id', goalId)
        .single();

    if (!event) return { success: false, error: "Goal event not found" };
    const matchId = event.match_id;

    const { error: deleteError } = await supabase.from('match_events').delete().eq('id', goalId);
    if (deleteError) return { success: false, error: deleteError.message };

    const { data: match } = await supabase
        .from('matches')
        .select('home_team_id, away_team_id')
        .eq('id', matchId)
        .single();

    if (match) {
        const { count: homeCount } = await supabase
            .from('match_events')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .eq('team_id', match.home_team_id)
            .eq('event_type', 'goal')
            .is('deleted_at', null);

        const { count: awayCount } = await supabase
            .from('match_events')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .eq('team_id', match.away_team_id)
            .eq('event_type', 'goal')
            .is('deleted_at', null);

        await supabase
            .from('matches')
            .update({
                home_score: { total: homeCount || 0 },
                away_score: { total: awayCount || 0 }
            })
            .eq('id', matchId);
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

async function advanceWinner(match: Match, winnerId: string, supabase: SupabaseClient) {
    if (match.match_index === null || match.match_index === undefined) return;

    const { data: currentRoundMatches } = await supabase
        .from('matches')
        .select('id, match_index')
        .eq('tournament_category_id', match.tournament_category_id)
        .eq('round', match.round)
        .order('match_index', { ascending: true });

    if (!currentRoundMatches || currentRoundMatches.length === 0) return;

    const indexInRound = currentRoundMatches.findIndex((m: { id: string }) => m.id === match.id);
    if (indexInRound === -1) return;

    const nextRound = match.round + 1;
    const nextMatchPosition = Math.floor(indexInRound / 2);
    const isHomePos = indexInRound % 2 === 0;

    const { data: nextRoundMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_category_id', match.tournament_category_id)
        .eq('round', nextRound)
        .order('match_index', { ascending: true });

    if (nextRoundMatches && nextRoundMatches[nextMatchPosition]) {
        const nextMatch = nextRoundMatches[nextMatchPosition];
        const updateData = isHomePos ? { home_team_id: winnerId } : { away_team_id: winnerId };

        await supabase.from('matches').update(updateData).eq('id', nextMatch.id);
    }
}

export async function updateTournamentCategory(
    tournamentId: string,
    categoryId: string,
    ageCategoryId: number,
    genderType: string,
    maxTeams: number,
    registrationFee: number
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Validate tournament access
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

        const formattedFee = Math.round(registrationFee * 100) / 100;
        const { data: _updatedCategory, error } = await supabase
            .from("tournament_categories")
            .update({
                age_category_id: ageCategoryId,
                gender_type: genderType,
                max_teams: maxTeams,
                registration_fee: formattedFee
            })
            .eq("id", categoryId)
            .eq("tournament_id", tournamentId)
            .select()
            .single();

        if (error) {
            console.error("Update tournament category error:", error);
            return { success: false, error: error.message };
        }

        await logActivity('UPDATE_TOURNAMENT_CATEGORY', 'tournament_category', categoryId, { 
            tournament_id: tournamentId,
            age_category_id: ageCategoryId,
            gender_type: genderType,
            max_teams: maxTeams,
            registration_fee: registrationFee
        });

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in updateTournamentCategory:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function deleteTournamentCategory(
    tournamentId: string,
    categoryId: string
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        // Validate tournament access
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

        // Soft delete category by setting deleted_at
        const { error } = await supabase
            .from("tournament_categories")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", categoryId)
            .eq("tournament_id", tournamentId);

        if (error) {
            console.error("Delete tournament category error:", error);
            return { success: false, error: error.message };
        }

        await logActivity('DELETE_TOURNAMENT_CATEGORY', 'tournament_category', categoryId, { 
            tournament_id: tournamentId
        });

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in deleteTournamentCategory:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function updateBroadcastSettings(
    tournamentId: string,
    settings: unknown
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'editor');
        if (!access.success) return { success: false, error: access.error };

        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase
            .from("tournaments")
            .update({ broadcast_settings: settings })
            .eq("id", tournamentId);

        if (error) {
            console.error("Update broadcast settings error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Unexpected error in updateBroadcastSettings:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}


