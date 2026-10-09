"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";
import { validateTournamentAccess } from "@/lib/security";
import { uploadToR2 } from "@/lib/r2";
import { getServerSession } from "@/lib/auth-server";
import { classifyPlayerNames } from "@/lib/name-helper";

async function getStaffUser(): Promise<{ id: string; email: string; full_name?: string; phone?: string } | null> {
    try {
        const session = await getServerSession();
        if (session?.user) {
            return {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.full_name,
                phone: (session.user as any).phone || (session.user as any).tel || (session.user as any).user_metadata?.phone
            };
        }
    } catch (e) {
        console.error("Error in getServerSession:", e);
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            return {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || '',
                phone: user.phone || user.user_metadata?.phone || user.user_metadata?.tel
            };
        }
    } catch (e) {
        console.error("Error in supabase.auth.getUser:", e);
    }
    return null;
}

/**
 * Automatically sync/populate players into tournament_roster_submissions table (as pending)
 * for a given tournament_team (registrationId) from the team's roster in the `players` table.
 */
export async function populateTournamentRosterSubmissionsFromGlobalTeam(
    tournamentTeamId: string,
    globalTeamId: string
): Promise<void> {
    const adminSupabase = createAdminClient();

    // 1. Fetch all players belonging to the global team
    const { data: teamPlayers, error: playersErr } = await adminSupabase
        .from("players")
        .select("id, first_name, last_name, jersey_number, shirt_number, position, photo_url, date_of_birth, master_player_id, master_players(id, tel, photo_url)")
        .eq("team_id", globalTeamId);

    if (playersErr) {
        console.error("[populateTournamentRosterSubmissionsFromGlobalTeam] Error fetching team players:", playersErr);
        return;
    }

    if (!teamPlayers || teamPlayers.length === 0) {
        return;
    }

    for (const player of teamPlayers) {
        let masterPlayerId = player.master_player_id;
        const firstName = (player.first_name || '').trim();
        const lastName = (player.last_name && player.last_name !== '-' ? player.last_name : '').trim();
        const rawName = `${firstName} ${lastName}`.trim();
        if (!rawName) continue;

        const mpData = player.master_players as unknown as { id?: string; tel?: string; photo_url?: string } | null;
        let playerTel = mpData?.tel || null;
        let playerPhoto = player.photo_url || mpData?.photo_url || null;

        // 2. If player does not have a master_player_id, link or create one
        if (!masterPlayerId) {
            const classified = classifyPlayerNames({
                name: rawName,
                first_name: firstName,
                last_name: lastName || '-',
            });

            // Try to match existing master player by phone first, then name
            let matchedMaster: { id: string; tel?: string; photo_url?: string } | null = null;
            if (playerTel) {
                const { data: byTel } = await adminSupabase
                    .from("master_players")
                    .select("id, tel, photo_url")
                    .eq("tel", playerTel)
                    .maybeSingle();
                matchedMaster = byTel;
            }

            if (!matchedMaster) {
                const searchPattern = `%${firstName}%`;
                const { data: byName } = await adminSupabase
                    .from("master_players")
                    .select("id, tel, photo_url")
                    .or(`first_name_local.ilike.${searchPattern},last_name_local.ilike.${searchPattern},first_name_intl.ilike.${searchPattern},last_name_intl.ilike.${searchPattern}`)
                    .is("deleted_at", null)
                    .limit(1)
                    .maybeSingle();
                matchedMaster = byName;
            }

            if (matchedMaster) {
                masterPlayerId = matchedMaster.id;
                if (!playerTel && matchedMaster.tel) playerTel = matchedMaster.tel;
                if (!playerPhoto && matchedMaster.photo_url) playerPhoto = matchedMaster.photo_url;
            } else {
                // Create master_player
                const { data: createdMaster, error: masterCreateErr } = await adminSupabase
                    .from("master_players")
                    .insert({
                        first_name_local: classified.first_name_local,
                        middle_name_local: classified.middle_name_local,
                        last_name_local: classified.last_name_local,
                        first_name_intl: classified.first_name_intl,
                        middle_name_intl: classified.middle_name_intl,
                        last_name_intl: classified.last_name_intl,
                        gender: 'unspecified',
                        birthday: player.date_of_birth || null,
                        tel: playerTel || null,
                        photo_url: playerPhoto || null,
                        status: 'active',
                        verified: false,
                    })
                    .select("id")
                    .single();

                if (!masterCreateErr && createdMaster) {
                    masterPlayerId = createdMaster.id;
                }
            }

            if (masterPlayerId) {
                await adminSupabase
                    .from("players")
                    .update({ master_player_id: masterPlayerId })
                    .eq("id", player.id);
            }
        }

        const shirtNum = player.shirt_number || (player.jersey_number !== null && player.jersey_number !== undefined ? String(player.jersey_number) : null);

        // 3. Insert or check in tournament_roster_submissions
        const { data: existingSub } = await adminSupabase
            .from("tournament_roster_submissions")
            .select("id, status")
            .eq("tournament_team_id", tournamentTeamId)
            .eq("name", rawName)
            .is("deleted_at", null)
            .maybeSingle();

        if (!existingSub) {
            const { error: insertErr } = await adminSupabase
                .from("tournament_roster_submissions")
                .insert({
                    tournament_team_id: tournamentTeamId,
                    master_player_id: masterPlayerId || null,
                    player_id: player.id || null,
                    name: rawName,
                    shirt_number: shirtNum,
                    position: player.position || null,
                    tel: playerTel || null,
                    photo_url: playerPhoto || null,
                    status: 'pending'
                });

            if (insertErr) {
                console.error("[populateTournamentRosterSubmissionsFromGlobalTeam] Insert submission error for " + rawName + ":", insertErr);
            }
        }
    }

    // Set tournament_teams.roster_status to pending so Organizer sees it in inboxes
    await adminSupabase
        .from("tournament_teams")
        .update({
            roster_status: 'pending',
            updated_at: new Date().toISOString()
        })
        .eq("id", tournamentTeamId);
}

