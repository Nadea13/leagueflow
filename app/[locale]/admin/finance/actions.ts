"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function getAllPayments() {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return [];

    // Use Admin Client to bypass RLS
    const supabase = createAdminClient();

    const { data: payments, error } = await supabase
        .from("payments")
        .select('*')
        .order("created_at", { ascending: false })
        .limit(5000);

    if (error) {
        console.error("Error fetching payments:", error);
        return [];
    }

    // Fetch users for mapping (Email is key)
    const { data: users } = await supabase
        .from("profiles")
        .select("id, email, full_name");

    const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);

    return payments.map((p: any) => {
        const user = userMap.get(p.user_id);
        return {
            ...p,
            user: user ? { email: user.email, full_name: user.full_name } : undefined
        };
    });
}

import { revalidatePath } from "next/cache";

export async function approvePayment(paymentId: string) {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = createAdminClient();

    const { data: payment, error: fetchError } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

    if (fetchError || !payment) {
        return { success: false, error: "Payment not found" };
    }

    if (payment.status !== 'pending') {
        return { success: false, error: "Payment is not in pending status" };
    }

    // Update payment status to success
    const updateData: any = { status: 'success' };

    // Calculate expiration if paying for a subscription
    if (payment.plan === 'monthly' || payment.plan === 'yearly') {
        const now = new Date();
        const expiresAt = new Date(now);

        if (payment.plan === 'monthly') {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (payment.plan === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }
        updateData.subscription_expires_at = expiresAt.toISOString();
    }

    const { error: updateError } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    // Apply the upgrade based on plan type
    if (payment.plan === 'tournament' && payment.tournament_id) {
        const { error: tourneyError } = await supabase
            .from("tournaments")
            .update({ status: 'active', plan: 'tournament' })
            .eq("id", payment.tournament_id);

        if (tourneyError) console.error("Failed to update tournament:", tourneyError);
    }
    // Pro status is derived from 'payments.subscription_expires_at' in the app, 
    // so no manual profile update is needed here as long as the payment record is updated.

    revalidatePath("/admin/finance");
    return { success: true };
}

export async function rejectPayment(paymentId: string) {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = createAdminClient();

    const { error } = await supabase
        .from("payments")
        .update({ status: 'failed' })
        .eq("id", paymentId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/finance");
    return { success: true };
}
