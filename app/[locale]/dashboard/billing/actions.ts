"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResponse } from "@/types/index";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export type PaymentRecord = {
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    plan: string | null;
    created_at: string;
    tournament_id: string | null;
    provider_id: string | null;
    subscription_expires_at: string | null;
};

export async function getPaymentHistory(): Promise<PaymentRecord[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching payment history:", error);
        return [];
    }

    return data as PaymentRecord[];
}

export async function recordPayment(data: {
    tournament_id?: string;
    amount: number;
    status: string;
    payment_method: string;
    charge_id?: string;
    plan_type?: string;
}): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "User not authenticated" };

    const insertData: any = {
        user_id: user.id,
        amount: data.amount,
        status: data.status,
        payment_method: data.payment_method,
        provider_id: data.charge_id,
        plan: data.plan_type,
        tournament_id: data.tournament_id
    };

    // Calculate expiration if paying for a subscription
    if ((data.plan_type === 'monthly' || data.plan_type === 'yearly') && data.status === 'success') {
        const now = new Date();
        const expiresAt = new Date(now);

        if (data.plan_type === 'monthly') {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (data.plan_type === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // Only set if not already set (e.g. by a provider or previous logic)
        if (!insertData.subscription_expires_at) {
            insertData.subscription_expires_at = expiresAt.toISOString();
        }
    }

    const { error } = await supabase.from("payments").insert(insertData);

    if (error) {
        console.error("Error recording payment:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
    revalidatePath("/");

    // Log and Notify
    await logActivity('PAYMENT_RECORDED', 'payment', data.charge_id || 'manual', { amount: data.amount, status: data.status });
    if (data.status === 'success') {
        await createNotification(user.id, 'payment', 'Payment Successful', `Your payment of ฿${data.amount} was successful.`);
    }

    return { success: true };
}

export async function updateProfilePaymentStatus(data: {
    payment_status: string;
    payment_id?: string;
    payment_method?: string;
    plan?: string;
}): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "User not authenticated" };

    // The pro status is derived from the 'payments' table history, 
    // so we don't need to duplicate this data in the 'profiles' table 
    // which may not even have these columns.
    return { success: true };
}
