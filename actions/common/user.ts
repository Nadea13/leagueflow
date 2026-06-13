'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureProfileExists } from "@/lib/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/types";

export async function getUserSubscriptionPlan() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 'free';

    // Just-in-time profile creation safety
    await ensureProfileExists(supabase, user);

    // Check if user is an admin - Admins get Pro features by default for management
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === 'admin') {
        return 'yearly';
    }

    const { data: subscription } = await supabase
        .from("payments")
        .select("plan, subscription_expires_at")
        .eq("user_id", user.id)
        .eq("status", "success")
        .in("plan", ["monthly", "yearly", "manager_pro"])
        .is("tournament_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (subscription) {
        const now = new Date();
        const expiresAt = subscription.subscription_expires_at
            ? new Date(subscription.subscription_expires_at)
            : null;

        return (expiresAt && now > expiresAt) ? 'free' : (subscription.plan || 'free');
    }

    return 'free';
}


export async function updateProfile(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const avatarFile = formData.get("avatar") as File | null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Authentication required" };
    }

    let avatarUrl = formData.get("existing_avatar_url") as string || null;

    // Handle avatar upload if provided
    if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile);

        if (uploadError) {
            console.error("Avatar upload error:", uploadError);
            return { success: false, error: "Failed to upload avatar: " + uploadError.message };
        }

        const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        avatarUrl = publicUrl;
    } else if (formData.get("remove_avatar") === "true") {
        avatarUrl = null;
    }

    const { error } = await supabase.auth.updateUser({
        data: { 
            full_name: fullName,
            avatar_url: avatarUrl 
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Direct database update using service role client as well
    const adminSupabase = createAdminClient();
    await adminSupabase
        .from("users")
        .update({ 
            full_name: fullName,
            phone: phone || null,
            profile_img: avatarUrl
        })
        .eq("id", user.id);

    revalidatePath("/", "layout");
    return { success: true };
}

export async function deleteAccount() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // In a real app, you might want to call a service role function to delete the user from Auth
    // For now, we sign out and the profile deletion would be handled by your business logic/DB cascades
    // or a specialized RPC if available.
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error("Error signing out during deletion:", error);
    }

    redirect("/");
}

export async function getMasterPlayer() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
        .from("master_players")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching master player profile:", error);
        return null;
    }
    return data;
}

export async function createMasterPlayer(formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const gender = formData.get("gender") as string;
        const birthday = formData.get("birthday") as string;
        const tel = formData.get("tel") as string;

        if (!firstName || !lastName || !gender || !birthday) {
            return { success: false, error: "First name, last name, gender, and birthday are required" };
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("master_players")
            .insert({
                user_id: user.id,
                first_name: firstName,
                last_name: lastName,
                gender,
                birthday,
                tel,
                status: 'active',
                verified: true
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating master player:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true, data };
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Failed to create master player profile";
        return { success: false, error: errorMessage };
    }
}

export async function getAllPublicTournaments() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tournaments")
        .select(`
            id, name, logo_img, cover_img, description, location_name, google_map_url, status, start_date, end_date, document_deadline, bank_name, bank_account_name, bank_account_number,
            tournament_categories(registration_fee)
        `)
        .in("status", ["upcoming", "ongoing"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching all tournaments:", error);
        return [];
    }
    
    return (data || []).map(t => {
        const categories = t.tournament_categories as unknown as { registration_fee: number }[] | null;
        const registrationFee = categories && categories.length > 0 ? categories[0].registration_fee : 0;
        return {
            ...t,
            registration_fee: registrationFee
        };
    });
}

export async function searchMasterPlayers(query: string) {
    const adminSupabase = createAdminClient();

    let dbQuery = adminSupabase
        .from("master_players")
        .select("*");

    if (query && query.trim().length > 0) {
        // Search in both first_name and last_name
        dbQuery = dbQuery.or(`first_name.ilike.%${query.trim()}%,last_name.ilike.%${query.trim()}%`);
    }

    const { data, error } = await dbQuery
        .order("first_name", { ascending: true })
        .limit(20);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

export async function registerAsOrganizer(): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from("users")
            .update({ 
                is_organizer: true,
                role: 'organizer' 
            })
            .eq("id", user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }
}

export async function registerAsTeamManager(): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from("users")
            .update({ 
                is_team_manager: true
            })
            .eq("id", user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }
}

