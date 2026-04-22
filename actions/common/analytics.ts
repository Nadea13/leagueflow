'use server'

import { logActivity } from "@/lib/audit";

export async function trackEvent(
    action: string,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>
) {
    try {
        await logActivity(action, targetType, targetId, details);
        return { success: true };
    } catch (error) {
        console.error("Tracking error:", error);
        return { success: false };
    }
}
