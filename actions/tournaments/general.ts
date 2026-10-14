"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@/lib/supabase/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse, SportType, Match, MatchStatus } from "@/types/index";
import { logActivity } from "@/lib/audit";
import { validateTournamentAccess } from "@/lib/security";
import { validateUploadedFile } from "@/lib/file-validation";
import { initTournamentStructure } from "@/lib/fixture-utils";
import { uploadToR2 } from "@/lib/r2";
import { getServerSession } from "@/lib/auth-server";
import { ApiClient } from "@/lib/api-client";
import { populateTournamentRosterSubmissionsFromGlobalTeam } from "@/actions/tournaments/registration";



export async function addTeam(
    tournamentId: string,
    prevState: unknown,
    formData: FormData
): Promise<ActionResponse> {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const contact_name = formData.get("contact_name") as string;
    const contact_phone = formData.get("contact_phone") as string;
    const contact_email = formData.get("contact_email") as string;
    const logoFile = formData.get("logo") as File;
    const logoUrlInput = formData.get("logo_url") as string;
    const requestedCategoryId = formData.get("tournament_category_id") as string | null;

    if (!name || !name.trim()) {
        return { success: false, error: "Team name is required" };
    }

    // Security Check: Ensure user is authorized
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };
    const session = await getServerSession();
    if (!session?.token) return { success: false, error: "Authentication required" };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://leagueflow-v80x.onrender.com/api/v1';

    // 1. Fetch tournament to resolve sport_id and category_id
    let tournamentSportId: string | null = null;
    let targetCategoryId: string | null = requestedCategoryId;

    try {
        const tourRes = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
            headers: { Authorization: `Bearer ${session.token}` },
            cache: 'no-store',
        });
        if (tourRes.ok) {
            const tourData = await tourRes.json();
            tournamentSportId = tourData.tournament?.sport_id || null;
            const categories = tourData.categories || [];
            const matchedCategory = requestedCategoryId
                ? categories.find((c: any) => String(c.id) === String(requestedCategoryId))
                : categories[0];
            if (matchedCategory) {
                targetCategoryId = matchedCategory.id;
            } else if (categories.length > 0) {
                targetCategoryId = categories[0].id;
            }
        }
    } catch (e) {
        console.error("Failed to fetch tournament info in addTeam:", e);
    }

    if (!targetCategoryId) {
        return { success: false, error: "Tournament category setup not found" };
    }

    let logo_url = logoUrlInput || null;

    // Handle File Upload if URL is not provided
    if (!logo_url && logoFile && logoFile.size > 0) {
        const fileCheck = validateUploadedFile(logoFile);
        if (!fileCheck.valid) return { success: false, error: fileCheck.error };

        const tempId = crypto.randomUUID();
        const fileExt = logoFile.name.split('.').pop() || 'png';
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `teams/${tempId}/${fileName}`;

        const uploadRes = await uploadToR2(logoFile, filePath, logoFile.type);
        if (!uploadRes.success || !uploadRes.url) {
            console.error("Logo upload to R2 failed", uploadRes.error);
            return { success: false, error: `Logo upload failed: ${uploadRes.error || "Unknown error"}` };
        }
        logo_url = uploadRes.url;
    }

    // 2. Create global team via Go REST API
    let createdTeam: any = null;
    try {
        const parsedSportId = tournamentSportId ? parseInt(String(tournamentSportId), 10) || 1 : 1;
        const createTeamRes = await fetch(`${apiUrl}/teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                name: name.trim(),
                description: description || '',
                contact_name: contact_name || '',
                contact_phone: contact_phone || '',
                contact_email: contact_email || '',
                logo_url: logo_url || null,
                logo_img: logo_url || null,
                sport_id: parsedSportId,
            }),
        });

        if (!createTeamRes.ok) {
            const err = await createTeamRes.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to create team" };
        }
        createdTeam = await createTeamRes.json();
    } catch (e) {
        console.error("Error creating team in Go API:", e);
        return { success: false, error: "An unexpected error occurred while creating team" };
    }

    if (!createdTeam?.id) {
        return { success: false, error: "Failed to create team: Invalid response from server" };
    }

    // 3. Register team to tournament via Go REST API
    try {
        const regRes = await fetch(`${apiUrl}/tournaments/${tournamentId}/teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                tournament_id: tournamentId,
                category_id: targetCategoryId,
                tournament_category_id: targetCategoryId,
                team_id: createdTeam.id,
                status: 'registered',
                payment_status: 'paid',
                registration_status: 'approved',
                roster_status: 'pending',
                contact_name: contact_name || '',
                contact_phone: contact_phone || '',
                contact_email: contact_email || '',
            }),
        });

        if (!regRes.ok) {
            const err = await regRes.json().catch(() => ({}));
            // Cleanup created team
            await fetch(`${apiUrl}/teams/${createdTeam.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.token}` }
            }).catch(() => {});
            return { success: false, error: err.error || "Failed to register team to tournament" };
        }

        const regData = await regRes.json().catch(() => ({}));
        let ttId = regData?.id;
        if (!ttId && createdTeam?.id) {
            const adminSupabase = createAdminClient();
            const { data: latestTT } = await adminSupabase
                .from("tournament_teams")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("team_id", createdTeam.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (latestTT) {
                ttId = latestTT.id;
            }
        }

        if (ttId && createdTeam?.id) {
            await populateTournamentRosterSubmissionsFromGlobalTeam(ttId, createdTeam.id).catch(err => {
                console.error("Error populating tournament_roster_submissions in addTeam:", err);
            });
        }
    } catch (e) {
        console.error("Error registering team to tournament:", e);
        return { success: false, error: "An unexpected error occurred while registering team" };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    revalidatePath(`/registrations/${tournamentId}`);
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
    const contact_email = formData.get("contact_email") as string;
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

        const fileExt = logoFile.name.split('.').pop() || 'png';
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `teams/${registration.team_id}/${fileName}`;

        const uploadRes = await uploadToR2(logoFile, filePath, logoFile.type);
        if (!uploadRes.success || !uploadRes.url) {
            console.error("Logo upload to R2 failed", uploadRes.error);
            return { success: false, error: `Logo upload failed: ${uploadRes.error || "Unknown error"}` };
        }
        logo_url = uploadRes.url;
    }


    const updateData: Record<string, string | null> = {
        name,
        description: description || null,
        logo_img: logo_url || null
    };
    if (contact_name) updateData.contact_name = contact_name;
    if (contact_phone) updateData.contact_phone = contact_phone;
    if (contact_email !== undefined) updateData.contact_email = contact_email ? contact_email.trim() : null;

    const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", registration.team_id);

    if (error) {
        return { success: false, error: error.message };
    }

    // Also update tournament_teams contact info if present
    const ttUpdate: Record<string, string | null> = {};
    if (contact_name) ttUpdate.contact_name = contact_name;
    if (contact_phone) ttUpdate.contact_phone = contact_phone;
    if (contact_email !== undefined) ttUpdate.contact_email = contact_email ? contact_email.trim() : null;
    if (Object.keys(ttUpdate).length > 0) {
        await supabase
            .from("tournament_teams")
            .update(ttUpdate)
            .eq("id", teamId);
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
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return { success: false, error: "Authentication required" };
        }

        const formType = formData.get("form_type") as string;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

        // Fetch current tournament data to merge settings
        let currentTour: any = null;
        let categories: any[] = [];
        const tourRes = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
            headers: {
                'Authorization': `Bearer ${session.token}`,
            },
            cache: 'no-store'
        });
        if (tourRes.ok) {
            const data = await tourRes.json();
            currentTour = data.tournament;
            categories = data.categories || [];
        }

        const currentSettings = (currentTour?.settings as Record<string, unknown>) || {};
        const updateData: Record<string, unknown> = {
            id: tournamentId,
        };

        if (formType === 'general' || !formType) {
            if (formData.has("name")) updateData.name = formData.get("name") as string;
            if (formData.has("status")) {
                const newStatus = formData.get("status") as string;
                updateData.status = newStatus;
                if (newStatus === 'registration_open') {
                    currentSettings.is_registration_open = true;
                } else if (newStatus === 'registration_closed' || newStatus === 'completed' || newStatus === 'finished' || newStatus === 'cancelled') {
                    currentSettings.is_registration_open = false;
                }
            }
            if (formData.has("description")) updateData.description = formData.get("description") as string;
            if (formData.has("start_date")) updateData.start_date = formData.get("start_date") as string || null;
            if (formData.has("end_date")) updateData.end_date = formData.get("end_date") as string || null;
            if (formData.has("document_deadline")) currentSettings.document_deadline = formData.get("document_deadline") as string || null;
            if (formData.has("bank_name")) currentSettings.bank_name = formData.get("bank_name") as string;
            if (formData.has("bank_account_name")) currentSettings.bank_account_name = formData.get("bank_account_name") as string;
            if (formData.has("bank_account_number")) currentSettings.bank_account_number = formData.get("bank_account_number") as string;

            // Handle logo and cover file uploads
            const logoFile = formData.get("logo_img") as File | null;
            const coverFile = formData.get("cover_img") as File | null;

            if (logoFile && logoFile.size > 0) {
                const fileCheck = validateUploadedFile(logoFile);
                if (!fileCheck.valid) return { success: false, error: `Logo: ${fileCheck.error}` };

                const fileExt = logoFile.name.split('.').pop() || 'png';
                const fileName = `logo-${Date.now()}.${fileExt}`;
                const filePath = `tournaments/uploads/${fileName}`;

                const uploadRes = await uploadToR2(logoFile, filePath, logoFile.type);
                if (!uploadRes.success || !uploadRes.url) {
                    console.error("Logo upload to R2 failed", uploadRes.error);
                    return { success: false, error: `Logo upload failed: ${uploadRes.error || "Unknown error"}` };
                }
                updateData.logo_url = uploadRes.url;
            } else if (formData.get("logo_img_remove") === 'true') {
                updateData.logo_url = null;
            }

            if (coverFile && coverFile.size > 0) {
                const fileCheck = validateUploadedFile(coverFile);
                if (!fileCheck.valid) return { success: false, error: `Cover: ${fileCheck.error}` };

                const fileExt = coverFile.name.split('.').pop() || 'png';
                const fileName = `cover-${Date.now()}.${fileExt}`;
                const filePath = `tournaments/uploads/${fileName}`;

                const uploadRes = await uploadToR2(coverFile, filePath, coverFile.type);
                if (!uploadRes.success || !uploadRes.url) {
                    console.error("Cover upload to R2 failed", uploadRes.error);
                    return { success: false, error: `Cover upload failed: ${uploadRes.error || "Unknown error"}` };
                }
                updateData.banner_url = uploadRes.url;
            } else if (formData.get("cover_img_remove") === 'true') {
                updateData.banner_url = null;
            }
        }

        if (formType === 'registration' || !formType) {
            if (formType === 'registration' || formData.has("is_registration_open")) {
                const isOpen = formData.get("is_registration_open") === 'true';
                currentSettings.is_registration_open = isOpen;
                if (isOpen) {
                    updateData.status = 'registration_open';
                }
            }

            if (formData.has("bank_name")) currentSettings.bank_name = formData.get("bank_name") as string;
            if (formData.has("bank_account_name")) currentSettings.bank_account_name = formData.get("bank_account_name") as string;
            if (formData.has("bank_account_number")) currentSettings.bank_account_number = formData.get("bank_account_number") as string;
        }

        if (formType === 'venue' || !formType) {
            if (formData.has("location_name")) updateData.location = formData.get("location_name") as string || null;
            if (formData.has("google_map_url")) currentSettings.google_map_url = formData.get("google_map_url") as string || null;
        }

        updateData.settings = currentSettings;

        // Resolve category and update max_teams or registration_fee
        const requestedCategoryId = formData.get("tournament_category_id") as string | null;
        let targetCategoryId = requestedCategoryId;
        if (!targetCategoryId && categories.length > 0) {
            targetCategoryId = categories[0].id;
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
                await fetch(`${apiUrl}/tournaments/${tournamentId}/categories/${targetCategoryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.token}`,
                    },
                    body: JSON.stringify(catUpdate),
                });
            }
        }

        const updateRes = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify(updateData),
        });

        if (!updateRes.ok) {
            const errData = await updateRes.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to update tournament" };
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        await logActivity('UPDATE_TOURNAMENT', 'tournament', tournamentId, updateData);
        return { success: true };
    } catch (error) {
        console.error("Update tournament error:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function deleteTournament(tournamentId: string) {
    const session = await getServerSession();
    if (!session?.user) return { success: false, error: "Authentication required" };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const res = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${session.token}`,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error || "Failed to delete tournament" };
    }

    await logActivity('DELETE_TOURNAMENT', 'tournament', tournamentId, {});
    redirect("/dashboard/tournaments");
}

export async function createTournament(_prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return { success: false, error: "Authentication required" };
        }

        const name = formData.get("name") as string;
        const sport_id = formData.get("sport_id") as string;
        const description = formData.get("description") as string;
        const location_name = formData.get("location_name") as string || null;
        const google_map_url = formData.get("google_map_url") as string || null;
        const start_date = formData.get("start_date") as string;
        const end_date = formData.get("end_date") as string;
        const document_deadline = formData.get("document_deadline") as string;

        if (!name) {
            return { success: false, error: "Name is required" };
        }

        if (!sport_id) {
            return { success: false, error: "Sport is required" };
        }

        if (!start_date || !end_date) {
            return { success: false, error: "Dates are required" };
        }

        const logoFile = formData.get("logo_img") as File | null;
        const coverFile = formData.get("cover_img") as File | null;

        let logo_img: string | null = null;
        let cover_img: string | null = null;

        // Upload Logo
        if (logoFile && logoFile.size > 0) {
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: `Logo: ${fileCheck.error}` };

            const fileExt = logoFile.name.split('.').pop() || 'png';
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `tournaments/uploads/${fileName}`;

            const uploadRes = await uploadToR2(logoFile, filePath, logoFile.type);
            if (uploadRes.success && uploadRes.url) {
                logo_img = uploadRes.url;
            }
        }

        // Upload Cover
        if (coverFile && coverFile.size > 0) {
            const fileCheck = validateUploadedFile(coverFile);
            if (!fileCheck.valid) return { success: false, error: `Cover: ${fileCheck.error}` };

            const fileExt = coverFile.name.split('.').pop() || 'png';
            const fileName = `cover-${Date.now()}.${fileExt}`;
            const filePath = `tournaments/uploads/${fileName}`;

            const uploadRes = await uploadToR2(coverFile, filePath, coverFile.type);
            if (uploadRes.success && uploadRes.url) {
                cover_img = uploadRes.url;
            }
        }

        // Call Go Backend API to create tournament
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournaments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`,
            },
            body: JSON.stringify({
                name,
                description: description || null,
                start_date,
                end_date,
                location: location_name || null,
                banner_url: cover_img || null,
                logo_url: logo_img || null,
                settings: {
                    sport_id,
                    google_map_url,
                    document_deadline,
                }
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to create tournament" };
        }

        const newTournament = await res.json();

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/tournaments");
        return { success: true, data: newTournament };
    } catch (_error) {
        console.error("Create tournament error:", _error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function getDashboardTournaments(query?: string) {
    try {
        const session = await getServerSession();
        if (!session?.user) return [];

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

        // 1. Fetch owned tournaments and user accepted invitations concurrently
        const [tourRes, invRes] = await Promise.all([
            fetch(`${apiUrl}/tournaments?organizer_id=${session.user.id}`, {
                headers: { 'Authorization': `Bearer ${session.token}` },
                cache: 'no-store',
            }),
            fetch(`${apiUrl}/invitations/my`, {
                headers: { 'Authorization': `Bearer ${session.token}` },
                cache: 'no-store',
            })
        ]);

        const respData = tourRes.ok ? await tourRes.json() : { data: [] };
        const ownedTournaments = respData.data || [];

        let mapped = ownedTournaments.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            status: t.status || 'draft',
            organizer_id: t.organizer_id,
            user_id: t.organizer_id,
            role: 'owner',
            start_date: t.start_date,
            end_date: t.end_date,
            logo_img: t.logo_url || null,
            cover_img: t.banner_url || null,
            created_at: t.created_at,
            sport: 'football' as SportType,
            format: t.format || 'knockout',
            plan: 'free' as const,
            is_registration_open: t.status === 'registration_open'
        }));

        // 2. Fetch tournament details for accepted invitations
        if (invRes.ok) {
            const invitations = await invRes.json();
            const acceptedInvites = (invitations || []).filter((inv: any) => inv.status === 'accepted');

            // Find tournament IDs not already in mapped list
            const existingIds = new Set(mapped.map((t: any) => t.id));
            const newInvites = acceptedInvites.filter((inv: any) => !existingIds.has(inv.tournament_id));

            if (newInvites.length > 0) {
                const staffTournaments = await Promise.all(
                    newInvites.map(async (inv: any) => {
                        try {
                            const tourDetailRes = await fetch(`${apiUrl}/tournaments/${inv.tournament_id}`, {
                                headers: { 'Authorization': `Bearer ${session.token}` },
                                cache: 'no-store',
                            });
                            if (!tourDetailRes.ok) return null;
                            const tourDetail = await tourDetailRes.json();
                            const t = tourDetail.tournament;
                            if (!t) return null;

                            return {
                                id: t.id,
                                name: t.name,
                                description: t.description,
                                status: t.status || 'draft',
                                organizer_id: t.organizer_id,
                                user_id: t.organizer_id,
                                role: inv.role || 'staff',
                                start_date: t.start_date,
                                end_date: t.end_date,
                                logo_img: t.logo_url || null,
                                cover_img: t.banner_url || null,
                                created_at: t.created_at,
                                sport: 'football' as SportType,
                                format: t.format || 'knockout',
                                plan: 'free' as const,
                                is_registration_open: t.status === 'registration_open'
                            };
                        } catch (e) {
                            console.error(`Error fetching staff tournament ${inv.tournament_id}:`, e);
                            return null;
                        }
                    })
                );

                for (const st of staffTournaments) {
                    if (st) {
                        mapped.push(st);
                    }
                }
            }
        }

        if (query) {
            const lowerQuery = query.toLowerCase();
            mapped = mapped.filter((t: any) => t.name?.toLowerCase().includes(lowerQuery));
        }

        return mapped;
    } catch (e) {
        console.error("Error in getDashboardTournaments:", e);
        return [];
    }
}

