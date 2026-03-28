"use server";

import { ActionResponse } from "@/types/index";
import { createClient } from "@/utils/supabase/server";

export async function verifySlip(formData: FormData): Promise<ActionResponse<{ amount: number, referenceNo: string, publicUrl: string }>> {
    try {
        const file = formData.get("slip") as File;
        if (!file) {
            return { success: false, error: "No slip file provided" };
        }

        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: "File size must be less than 5MB" };
        }

        if (!file.type.startsWith("image/")) {
            return { success: false, error: "File must be an image" };
        }

        const supabase = await createClient();

        // Get current user for path organization
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const referenceNo = `SLIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `billing/${user.id}/${referenceNo}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('slips')
            .upload(fileName, file);

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return { success: false, error: "Failed to upload slip image" };
        }

        const { data: urlData } = supabase.storage
            .from('slips')
            .getPublicUrl(fileName);

        return {
            success: true,
            data: {
                amount: 0, // Admin will verify the amount
                referenceNo: referenceNo,
                publicUrl: urlData.publicUrl
            }
        };

    } catch (error: any) {
        console.error("Slip verification error:", error);
        return {
            success: false,
            error: error?.message || "Failed to verify slip"
        };
    }
}
