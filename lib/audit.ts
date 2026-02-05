import { createClient } from "@/utils/supabase/server";

export async function logActivity(
    action: string,
    targetType: string,
    targetId: string,
    details: any = null
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Best effort logging - don't block main thread if possible, but here we await to ensure it's recorded
        // In high scalability systems, push to a queue. Here direct insert is fine.

        await supabase.from('audit_logs').insert({
            user_id: user?.id || null, // Null for system actions or unauth (shouldn't happen much)
            action,
            target_type: targetType,
            target_id: targetId,
            details,
            // ip_address: headers().get("x-forwarded-for") // Optional: Need to pass headers
        });

    } catch (error) {
        console.error("Failed to log activity:", error);
        // Don't throw, we don't want to break the app because logging failed
    }
}