export async function getOrCreateAgeCategory(
    categoryName: string,
    minAge?: number,
    maxAge?: number
): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/age-categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category_name: categoryName,
                min_age: minAge,
                max_age: maxAge,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to get or create age category" };
        }

        const data = await res.json();
        return { success: true, id: data.id };
    } catch (e) {
        console.error("Error in getOrCreateAgeCategory:", e);
        return { success: false, error: "Network or server error" };
    }
}

export async function createTournamentCategory(
    tournamentId: string,
    ageCategoryId: number,
    genderType: string,
    maxTeams: number,
    registrationFee: number,
    rulesConfig?: Record<string, unknown> | null,
    bankDetails?: {
        bank_name?: string;
        bank_account_name?: string;
        bank_account_number?: string;
    } | null
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'editor');
        if (!access.success || !access.user) {
            return { success: false, error: access.error || "Authentication required" };
        }

        const session = await getServerSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

        const categoryPayload = {
            name: `${genderType === 'female' ? 'Women ' : genderType === 'mix' ? 'Mix ' : ''}Open`,
            team_limit: maxTeams,
            max_teams: maxTeams,
            gender_type: genderType,
            age_category_id: ageCategoryId,
            registration_fee: registrationFee,
            rules_config: rulesConfig || null,
        };

        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.token || ''}`,
            },
            body: JSON.stringify(categoryPayload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to create category" };
        }

        // If bank details provided, also update tournament settings
        if (bankDetails && (bankDetails.bank_account_number || bankDetails.bank_account_name)) {
            try {
                // Fetch current tournament settings first
                const tourRes = await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
                    headers: { 'Authorization': `Bearer ${session?.token || ''}` },
                    cache: 'no-store'
                });
                let existingSettings: Record<string, any> = {};
                if (tourRes.ok) {
                    const tourData = await tourRes.json();
                    existingSettings = tourData.tournament?.settings || {};
                }

                await fetch(`${apiUrl}/tournaments/${tournamentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.token || ''}`,
                    },
                    body: JSON.stringify({
                        settings: {
                            ...existingSettings,
                            bank_name: bankDetails.bank_name || existingSettings.bank_name || 'PromptPay',
                            bank_account_name: bankDetails.bank_account_name || existingSettings.bank_account_name || '',
                            bank_account_number: bankDetails.bank_account_number || existingSettings.bank_account_number || '',
                            is_registration_open: true
                        }
                    }),
                });
            } catch (err) {
                console.error("Failed to update tournament bank details during category setup:", err);
            }
        }

        await logActivity('CREATE_TOURNAMENT_CATEGORY', 'tournament_category', tournamentId, { 
            tournament_id: tournamentId,
            gender_type: genderType,
            max_teams: maxTeams,
            registration_fee: registrationFee
        });

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in createTournamentCategory:", error);
        return { success: false, error: "Internal server error" };
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
        status?: MatchStatus;
        match_date?: string | null;
        match_time?: string | null;
        venue?: string | null;
        timer_status?: 'playing' | 'paused' | 'stopped' | string;
        elapsed_before_pause?: number;
        elapsed_seconds?: number;
        current_minute?: number | string;
        minute?: number | string;
        winner_to_node_id?: string | null;
        next_node_id?: string | null;
        ph_home?: string | null;
        ph_away?: string | null;
        score_detail?: Record<string, any> | null;
    },
    tournamentId: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    const session = await getServerSession();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

    const updateData: Record<string, unknown> = {};
    if (data.home_team_id !== undefined) updateData.home_team_id = data.home_team_id;
    if (data.away_team_id !== undefined) updateData.away_team_id = data.away_team_id;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.timer_status !== undefined) updateData.timer_status = data.timer_status;
    
    if (data.elapsed_seconds !== undefined) {
        updateData.elapsed_seconds = data.elapsed_seconds;
        updateData.elapsed_before_pause = data.elapsed_seconds;
    } else if (data.elapsed_before_pause !== undefined) {
        updateData.elapsed_seconds = data.elapsed_before_pause;
        updateData.elapsed_before_pause = data.elapsed_before_pause;
    }

    if (data.next_node_id !== undefined) {
        updateData.next_node_id = data.next_node_id;
        updateData.winner_to_node_id = data.next_node_id;
    } else if (data.winner_to_node_id !== undefined) {
        updateData.next_node_id = data.winner_to_node_id;
        updateData.winner_to_node_id = data.winner_to_node_id;
    }

    if (data.minute !== undefined) {
        const minVal = Number(data.minute);
        updateData.minute = isNaN(minVal) ? null : minVal;
        updateData.current_minute = updateData.minute;
    } else if (data.current_minute !== undefined) {
        const minVal = Number(data.current_minute);
        updateData.minute = isNaN(minVal) ? null : minVal;
        updateData.current_minute = updateData.minute;
    }

    if (data.ph_home !== undefined) updateData.ph_home = data.ph_home;
    if (data.ph_away !== undefined) updateData.ph_away = data.ph_away;
    if (data.score_detail !== undefined) updateData.score_detail = data.score_detail;

    if (data.home_score !== undefined && data.home_score !== null) {
        updateData.home_score = data.home_score;
    }
    if (data.away_score !== undefined && data.away_score !== null) {
        updateData.away_score = data.away_score;
    }
    if (data.venue !== undefined) {
        updateData.field_name = data.venue;
    }

    if (data.match_date !== undefined || data.match_time !== undefined) {
        if (data.match_date) {
            const t = data.match_time || "00:00";
            updateData.scheduled_at = new Date(`${data.match_date}T${t}:00`).toISOString();
        }
    }

    try {
        const res = await fetch(`${apiUrl}/matches/${matchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.token || ''}`,
            },
            body: JSON.stringify(updateData)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to update match" };
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        await logActivity('UPDATE_MATCH', 'match', matchId, { tournament_id: tournamentId, ...data });
        return { success: true };
    } catch (err: any) {
        console.error("Error updating match:", err);
        return { success: false, error: err?.message || "Failed to update match" };
    }
}

export async function deleteMatch(matchId: string, tournamentId: string): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'editor');
    if (!access.success) return { success: false, error: access.error };

    try {
        await ApiClient.fetch(`/matches/${matchId}`, {
            method: 'DELETE'
        });
        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        return { success: true };
    } catch (err: any) {
        console.error("Error soft deleting match via Go API:", err);
        // Fallback to Supabase soft delete
        try {
            const supabase = await createClient();
            await supabase.from('matches').update({ deleted_at: new Date().toISOString() }).eq('id', matchId);
            revalidatePath(`/dashboard/tournaments/${tournamentId}`);
            return { success: true };
        } catch (fbErr: any) {
            return { success: false, error: fbErr?.message || err?.message || "Failed to delete match" };
        }
    }
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
    registrationFee: number,
    rulesConfig?: Record<string, unknown> | null
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'editor');
        if (!access.success || !access.user) {
            return { success: false, error: access.error || "Authentication required" };
        }

        const session = await getServerSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

        const formattedFee = Math.round(registrationFee * 100) / 100;
        const categoryPayload = {
            gender_type: genderType,
            max_teams: maxTeams,
            team_limit: maxTeams,
            registration_fee: formattedFee,
            age_category_id: ageCategoryId,
            rules_config: rulesConfig || null,
        };

        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.token || ''}`,
            },
            body: JSON.stringify(categoryPayload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to update category" };
        }

        await logActivity('UPDATE_TOURNAMENT_CATEGORY', 'tournament_category', categoryId, { 
            tournament_id: tournamentId,
            age_category_id: ageCategoryId,
            gender_type: genderType,
            max_teams: maxTeams,
            registration_fee: registrationFee,
            rules_config: rulesConfig
        });

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error("Unexpected error in updateTournamentCategory:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function updateCategoryRulesConfig(
    tournamentId: string,
    categoryId: string,
    rulesConfigUpdate: Record<string, unknown>
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'editor');
        if (!access.success || !access.user) {
            return { success: false, error: access.error || "Authentication required" };
        }

        const session = await getServerSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

        const categoryPayload = {
            rules_config: rulesConfigUpdate,
        };

        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.token || ''}`,
            },
            body: JSON.stringify(categoryPayload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to update category rules" };
        }

        return { success: true, data: rulesConfigUpdate };
    } catch (error) {
        console.error("Unexpected error in updateCategoryRulesConfig:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function deleteTournamentCategory(
    tournamentId: string,
    categoryId: string
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'editor');
        if (!access.success || !access.user) {
            return { success: false, error: access.error || "Authentication required" };
        }

        const session = await getServerSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${session?.token || ''}`,
            },
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Failed to delete category" };
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


