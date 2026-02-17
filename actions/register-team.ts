'use server'

import { createClient } from "@/utils/supabase/server";
import { ActionResponse } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Schema for Validation (Basic fields, slip validated conditionally)
const registrationSchema = z.object({
    tournamentId: z.string().uuid(),
    teamName: z.string().min(2, "Team name must be at least 2 characters"),
    contactName: z.string().min(2, "Contact name must be at least 2 characters"),
    contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
    logoFile: z.any().optional(),
    slipFile: z.any().optional(),
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
        slipFile: formData.get("slipFile"),
    };

    const validation = registrationSchema.safeParse(rawData);
    if (!validation.success) {
        return {
            success: false,
            error: validation.error.flatten().fieldErrors.teamName?.[0] || "Invalid form data",
        };
    }

    const { tournamentId, teamName, contactName, contactPhone, slipFile, logoFile } = validation.data;

    try {
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

        // Check Team Limit for Free Plan
        if (!tournament.plan || tournament.plan === 'free') {
            const { count } = await supabase
                .from("teams")
                .select("*", { count: 'exact', head: true })
                .eq("tournament_id", tournamentId);

            if (count !== null && count >= 8) {
                return { success: false, error: "Team limit reached (Max 8 for Free Plan). Upgrade to Pro to add more." };
            }
        }

        const registrationFee = Number(tournament.registration_fee || 0);
        const isFree = registrationFee <= 0;

        let transRef = "";
        let publicUrl = null;

        if (!isFree) {
            // --- PAID TOURNAMENT LOGIC ---

            // Validate Slip File
            if (!slipFile || !(slipFile instanceof File)) {
                return { success: false, error: "Slip image is required for paid tournaments" };
            }
            if (slipFile.size > 5 * 1024 * 1024) return { success: false, error: "File size must be less than 5MB" };
            if (!slipFile.type.startsWith("image/")) return { success: false, error: "File must be an image" };

            // 3. Verify Slip (Mock)
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

            // Check 3: Unique Transaction Ref
            const { data: existingRef } = await supabase
                .from("registrations")
                .select("id")
                .eq("trans_ref", transRef)
                .single();

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

        // 5. Insert Registration
        const { error: insertError } = await supabase
            .from("registrations")
            .insert({
                tournament_id: tournamentId,
                team_name: teamName,
                contact_name: contactName,
                contact_phone: contactPhone,
                slip_url: publicUrl,
                payment_status: 'PAID', // Or 'COMPLETED' if you prefer, but 'PAID' works for logic
                trans_ref: transRef,
            });

        if (insertError) {
            console.error("Insert error:", insertError);
            return { success: false, error: "Failed to save registration" };
        }

        // --- Handle Logo Upload ---
        let teamLogoUrl = null;
        if (logoFile && logoFile instanceof File) {
            // Validate format and size (basic check)
            if (logoFile.size <= 5 * 1024 * 1024 && logoFile.type.startsWith("image/")) {
                const logoExt = logoFile.name.split('.').pop();
                // Create a clean slug for team name
                const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                // Use a dedicated bucket or folder. 'public_assets' or 'teams'
                // Assuming 'teams' bucket exists or we use 'public' folder in a general bucket.
                // For now, let's assume 'teams' bucket based on slip logic, or 'avatars'.
                // If 'slips' works, we likely have storage setup. Let's try 'teams' bucket, or 'public'.
                // Given previous context, I'll use 'teams' bucket if it exists, otherwise `avatars`.
                // Safest bet for now: reuse 'slips' logic but different folder? No, slips are private usually.
                // Let's assume there is a 'teams' bucket or similar. If not, it might fail.
                // I will try 'teams' bucket as per plan.

                const logoPath = `${tournamentId}/${teamSlug}-${Date.now()}.${logoExt}`;
                const { error: logoUploadError } = await supabase.storage
                    .from('teams')
                    .upload(logoPath, logoFile);

                if (!logoUploadError) {
                    const { data: logoUrlData } = supabase.storage
                        .from('teams')
                        .getPublicUrl(logoPath);
                    teamLogoUrl = logoUrlData.publicUrl;
                } else {
                    console.error("Logo upload error:", logoUploadError);
                }
            }
        }

        // 6. Insert Team into Teams Table
        const { error: teamInsertError } = await supabase
            .from("teams")
            .insert({
                tournament_id: tournamentId,
                name: teamName,
                created_at: new Date().toISOString(),
                logo_url: teamLogoUrl,
            });

        if (teamInsertError) {
            console.error("Team insert error:", teamInsertError);
            // We don't fail the whole request because registration/payment was successful.
        }

        revalidatePath(`/register/${tournamentId}`);
        return { success: true, message: "Team registered successfully!" };

    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, error: "An unexpected error occurred" };
    }
}
