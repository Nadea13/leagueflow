import { createClient } from "@/lib/supabase/server";

/**
 * Server-side guard to ensure the current session is an administrator.
 * Returns the supabase client, user, and authorization status.
 */
export async function requireAdminAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return { authorized: false as const, error: "Unauthorized" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { authorized: false as const, error: "Forbidden: Admins only" };
    }

    return { authorized: true as const, user, supabase };
}
