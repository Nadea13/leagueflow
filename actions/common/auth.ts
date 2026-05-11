'use server'

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/types";
import { logActivity } from "@/lib/audit";

export async function signOut(formData: FormData) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    const locale = formData.get("locale");
    const safeLocale = typeof locale === "string" && locale.length > 0 ? locale : "th";
    return redirect(`/${safeLocale}/login`);
}

export async function signIn(formData: FormData, _locale: string): Promise<ActionResponse> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = await createClient();

    // 1. Force clear any existing session first to prevent stale cookie issues
    await supabase.auth.signOut();

    // 2. Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // 3. Get profile to check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_organizer')
        .eq('id', data.user.id)
        .single();

    // 4. Log activity
    await logActivity('LOGIN', 'user', data.user.id, { email });

    return { 
        success: true, 
        data: {
            role: profile?.role,
            is_organizer: profile?.is_organizer
        }
    };
}

export async function signUp(formData: FormData, locale: string): Promise<ActionResponse> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;

    if (confirmPassword && password !== confirmPassword) {
        return { success: false, error: "Passwords do not match" };
    }

    const supabase = await createClient();

    // 1. Attempt signup
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/${locale}/auth/confirm`,
        },
    });

    if (error) {
        return { success: false, error: error.message };
    }

    if (!data.user) {
        return { success: false, error: "Registration failed" };
    }

    // Ensure no session is kept (no cookies) after signup
    if (data.session) {
        await supabase.auth.signOut();
    }

    // 2. Log activity
    await logActivity('REGISTER', 'user', data.user.id, { email });

    return { success: true };
}