/**
 * Automatically sync/populate players into tournament_players table
 * for a given tournament_team (registrationId) from the team's roster in the `players` table.
 */
export async function populateTournamentPlayersFromGlobalTeam(
    tournamentTeamId: string,
    globalTeamId: string
): Promise<void> {
    // Populate into tournament_roster_submissions first
    await populateTournamentRosterSubmissionsFromGlobalTeam(tournamentTeamId, globalTeamId);
}

export async function approveRegistration(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        try {
            await fetch(`${apiUrl}/tournaments/${tournamentId}/registrations/${registrationId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    status: 'approved',
                    payment_status: 'paid',
                    registration_status: 'approved',
                }),
            });
        } catch (fetchErr) {
            console.error("Go API fetch error in approveRegistration:", fetchErr);
        }

        // Direct DB update safeguard
        const adminSupabase = createAdminClient();
        const { data: updatedTeam, error: dbError } = await adminSupabase
            .from("tournament_teams")
            .update({
                payment_status: 'paid',
                registration_status: 'approved',
                updated_at: new Date().toISOString(),
            })
            .eq("id", registrationId)
            .select("id, team_id")
            .single();

        if (dbError) {
            console.error("Supabase direct DB update error:", dbError);
        }

        // Populate tournament_players from global team roster
        if (updatedTeam?.team_id) {
            await populateTournamentPlayersFromGlobalTeam(registrationId, updatedTeam.team_id).catch(err => {
                console.error("Error populating tournament_players in approveRegistration:", err);
            });
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true, message: "Registration approved and synced!" };
    } catch (e) {
        console.error("Error approving registration:", e);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function rejectRegistration(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        try {
            await fetch(`${apiUrl}/tournaments/${tournamentId}/registrations/${registrationId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    status: 'rejected',
                    payment_status: 'rejected',
                    registration_status: 'rejected',
                }),
            });
        } catch (fetchErr) {
            console.error("Go API fetch error in rejectRegistration:", fetchErr);
        }

        // Direct DB update safeguard
        const adminSupabase = createAdminClient();
        const { error: dbError } = await adminSupabase
            .from("tournament_teams")
            .update({
                payment_status: 'rejected',
                registration_status: 'rejected',
                roster_status: 'rejected',
                updated_at: new Date().toISOString(),
            })
            .eq("id", registrationId);

        if (dbError) {
            console.error("Supabase direct DB update error:", dbError);
        }

        revalidatePath(`/dashboard/tournaments/${tournamentId}`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true, message: "Registration rejected" };
    } catch (e) {
        console.error("Error rejecting registration:", e);
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function submitRosterWithSender(
    formData: FormData
): Promise<ActionResponse> {
    try {
        const user = await getStaffUser();
        if (!user) return { success: false, error: "Authentication required" };
        const adminSupabase = createAdminClient();

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
                contact_phone,
                contact_name,
                team_id,
                teams ( user_id, sport_id ),
                tournament_category_id,
                tournament_categories ( tournament_id )
            `)
            .eq("id", tournamentTeamId)
            .single();

        if (!participation) return { success: false, error: "Registration record not found" };

        const teamOwnerId = (participation.teams as unknown as { user_id: string } | null)?.user_id;
        if (teamOwnerId !== user.id) {
            return { success: false, error: "Unauthorized to manage this roster" };
        }

        // Verify contact phone matches the registration phone
        const cleanSenderPhone = senderPhone.replace(/\D/g, "");
        const registeredPhone = (participation.contact_phone || "").replace(/\D/g, "");

        if (registeredPhone && cleanSenderPhone !== registeredPhone) {
            return {
                success: false,
                error: "เบอร์โทรศัพท์ไม่ตรงกับเบอร์ที่ใช้ลงทะเบียนทีม กรุณาตรวจสอบเบอร์โทรศัพท์ของผู้สมัคร"
            };
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
        const tournamentId = (participation.tournament_categories as unknown as { tournament_id: string } | null)?.tournament_id;

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

            // Upload photo to R2 storage if present
            if (photoFile && photoFile.size > 0) {
                const fileExt = photoFile.name.split('.').pop() || 'jpg';
                const fileName = `players/${tournamentTeamId}/photo_${i}_${Date.now()}.${fileExt}`;
                const uploadRes = await uploadToR2(photoFile, fileName, photoFile.type);
                
                if (uploadRes.success && uploadRes.url) {
                    photoUrl = uploadRes.url;
                } else {
                    console.error(`[submitRosterWithSender] Photo upload failed for ${name}:`, uploadRes.error);
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

            const classified = classifyPlayerNames({ name, first_name: firstName, last_name: lastName });

            if (!existingMaster) {
                const searchPattern = `%${name.trim()}%`;
                const { data: byName } = await adminSupabase
                    .from("master_players")
                    .select("id")
                    .or(`first_name_local.ilike.${searchPattern},last_name_local.ilike.${searchPattern},first_name_intl.ilike.${searchPattern},last_name_intl.ilike.${searchPattern}`)
                    .limit(1)
                    .maybeSingle();
                if (byName) {
                    existingMaster = byName;
                }
            }

            // Create in master_players if not exists
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
                        first_name_local: classified.first_name_local,
                        middle_name_local: classified.middle_name_local,
                        last_name_local: classified.last_name_local,
                        first_name_intl: classified.first_name_intl,
                        middle_name_intl: classified.middle_name_intl,
                        last_name_intl: classified.last_name_intl,
                        gender: 'unspecified',
                        birthday: null,
                        tel: tel || null,
                        photo_url: photoUrl || null,
                        status: 'active',
                        verified: matchedUserId ? true : false,
                    })
                    .select("id")
                    .single();

                if (masterErr || !newMaster) {
                    console.error(`[submitRosterWithSender] Create master player failed for ${name}:`, masterErr);
                } else {
                    existingMaster = newMaster;
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
                const { error: updateErr } = await adminSupabase
                    .from("tournament_roster_submissions")
                    .update({
                        shirt_number: number || null,
                        position: position || null,
                        tel: tel || null,
                        status: 'pending',
                        ...(photoUrl ? { photo_url: photoUrl } : {})
                    })
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
    } catch (e) {
        console.error("Error in submitRosterWithSender:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
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
        const { data: teamReg } = await adminSupabase
            .from("tournament_teams")
            .select("id, registration_status")
            .eq("id", registrationId)
            .single();

        if (teamReg && teamReg.registration_status !== 'approved') {
            await adminSupabase
                .from("tournament_teams")
                .update({
                    payment_status: 'paid',
                    registration_status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", registrationId);
        }

        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}/registrations/${registrationId}/approve-roster`, {
            method: 'POST',
            headers,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to approve roster" };
        }

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        revalidatePath(`/dashboard/inboxes`);
        return { success: true, message: "Roster approved successfully!" };
    } catch (e) {
        console.error("Error in approveRoster:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

export async function rejectRoster(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'admin');
        if (!access.success) return { success: false, error: access.error };

        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournaments/${tournamentId}/registrations/${registrationId}/reject-roster`, {
            method: 'POST',
            headers,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to reject roster" };
        }

        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        revalidatePath(`/dashboard/inboxes`);
        return { success: true, message: "Roster rejected successfully!" };
    } catch (e) {
        console.error("Error in rejectRoster:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

export async function approveSingleRosterSubmission(
    submissionId: string,
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'admin');
        if (!access.success) return { success: false, error: access.error };

        const adminSupabase = createAdminClient();
        const { data: teamReg } = await adminSupabase
            .from("tournament_teams")
            .select("id, registration_status")
            .eq("id", registrationId)
            .single();

        if (teamReg && teamReg.registration_status !== 'approved') {
            await adminSupabase
                .from("tournament_teams")
                .update({
                    payment_status: 'paid',
                    registration_status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", registrationId);
        }

        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournament-roster-submissions/${submissionId}/approve`, {
            method: 'POST',
            headers,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to approve player" };
        }

        revalidatePath(`/dashboard/inboxes`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true, message: "Player approved successfully!" };
    } catch (e) {
        console.error("Error in approveSingleRosterSubmission:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

export async function approveSelectedRosterSubmissions(
    submissionIds: string[],
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    try {
        if (!submissionIds || submissionIds.length === 0) {
            return { success: false, error: "No players selected." };
        }

        const access = await validateTournamentAccess(tournamentId, 'admin');
        if (!access.success) return { success: false, error: access.error };

        const adminSupabase = createAdminClient();
        const { data: teamReg } = await adminSupabase
            .from("tournament_teams")
            .select("id, registration_status")
            .eq("id", registrationId)
            .single();

        if (teamReg && teamReg.registration_status !== 'approved') {
            await adminSupabase
                .from("tournament_teams")
                .update({
                    payment_status: 'paid',
                    registration_status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", registrationId);
        }

        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournament-teams/${registrationId}/roster/batch-approve`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ submission_ids: submissionIds }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to approve selected players" };
        }

        revalidatePath(`/dashboard/inboxes`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true, message: `Approved ${submissionIds.length} players successfully!` };
    } catch (e) {
        console.error("Error in approveSelectedRosterSubmissions:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

export async function rejectSingleRosterSubmission(
    submissionId: string,
    registrationId: string,
    tournamentId: string,
    rejectionReason?: string
): Promise<ActionResponse> {
    try {
        const access = await validateTournamentAccess(tournamentId, 'admin');
        if (!access.success) return { success: false, error: access.error };

        const session = await getServerSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const res = await fetch(`${apiUrl}/tournament-roster-submissions/${submissionId}/reject`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reason: rejectionReason || 'ไม่ผ่านเกณฑ์การตรวจสอบ' }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Failed to reject player" };
        }

        revalidatePath(`/dashboard/inboxes`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);
        return { success: true, message: "Player rejected successfully!" };
    } catch (e) {
        console.error("Error in rejectSingleRosterSubmission:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

export async function submitTournamentRoster(
    tournamentTeamId: string,
    formData: FormData
): Promise<ActionResponse> {
    try {
        const adminSupabase = createAdminClient();

        // 1. Verify tournament_teams exists, or fallback if passed global team_id
        let targetId = tournamentTeamId;
        let tournamentId: string | null = null;

        const { data: tt } = await adminSupabase
            .from("tournament_teams")
            .select("id, tournament_id, team_id")
            .eq("id", tournamentTeamId)
            .maybeSingle();

        if (tt) {
            targetId = tt.id;
            tournamentId = tt.tournament_id;
        } else {
            // Check if passed global teamId
            const { data: ttByGlobal } = await adminSupabase
                .from("tournament_teams")
                .select("id, tournament_id")
                .eq("team_id", tournamentTeamId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (ttByGlobal) {
                targetId = ttByGlobal.id;
                tournamentId = ttByGlobal.tournament_id;
            }
        }

        // Parse players from FormData
        const playersJson = formData.get("players") as string;
        const deletedIdsJson = formData.get("deleted_player_ids") as string;

        let players: any[] = [];
        let deletedPlayerIds: string[] = [];

        if (playersJson) {
            try {
                players = JSON.parse(playersJson);
            } catch (e) {
                console.error("Error parsing players JSON:", e);
            }
        }
        if (deletedIdsJson) {
            try {
                deletedPlayerIds = JSON.parse(deletedIdsJson);
            } catch (e) {
                console.error("Error parsing deleted ids JSON:", e);
            }
        }

        const nowIso = new Date().toISOString();

        // 2. Process deletions: Soft-delete in tournament_roster_submissions & delete from tournament_players
        if (deletedPlayerIds && deletedPlayerIds.length > 0) {
            // Check tournament_roster_submissions matching these IDs or names
            await adminSupabase
                .from("tournament_roster_submissions")
                .update({ deleted_at: nowIso })
                .in("id", deletedPlayerIds)
                .eq("tournament_team_id", targetId);

            // Also remove from active tournament_players
            await adminSupabase
                .from("tournament_players")
                .delete()
                .in("id", deletedPlayerIds)
                .eq("tournament_team_id", targetId);
        }

        // 3. Process each player submitted
        for (let i = 0; i < players.length; i++) {
            const p = players[i];
            const name = (p.name || `${p.firstName || ''} ${p.lastName || ''}`).trim();
            if (!name) continue;

            const fullNameWithNickname = p.nickname?.trim() ? `${name} (${p.nickname.trim()})` : name;

            let photoUrl = p.photoPreview || null;
            const photoFile = formData.get(`photo_${i}`) as File | null;
            if (photoFile && photoFile.size > 0) {
                try {
                    const uploadRes = await uploadToR2(photoFile, "players");
                    if (uploadRes.success && uploadRes.url) {
                        photoUrl = uploadRes.url;
                    }
                } catch (upErr) {
                    console.error("Error uploading player photo to R2:", upErr);
                }
            }

            let resolvedPosition = p.position || "";
            if (p.memberType === "manager") resolvedPosition = "ผู้จัดการทีม";
            else if (p.memberType === "head_coach") resolvedPosition = "ผู้ฝึกสอน";
            else if (p.memberType === "assistant_coach") resolvedPosition = "ผู้ช่วยผู้ฝึกสอน";

            // Check if submission already exists in tournament_roster_submissions for this team
            const { data: existingSub } = await adminSupabase
                .from("tournament_roster_submissions")
                .select("id, status, deleted_at")
                .eq("tournament_team_id", targetId)
                .eq("name", fullNameWithNickname)
                .maybeSingle();

            if (existingSub) {
                // If it was previously approved, keep 'approved' status! (Rule 1)
                // If it was soft-deleted, restore it
                const nextStatus = existingSub.status === 'approved' ? 'approved' : 'pending';
                await adminSupabase
                    .from("tournament_roster_submissions")
                    .update({
                        shirt_number: p.number ? String(p.number) : null,
                        position: resolvedPosition || null,
                        tel: p.tel || null,
                        status: nextStatus,
                        deleted_at: null,
                        updated_at: nowIso,
                        ...(photoUrl ? { photo_url: photoUrl } : {})
                    })
                    .eq("id", existingSub.id);
            } else {
                // New submission -> Insert as pending (Rule 1)
                await adminSupabase
                    .from("tournament_roster_submissions")
                    .insert({
                        tournament_team_id: targetId,
                        name: fullNameWithNickname,
                        shirt_number: p.number ? String(p.number) : null,
                        position: resolvedPosition || null,
                        tel: p.tel || null,
                        photo_url: photoUrl,
                        status: 'pending',
                        created_at: nowIso,
                        updated_at: nowIso
                    });
            }
        }

        // 4. Update tournament_teams status to 'pending' if there are pending submissions
        const { count: pendingSubCount } = await adminSupabase
            .from("tournament_roster_submissions")
            .select("id", { count: 'exact', head: true })
            .eq("tournament_team_id", targetId)
            .eq("status", "pending")
            .is("deleted_at", null);

        if (pendingSubCount && pendingSubCount > 0) {
            await adminSupabase
                .from("tournament_teams")
                .update({
                    roster_status: 'pending',
                    unlock_requested: false,
                    updated_at: nowIso
                })
                .eq("id", targetId);
        }

        revalidatePath(`/dashboard/inboxes`);
        revalidatePath(`/dashboard/tournament-teams/${targetId}`);
        if (tournamentId) {
            revalidatePath(`/tournaments/${tournamentId}`);
        }

        return { success: true, message: "Roster submitted to inbox successfully!" };
    } catch (e) {
        console.error("Error in submitTournamentRoster:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

export async function requestRosterAddition(
    registrationId: string,
    tournamentId: string
): Promise<ActionResponse> {
    const adminSupabase = createAdminClient();
    const user = await getStaffUser();
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

    const teamOwnerId = (participation.teams as unknown as { user_id: string } | null)?.user_id;
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
    const adminSupabase = createAdminClient();
    const user = await getStaffUser();
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

    const teamOwnerId = (participation.teams as unknown as { user_id: string } | null)?.user_id;
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

export async function getPendingInboxCount(): Promise<ActionResponse<number>> {
    const adminSupabase = createAdminClient();
    const user = await getStaffUser();

    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    // 1. Fetch all tournaments owned by user
    const { data: ownedTournaments } = await adminSupabase
        .from("tournaments")
        .select("id")
        .eq("organizer_id", user.id);

    // 2. Fetch all tournaments where the user is an accepted collaborator
    const { data: collaboratedTournaments } = await adminSupabase
        .from("tournament_invitations")
        .select("tournament_id")
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .is("deleted_at", null);

    const tournamentIds = [
        ...(ownedTournaments || []).map(t => t.id),
        ...(collaboratedTournaments || []).map(t => t.tournament_id)
    ];

    if (tournamentIds.length === 0) {
        return { success: true, data: 0 };
    }

    // 3. Fetch all categories of those tournaments
    const { data: categories } = await adminSupabase
        .from("tournament_categories")
        .select("id")
        .in("tournament_id", tournamentIds)
        .is("deleted_at", null);

    if (!categories || categories.length === 0) {
        return { success: true, data: 0 };
    }

    const categoryIds = categories.map(c => c.id);

    // 4. Query tournament_teams for pending count
    const { data: teams, error } = await adminSupabase
        .from("tournament_teams")
        .select("registration_status, roster_status, contact_name, contact_phone, unlock_requested")
        .in("tournament_category_id", categoryIds)
        .is("deleted_at", null);

    if (error) {
        console.error("Error fetching pending inbox count:", error);
        return { success: false, error: error.message };
    }

    const pendingCount = (teams || []).filter(item => 
        item.registration_status === 'pending' || 
        item.unlock_requested === true || 
        (item.roster_status === 'pending' && (item.contact_name || item.contact_phone))
    ).length;

    return { success: true, data: pendingCount };
}

export async function withdrawTournamentTeam(
    registrationId: string
): Promise<ActionResponse> {
    try {
        const session = await getServerSession();
        const user = session?.user;

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }

        const res = await fetch(`${apiUrl}/tournament-teams/${registrationId}/withdraw`, {
            method: 'POST',
            headers,
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Go API withdraw error:", errData);
            return { success: false, error: errData.error || "Failed to withdraw team" };
        }

        revalidatePath(`/dashboard/teams`);
        revalidatePath(`/dashboard/tournament-teams/${registrationId}`);
        revalidatePath(`/dashboard/inboxes`);
        revalidatePath(`/tournaments`);

        return { success: true, message: "ถอนทีมเรียบร้อยแล้ว" };
    } catch (e: any) {
        console.error("Error in withdrawTournamentTeam:", e);
        return { success: false, error: e?.message || "An unexpected error occurred" };
    }
}

