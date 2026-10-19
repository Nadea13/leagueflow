"use server"

import { ActionResponse } from "@/types"
import { getServerSession } from "@/lib/auth-server"

export async function submitBugReport(message: string): Promise<ActionResponse<null>> {
    try {
        const session = await getServerSession().catch(() => null);
        const user = session?.user;

        console.log("[submitBugReport]", {
            userId: user?.id || null,
            userEmail: user?.email || null,
            message,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            message: "Report submitted successfully. Thank you for your feedback!"
        };
    } catch (e: unknown) {
        console.error("Unexpected error submitting bug report:", e);
        return {
            success: false,
            error: "An unexpected error occurred."
        };
    }
}
