'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
        .from('users')
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

export async function sendSignUpOtp(formData: FormData, _locale: string): Promise<ActionResponse> {
    const email = formData.get('email') as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
        },
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function verifySignUpOtp(formData: FormData, _locale: string): Promise<ActionResponse> {
    const email = formData.get('email') as string;
    const otp = formData.get('otp') as string;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
    });

    if (error) {
        return { success: false, error: error.message };
    }

    if (!data.user) {
        return { success: false, error: "Verification failed" };
    }

    return { success: true };
}

export async function completeProfile(formData: FormData, _locale: string): Promise<ActionResponse> {
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    if (confirmPassword && password !== confirmPassword) {
        return { success: false, error: "Passwords do not match" };
    }

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "Not authenticated" };
    }

    // Update user auth profile
    const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
            full_name: fullName,
            phone: phone,
        }
    });

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    // Also update the public.users table (using admin client to bypass any RLS)
    const adminSupabase = createAdminClient();
    const { error: dbError } = await adminSupabase
        .from('users')
        .update({
            full_name: fullName,
            phone: phone,
        })
        .eq('id', user.id);

    if (dbError) {
        console.error("Error updating users table via admin client:", dbError);
        // Continue anyway as auth is updated
    }

    await logActivity('REGISTER', 'user', user.id, { email: user.email });

    return { success: true };
}
