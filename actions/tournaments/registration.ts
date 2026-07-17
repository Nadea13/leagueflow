"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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

    // 1. Fetch registration data from tournament_teams
    const { data: reg, error: fetchError } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            payment_status,
            registration_status,
            tournament_categories!inner (
                tournament_id
            )
        `)
        .eq("id", registrationId)
        .single();

    if (fetchError || !reg) {
        return { success: false, error: "Registration not found" };
    }

    if ((reg.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id !== tournamentId) {
        return { success: false, error: "Registration does not belong to this tournament" };
    }

    if (reg.payment_status === 'paid' && reg.registration_status === 'approved') {
        return { success: false, error: "Registration already approved" };
    }

    // 2. Update Registration Status
    const { error: updateError } = await adminSupabase
        .from("tournament_teams")
        .update({ 
            payment_status: 'paid',
            registration_status: 'approved'
        })
        .eq("id", registrationId);

    if (updateError) {
        return { success: false, error: "Failed to update registration: " + updateError.message };
    }

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

    // 1. Fetch registration data to verify tournament ownership
    const { data: reg, error: fetchError } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            tournament_categories!inner (
                tournament_id
            )
        `)
        .eq("id", registrationId)
        .single();

    if (fetchError || !reg || (reg.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id !== tournamentId) {
        return { success: false, error: "Registration not found" };
    }

    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({ 
            payment_status: 'rejected',
            registration_status: 'rejected'
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to reject registration: " + error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, message: "Registration rejected" };
}

export async function submitRosterWithSender(
    formData: FormData
): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Authentication required" };

        const tournamentTeamId = formData.get("tournamentTeamId") as string;
        const senderName = formData.get("senderName") as string;
        const senderPhone = formData.get("senderPhone") as string;

        if (!tournamentTeamId) return { success: false, error: "Tournament team ID is required" };
        if (!senderName || !senderName.trim()) return { success: false, error: "Sender name is required" };
        if (!senderPhone || !senderPhone.trim()) return { success: false, error: "Sender phone is required" };

        // 1. Fetch tournament_teams and check if user owns it
        const { data: participation } = await adminSupabase
            .from("tournament_teams")
            .select(`
                id,
                team_id,
                teams ( user_id, sport_id ),
                tournament_category_id,
                tournament_categories ( tournament_id )
            `)
            .eq("id", tournamentTeamId)
            .single();

        if (!participation) return { success: false, error: "Registration record not found" };

        const teamOwnerId = (participation.teams as any)?.user_id;
        if (teamOwnerId !== user.id) {
            return { success: false, error: "Unauthorized to manage this roster" };
        }

        // 2. Update contact info
        const { error: updateErr } = await adminSupabase
            .from("tournament_teams")
            .update({
                contact_name: senderName,
                contact_phone: senderPhone,
                roster_status: 'pending'
            })
            .eq("id", tournamentTeamId);

        if (updateErr) {
            return { success: false, error: "Failed to update contact info: " + updateErr.message };
        }

        const count = parseInt(formData.get("count") as string || "0");
        if (count === 0) {
            return { success: true, message: "Contact info updated successfully." };
        }

        const globalTeamId = participation.team_id;
        const sportId = (participation.teams as any)?.sport_id;
        const tournamentId = (participation.tournament_categories as any)?.tournament_id;

        if (!globalTeamId) return { success: false, error: "Global team not found" };
        if (!tournamentId) return { success: false, error: "Tournament not found" };

        // 4. Process and insert/update players in staging table
        for (let i = 0; i < count; i++) {
            const name = formData.get(`name_${i}`) as string;
            if (!name || !name.trim()) continue;

            const number = formData.get(`number_${i}`) as string;
            const position = formData.get(`position_${i}`) as string;
            const tel = formData.get(`tel_${i}`) as string;
            const photoFile = formData.get(`photo_${i}`) as File | null;

            let photoUrl = null;

            // Upload photo to storage if present
            if (photoFile && photoFile.size > 0) {
                const fileExt = photoFile.name.split('.').pop() || 'jpg';
                const fileName = `${tournamentTeamId}/photo_${i}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('players')
                    .upload(fileName, photoFile);
                
                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('players')
                        .getPublicUrl(fileName);
                    photoUrl = publicUrl;
                } else {
                    console.error(`[submitRosterWithSender] Photo upload failed for ${name}:`, uploadError);
                }
            }

            // Split name into first and last name
            const nameParts = name.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

            // Search for existing master player
            let existingMaster = null;
            if (tel) {
                const { data: byTel } = await adminSupabase
                    .from("master_players")
                    .select("id")
                    .eq("tel", tel)
                    .maybeSingle();
                if (byTel) {
                    existingMaster = byTel;
                }
            }

            if (!existingMaster) {
                const { data: byEnName } = await adminSupabase
                    .from("master_players")
                    .select("id")
                    .eq("first_name_en", firstName)
                    .eq("last_name_en", lastName)
                    .maybeSingle();
                if (byEnName) {
                    existingMaster = byEnName;
                } else {
                    const { data: byThName } = await adminSupabase
                        .from("master_players")
                        .select("id")
                        .eq("first_name_th", firstName)
                        .eq("last_name_th", lastName)
                        .maybeSingle();
                    if (byThName) {
                        existingMaster = byThName;
                    }
                }
            }

            // Create in master_players if not exists
            let finalMasterId = existingMaster?.id;
            if (!existingMaster) {
                let matchedUserId: string | null = null;
                if (tel) {
                    const { data: matchedUser } = await adminSupabase
                        .from("users")
                        .select("id")
                        .eq("phone", tel)
                        .maybeSingle();
                    if (matchedUser) {
                        matchedUserId = matchedUser.id;
                    }
                }

                const { data: newMaster, error: masterErr } = await adminSupabase
                    .from("master_players")
                    .insert({
                        user_id: matchedUserId,
                        first_name_th: firstName,
                        last_name_th: lastName,
                        first_name_en: firstName,
                        last_name_en: lastName,
                        gender: 'unspecified',
                        birthday: '1970-01-01',
                        tel: tel || null,
                        status: 'active',
                        verified: matchedUserId ? true : false,
                        profile_img: photoUrl || null
                    })
                    .select("id")
                    .single();

                if (masterErr || !newMaster) {
                    console.error(`[submitRosterWithSender] Create master player failed for ${name}:`, masterErr);
                } else {
                    finalMasterId = newMaster.id;
                }
            }

            // Check if this submission already exists in staging table
            const { data: existingSub } = await adminSupabase
                .from("tournament_roster_submissions")
                .select("id")
                .eq("tournament_team_id", tournamentTeamId)
                .eq("name", name)
                .maybeSingle();

            if (existingSub) {
                const updatePayload: any = {
                    shirt_number: number || null,
                    position: position || null,
                    tel: tel || null,
                    status: 'pending'
                };
                if (photoUrl) {
                    updatePayload.photo_url = photoUrl;
                }
                const { error: updateErr } = await adminSupabase
                    .from("tournament_roster_submissions")
                    .update(updatePayload)
                    .eq("id", existingSub.id);

                if (updateErr) {
                    throw new Error("Failed to update staged player: " + updateErr.message);
                }
            } else {
                // Insert into staging table
                const { error: insertErr } = await adminSupabase
                    .from("tournament_roster_submissions")
                    .insert({
                        tournament_team_id: tournamentTeamId,
                        name: name,
                        shirt_number: number || null,
                        position: position || null,
                        tel: tel || null,
                        photo_url: photoUrl
                    });

                if (insertErr) {
                    throw new Error("Failed to save staged player: " + insertErr.message);
                }
            }
        }

        revalidatePath(`/dashboard/registration/${tournamentId}`);
        return { success: true, message: "Roster submitted successfully!" };
    } catch (e: any) {
        console.error("Error in submitRosterWithSender:", e);
        return { success: false, error: e.message || "An unexpected error occurred." };
    }
}

export async function approveRoster(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'admin');
        if (!access.success) return { success: false, error: access.error };

        const adminSupabase = createAdminClient();

        // Fetch global team details
        const { data: participation } = await adminSupabase
            .from("tournament_teams")
            .select(`
                id,
                team_id,
                teams ( sport_id )
            `)
            .eq("id", registrationId)
            .single();

        if (!participation) return { success: false, error: "Registration record not found" };

        // Fetch staged players from tournament_roster_submissions (only pending ones)
        const { data: stagedPlayers } = await adminSupabase
            .from("tournament_roster_submissions")
            .select("*")
            .eq("tournament_team_id", registrationId)
            .eq("status", "pending");

        if (stagedPlayers && stagedPlayers.length > 0) {
            for (const staged of stagedPlayers) {
                const nameParts = staged.name.trim().split(" ");
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

                // Find corresponding master player (created during submission)
                let masterPlayer = null;
                if (staged.tel) {
                    const { data: byTel } = await adminSupabase
                        .from("master_players")
                        .select("id")
                        .eq("tel", staged.tel)
                        .maybeSingle();
                    masterPlayer = byTel;
                }

                if (!masterPlayer) {
                    const { data: byEnName } = await adminSupabase
                        .from("master_players")
                        .select("id")
                        .eq("first_name_en", firstName)
                        .eq("last_name_en", lastName)
                        .maybeSingle();
                    if (byEnName) {
                        masterPlayer = byEnName;
                    } else {
                        const { data: byThName } = await adminSupabase
                            .from("master_players")
                            .select("id")
                            .eq("first_name_th", firstName)
                            .eq("last_name_th", lastName)
                            .maybeSingle();
                        masterPlayer = byThName;
                    }
                }

                let finalMasterId = masterPlayer?.id;

                // Fallback creation in master_players if not found during approval
                if (!masterPlayer) {
                    let matchedUserId: string | null = null;
                    if (staged.tel) {
                        const { data: matchedUser } = await adminSupabase
                            .from("users")
                            .select("id")
                            .eq("phone", staged.tel)
                            .maybeSingle();
                        if (matchedUser) {
                            matchedUserId = matchedUser.id;
                        }
                    }

                    const { data: newMaster, error: masterErr } = await adminSupabase
                        .from("master_players")
                        .insert({
                            user_id: matchedUserId,
                            first_name_th: firstName,
                            last_name_th: lastName,
                            first_name_en: firstName,
                            last_name_en: lastName,
                            gender: 'unspecified',
                            birthday: '1970-01-01',
                            tel: staged.tel || null,
                            status: 'active',
                            verified: matchedUserId ? true : false,
                            profile_img: staged.photo_url || null
                        })
                        .select("id")
                        .single();

                    if (masterErr || !newMaster) {
                        console.error(`[approveRoster] Fallback create master player failed for ${staged.name}:`, masterErr);
                        continue;
                    }
                    finalMasterId = newMaster.id;
                }

                // Insert into tournament_players ONLY (referencing master_players directly)
                const { error: tpError } = await adminSupabase
                    .from("tournament_players")
                    .insert({
                        tournament_team_id: registrationId,
                        master_player_id: finalMasterId,
                        position: staged.position || null,
                        shirt_number: staged.shirt_number || null
                    });
                if (tpError) {
                    console.error(`[approveRoster] Failed to insert into tournament_players:`, tpError);
                    return { success: false, error: `Failed to insert player ${staged.name}: ${tpError.message}` };
                }
            }
        }

        const { error } = await adminSupabase
            .from("tournament_teams")
            .update({
                roster_status: 'approved',
                is_roster_locked: true
            })
            .eq("id", registrationId);

        if (error) {
            return { success: false, error: "Failed to approve roster: " + error.message };
        }

        // Update the status of pending submissions to 'approved'
        await adminSupabase
            .from("tournament_roster_submissions")
            .update({ status: 'approved' })
            .eq("tournament_team_id", registrationId)
            .eq("status", "pending");

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true, message: "Roster approved successfully!" };
    } catch (e: any) {
        console.error("Error in approveRoster:", e);
        return { success: false, error: e.message || "An unexpected error occurred." };
    }
}

export async function rejectRoster(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({
            roster_status: 'rejected',
            is_roster_locked: false
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to reject roster: " + error.message };
    }

    // Update the status of pending submissions to 'rejected'
    await adminSupabase
        .from("tournament_roster_submissions")
        .update({ status: 'rejected' })
        .eq("tournament_team_id", registrationId)
        .eq("status", "pending");

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, message: "Roster rejected successfully!" };
}

export async function requestRosterAddition(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: participation } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            teams ( user_id )
        `)
        .eq("id", registrationId)
        .single();

    if (!participation) return { success: false, error: "Registration not found" };

    const teamOwnerId = (participation.teams as any)?.user_id;
    if (teamOwnerId !== user.id) {
        return { success: false, error: "Unauthorized to manage this roster" };
    }

    // Set roster status to pending and unlock it temporarily so they can add players
    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({
            roster_status: 'pending',
            is_roster_locked: false
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to request roster addition: " + error.message };
    }

    revalidatePath(`/dashboard/registration/${tournamentId}`);
    return { success: true, message: "Roster addition requested successfully! Roster unlocked." };
}

export async function requestRosterUnlock(
    registrationId: string
): Promise<ActionResponse> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: participation } = await adminSupabase
        .from("tournament_teams")
        .select(`
            id,
            team_id,
            teams ( user_id )
        `)
        .eq("id", registrationId)
        .single();

    if (!participation) return { success: false, error: "Registration not found" };

    const teamOwnerId = (participation.teams as any)?.user_id;
    if (teamOwnerId !== user.id) {
        return { success: false, error: "Unauthorized to manage this roster" };
    }

    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({
            unlock_requested: true
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to request unlock: " + error.message };
    }

    return { success: true, message: "Unlock request submitted successfully!" };
}

export async function approveRosterUnlock(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({
            unlock_requested: false,
            is_roster_locked: false,
            roster_status: 'pending'
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to approve unlock: " + error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, message: "Roster unlocked successfully!" };
}

export async function rejectRosterUnlock(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const access = await validateTournamentAccess(tournamentId, 'admin');
    if (!access.success) return { success: false, error: access.error };

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from("tournament_teams")
        .update({
            unlock_requested: false
        })
        .eq("id", registrationId);

    if (error) {
        return { success: false, error: "Failed to reject unlock: " + error.message };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true, message: "Unlock request rejected." };
}
