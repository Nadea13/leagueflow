'use server';

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function deleteAccount() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot delete user.");
        throw new Error("System configuration error: Unable to process account deletion.");
    }

    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
        console.error("Error deleting user:", error);
        throw new Error(error.message);
    }

    // Clear session cookies
    await supabase.auth.signOut();

    redirect('/');
}



export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const fullName = formData.get("fullName") as string;

    const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}
