"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const fullName = formData.get("fullName") as string;

    const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/profile");
    return { success: true };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}
