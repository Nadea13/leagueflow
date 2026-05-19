import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures a profile exists in the public.users table for the given user.
 * This acts as a safety net if the database trigger fails or hasn't fired yet.
 */
export async function ensureProfileExists(supabase: SupabaseClient, user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
    const { data: profile, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (fetchError || !profile) {
        console.log(`Profile missing for user ${user.id}, creating...`);
        const { error: insertError } = await supabase
            .from("users")
            .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                role: 'player', // Default role
                is_organizer: false,
                is_team_manager: false
            });
        
        if (insertError) {
            console.error("Error creating profile safely:", insertError.message);
            return false;
        }
        return true;
    }

    return true;
}
