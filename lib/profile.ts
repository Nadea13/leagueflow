import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures a profile exists in the public.profiles table for the given user.
 * This acts as a safety net if the database trigger fails or hasn't fired yet.
 */
export async function ensureProfileExists(supabase: SupabaseClient, user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
    const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

    if (fetchError || !profile) {
        console.log(`Profile missing for user ${user.id}, creating...`);
        const { error: insertError } = await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                role: 'user' // Default role
            });
        
        if (insertError) {
            console.error("Error creating profile safely:", insertError.message);
            return false;
        }
        return true;
    }

    return true;
}
