'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ActionResponse } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateUploadedFile } from "@/lib/file-validation";

// Zod Schema for Validation (Basic fields, slip validated conditionally)
const registrationSchema = z.object({
    tournamentId: z.string().uuid(),
    tournamentCategoryId: z.string().uuid().optional().nullable(),
    teamName: z.string().min(2, "Team name must be at least 2 characters"),
    contactName: z.string().min(2, "Contact name must be at least 2 characters"),
    contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
    logoFile: z.unknown().optional().nullable(),
    logoUrl: z.string().optional().nullable(),
    existingTeamId: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    slipFile: z.unknown().optional().nullable(),
});

// Mock Slip Verification Function
async function mockVerifySlip(_file: File, expectedAmount: number, expectedReceiver: string | null) {
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
        tournamentCategoryId: formData.get("tournamentCategoryId") || null,
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
    console.log("[registerTeam] Raw data keys present:", Object.keys(rawData).filter(k => (rawData as Record<string, unknown>)[k]));

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

    const {
        tournamentId,
        tournamentCategoryId,
        teamName,
        contactName,
        contactPhone,
        slipFile,
        logoFile,
        logoUrl,
        existingTeamId,
        description
    } = validation.data;

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

        // Fetch category
        let categoryQuery = supabase
            .from("tournament_categories")
            .select("id, max_teams")
            .eq("tournament_id", tournamentId)
            .is("deleted_at", null);

        categoryQuery = tournamentCategoryId
            ? categoryQuery.eq("id", tournamentCategoryId)
            : categoryQuery.order("created_at", { ascending: true }).limit(1);

        const { data: tournamentCategory, error: catError } = await categoryQuery.maybeSingle();

        if (catError || !tournamentCategory) {
            return { success: false, error: "Tournament category setup not found" };
        }

        // Check Team Limit
        const { count } = await supabase
            .from("tournament_teams")
            .select("*", { count: 'exact', head: true })
            .eq("tournament_category_id", tournamentCategory.id)
            .is("deleted_at", null);

        const limit = tournamentCategory.max_teams || 8;
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
            const fileCheck = validateUploadedFile(logoFile);
            if (!fileCheck.valid) return { success: false, error: fileCheck.error };

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

            const { transRef: vTransRef, amount, receiverAccount: _receiverAccount } = verificationResult.data;
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
                .from("tournament_teams")
                .select("id")
                .eq("remark", transRef)
                .is("deleted_at", null)
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

        // 5. Create Team and Tournament Team Participation record
        console.log("[registerTeam] Creating tournament team entry...");
        const adminSupabase = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        let finalTeamId = existingTeamId;

        if (!finalTeamId) {
            // Insert into global teams table
            const { data: newTeam, error: teamInsertError } = await adminSupabase
                .from("teams")
                .insert({
                    name: teamName,
                    sport_id: tournament.sport_id,
                    user_id: user?.id || null,
                    description: description || '',
                    logo_img: finalLogoUrl,
                    contact_name: contactName,
                    contact_phone: contactPhone,
                    contact_email: user?.email || '',
                    is_roster_locked: false,
                })
                .select("id")
                .single();

            if (teamInsertError || !newTeam) {
                console.error("Team insertion failed", teamInsertError);
                return { success: false, error: `Failed to create team: ${teamInsertError?.message}` };
            }
            finalTeamId = newTeam.id;
        }

        // Insert registration record directly in tournament_teams
        const { data: _registeredTeam, error: regError } = await adminSupabase
            .from("tournament_teams")
            .insert({
                tournament_category_id: tournamentCategory.id,
                team_id: finalTeamId,
                user_id: user?.id || null,
                payment_status: 'pending',
                slip_img: publicUrl,
                registration_status: 'pending',
                remark: transRef || null,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (regError) {
            console.error("Registration insertion failed", regError);
            // Cleanup the created team if it was a new team and insert fails
            if (!existingTeamId) {
                await adminSupabase.from("teams").delete().eq("id", finalTeamId);
            }
            return { success: false, error: `Failed to save registration: ${regError.message}` };
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

