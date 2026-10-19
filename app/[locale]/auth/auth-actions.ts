"use server";

import { getServerSession } from "@/lib/auth-server";
import { logActivity } from "@/lib/audit";
import { ActionResponse } from "@/types";

export async function logAuthEvent(action: 'LOGIN' | 'REGISTER', userId: string, details: Record<string, unknown> = {}) {
    await logActivity(action, 'user', userId, details);
}

export async function serverSideLogin(email: string): Promise<ActionResponse> {
    const session = await getServerSession();
    if (session?.user) {
        await logActivity('LOGIN', 'user', session.user.id, { email });
        return { success: true };
    }
    return { success: false, error: "Not logged in" };
}

export async function serverSideSignup(userId: string, email: string): Promise<ActionResponse> {
    await logActivity('REGISTER', 'user', userId, { email });
    return { success: true };
}
