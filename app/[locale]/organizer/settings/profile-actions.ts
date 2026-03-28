'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/types/index";

export async function registerAsOrganizer(): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ is_organizer: true })
        .eq("id", user.id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
