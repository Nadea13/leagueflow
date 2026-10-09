import { getServerSession } from "@/lib/auth-server";
import { headers } from "next/headers";

export async function logActivity(
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, unknown> | null = null
) {
    try {
        const session = await getServerSession();
        const headerList = await headers();
        const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] || 
                         headerList.get("x-real-ip") || 
                         "127.0.0.1";

        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUDIT] Action: ${action} | Target: ${targetType}:${targetId} | User: ${session?.user?.id || 'anonymous'} | IP: ${ipAddress}`, details);
        }
    } catch (_error) {
        // Safe fail
    }
}
