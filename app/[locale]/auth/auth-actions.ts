"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit";
import { ActionResponse } from "@/types";

export async function logAuthEvent(action: 'LOGIN' | 'REGISTER', userId: string, details: any = {}) {
    await logActivity(action, 'user', userId, details);
}

export async function serverSideLogin(email: string): Promise<ActionResponse> {
    // This is just for logging - the actual auth still happens on client or we can migrate it
    // For now, let's create a server action that can be called after successful client-side login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        await logActivity('LOGIN', 'user', user.id, { email });
        return { success: true };
    }
    return { success: false, error: "Not logged in" };
}

export async function serverSideSignup(userId: string, email: string): Promise<ActionResponse> {
    await logActivity('REGISTER', 'user', userId, { email });
    return { success: true };
}
