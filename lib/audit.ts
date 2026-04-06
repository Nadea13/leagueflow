import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export async function logActivity(
    action: string,
    targetType: string,
    targetId: string,
    details: any = null
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get IP address from headers
        const headerList = await headers();
        const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] || 
                         headerList.get("x-real-ip") || 
                         headerList.get("remote-addr") || 
                         (process.env.NODE_ENV === 'development' ? "127.0.0.1" : "Unknown");

        await supabase.from('audit_logs').insert({
            user_id: user?.id || null,
            action,
            target_type: targetType,
            target_id: targetId,
            details,
            ip_address: ipAddress
        });

    } catch (error) {
        console.error("Failed to log activity:", error);
        // Don't throw, we don't want to break the app because logging failed
    }
}
