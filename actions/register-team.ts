'use server'

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { ActionResponse } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Schema for Validation (Basic fields, slip validated conditionally)
const registrationSchema = z.object({
    tournamentId: z.string().uuid(),
    teamName: z.string().min(2, "Team name must be at least 2 characters"),
    contactName: z.string().min(2, "Contact name must be at least 2 characters"),
    contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
    logoFile: z.any().optional().nullable(),
    logoUrl: z.string().optional().nullable(),
    existingTeamId: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    slipFile: z.any().optional().nullable(),
});

// Mock Slip Verification Function
async function mockVerifySlip(file: File, expectedAmount: number, expectedReceiver: string | null) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In a real scenario, we would send the file buffer to an external API (e.g., EasySlip)
    // const formData = new FormData();
    // formData.append("file", file);
    // const response = await axios.post("https://api.easyslip.com/v1/verify", formData, { headers: { ... } });

    // MOCK LOGIC: 
    // We assume the slip is valid if the file exists.
    // We generate a random transaction reference to simulate data extraction.

    const mockTransRef = `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const mockAmount = expectedAmount; // Simulate exact match for happy path
    const mockReceiver = expectedReceiver || "000-000-0000"; // Simulate match

    return {
        success: true,
        data: {
            transRef: mockTransRef,
            amount: mockAmount,
            receiverAccount: mockReceiver,
            timestamp: new Date().toISOString(),
        },
    };
}

export async function registerTeam(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Validate Form Data
    const rawData = {
        tournamentId: formData.get("tournamentId"),
        teamName: formData.get("teamName"),
        contactName: formData.get("contactName"),
        contactPhone: formData.get("contactPhone"),
        logoFile: formData.get("logoFile"),
        logoUrl: formData.get("logoUrl"),
        existingTeamId: formData.get("existingTeamId") || null,
        description: formData.get("description"),
        slipFile: formData.get("slipFile"),
    };

    console.log("[registerTeam] Initiating registration for tournament:", rawData.tournamentId);
    console.log("[registerTeam] Raw data keys present:", Object.keys(rawData).filter(k => (rawData as any)[k]));

    const validation = registrationSchema.safeParse(rawData);
    if (!validation.success) {
        console.error("[registerTeam] Validation errors:", validation.error.flatten().fieldErrors);
        const fieldErrors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(fieldErrors).flat()[0];
        return {
            success: false,
            error: firstError || "Invalid form data",
        };
    }

    console.log("[registerTeam] Fetching tournament details for id:", validation.data.tournamentId);

    const { tournamentId, teamName, contactName, contactPhone, slipFile, logoFile, logoUrl, existingTeamId, description } = validation.data;

    try {
        console.log("[registerTeam] Fetching tournament details...");
        const { data: tournament, error: tourneyError } = await supabase
            .from("tournaments")
            .select("*")
            .eq("id", tournamentId)
            .single();

        if (tourneyError || !tournament) {
            return { success: false, error: "Tournament not found" };
        }

        if (!tournament.is_registration_open) {
            return { success: false, error: "Registration is closed for this tournament" };
        }

        // Check Team Limit
        const { count } = await supabase
            .from("tournament_teams")
            .select("*", { count: 'exact', head: true })
            .eq("tournament_id", tournamentId);

        const limit = tournament.max_teams || 8;
        if (count !== null && count >= limit) {
            return { success: false, error: `Team limit reached (Max ${limit}).` };
        }

        const registrationFee = Number(tournament.registration_fee || 0);
        const isFree = registrationFee <= 0;

        let transRef = "";
        let publicUrl = null;
        let finalLogoUrl = logoUrl || null;

        console.log("[registerTeam] Tournament isFree:", isFree);

        // Handle Logo Upload if provided as file
        if (logoFile && logoFile instanceof File && logoFile.size > 0) {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `${tournamentId}/logo-${Date.now()}.${fileExt}`;
            const { error: logoUploadError } = await supabase.storage
                .from('team-logos')
                .upload(fileName, logoFile);

            if (!logoUploadError) {
                const { data: logoUrlData } = supabase.storage
                    .from('team-logos')
                    .getPublicUrl(fileName);
                finalLogoUrl = logoUrlData.publicUrl;
            }
        }

        if (!isFree) {
            // --- PAID TOURNAMENT LOGIC ---

            // Validate Slip File
            if (!slipFile || !(slipFile instanceof File)) {
                return { success: false, error: "Slip image is required for paid tournaments" };
            }
            if (slipFile.size > 5 * 1024 * 1024) return { success: false, error: "File size must be less than 5MB" };
            if (!slipFile.type.startsWith("image/")) return { success: false, error: "File must be an image" };

            // 3. Verify Slip (Mock)
            console.log("[registerTeam] Verifying slip...");
            const verificationResult = await mockVerifySlip(
                slipFile,
                registrationFee,
                tournament.bank_account_number
            );

            if (!verificationResult.success || !verificationResult.data) {
                return { success: false, error: "Slip verification failed: Invalid slip" };
            }

            const { transRef: vTransRef, amount, receiverAccount } = verificationResult.data;
            transRef = vTransRef;

            // Check 2: Amount
            if (amount < registrationFee) {
                return {
                    success: false,
                    error: `Insufficient payment amount. Expected ${registrationFee}, got ${amount}`
                };
            }

            // 3. Unique Transaction Ref (Use admin client to check existence)
            const adminSupabase = createAdminClient();
            const { data: existingRef } = await adminSupabase
                .from("registrations")
                .select("id")
                .eq("trans_ref", transRef)
                .maybeSingle();

            if (existingRef) {
                return { success: false, error: "This slip has already been used" };
            }

            // 4. Upload Slip to Storage
            const fileExt = slipFile.name.split('.').pop();
            const fileName = `${tournamentId}/${transRef}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('slips')
                .upload(fileName, slipFile);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                return { success: false, error: "Failed to upload slip image" };
            }

            // Get Public URL
            const { data: urlData } = supabase.storage
                .from('slips')
                .getPublicUrl(fileName);
            publicUrl = urlData.publicUrl;

        } else {
            // --- FREE TOURNAMENT LOGIC ---
            transRef = `FREE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            publicUrl = null;
        }

        // 5. Create Tournament Team Participation record immediately
        console.log("[registerTeam] Creating tournament team entry...");
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data: teamData, error: teamInsertError } = await adminSupabase
            .from("tournament_teams")
            .insert({
                tournament_id: tournamentId,
                team_id: existingTeamId || null,
                user_id: user?.id || null,
                name: teamName,
                description: description || null,
                logo_url: finalLogoUrl,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (teamInsertError) {
            console.error("Tournament team creation error:", teamInsertError);
            return { success: false, error: "Failed to initialize tournament squad" };
        }

        // 6. Copy Players immediately if from existing team
        if (existingTeamId) {
            console.log(`[Registration] Copying players from team ${existingTeamId} to ${teamData.id}`);
            const { data: sourcePlayers, error: fetchPlayersError } = await adminSupabase
                .from("players")
                .select("*")
                .or(`team_id.eq.${existingTeamId},global_team_id.eq.${existingTeamId}`);

            if (fetchPlayersError) {
                console.error("[Registration] Error fetching source players:", fetchPlayersError);
            } else if (sourcePlayers && sourcePlayers.length > 0) {
                const playersToInsert = sourcePlayers.map(p => ({
                    team_id: teamData.id,
                    global_team_id: null,
                    name: p.name,
                    number: p.number,
                    position: p.position,
                    global_player_id: p.global_player_id,
                    created_at: new Date().toISOString()
                }));

                const { error: playersInsertError } = await adminSupabase
                    .from("players")
                    .insert(playersToInsert);

                if (playersInsertError) {
                    console.error("[Registration] Error inserting players into tournament squad:", playersInsertError);
                } else {
                    console.log(`[Registration] Successfully copied ${playersToInsert.length} players.`);
                }
            } else {
                console.log("[Registration] Source team has no players to copy.");
            }
        }

        // 7. Insert Registration (Using Admin Client to bypass RLS)
        console.log("[registerTeam] Inserting registration record...");
        const { data: regData, error: insertError } = await adminSupabase
            .from("registrations")
            .insert({
                tournament_id: tournamentId,
                user_id: user?.id || null,
                team_name: teamName,
                contact_name: contactName,
                contact_phone: contactPhone,
                logo_url: finalLogoUrl,
                slip_url: publicUrl,
                description: description || null,
                payment_status: 'PENDING',
                trans_ref: transRef,
                existing_team_id: existingTeamId || null,
                tournament_team_id: teamData.id, // Store the link
            })
            .select()
            .single();

        if (insertError) {
            console.error("Registration insert error:", insertError);
            // Cleanup the created team if registration fails
            await adminSupabase.from("tournament_teams").delete().eq("id", teamData.id);
            return { success: false, error: "Failed to save registration" };
        }

        revalidatePath(`/register/${tournamentId}`);
        revalidatePath(`/organizer/tournaments/${tournamentId}`);

        console.log("[registerTeam] Registration successful!");
        return { success: true, message: "Registration submitted successfully! Please wait for manager approval." };

    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}
