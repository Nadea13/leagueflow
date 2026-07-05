'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, Payment, Tournament } from "@/types";

export async function getUserPayments(): Promise<ActionResponse<Payment[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("payments")
            .select(`
                id,
                amount,
                payment_status,
                payment_method,
                plan_name,
                created_at,
                tournament_id,
                transaction_id,
                raw_gateway_response
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching user payments:", error);
            return { success: false, error: error.message };
        }

        const mappedData: Payment[] = (data || []).map(item => {
            const createdAt = new Date(item.created_at);
            let subscriptionExpiresAt = null;
            if (item.plan_name === "monthly" || item.plan_name === "pro" || item.plan_name === "manager_pro") {
                const expires = new Date(createdAt);
                expires.setDate(createdAt.getDate() + 30);
                subscriptionExpiresAt = expires.toISOString();
            } else if (item.plan_name === "yearly" || item.plan_name === "pro_yearly") {
                const expires = new Date(createdAt);
                expires.setDate(createdAt.getDate() + 365);
                subscriptionExpiresAt = expires.toISOString();
            }

            return {
                id: item.id,
                amount: Number(item.amount),
                status: item.payment_status,
                payment_method: item.payment_method || "",
                plan: item.plan_name,
                created_at: item.created_at,
                tournament_id: item.tournament_id,
                provider_id: item.transaction_id,
                subscription_expires_at: subscriptionExpiresAt,
                slip_url: (item.raw_gateway_response as Record<string, unknown>)?.slip_url as string || null
            };
        });

        return { success: true, data: mappedData };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to fetch payments",
        };
    }
}

export async function getUserTournaments(): Promise<ActionResponse<Tournament[]>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const { data, error } = await supabase
            .from("tournaments")
            .select("*")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching user tournaments for billing:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to fetch tournaments",
        };
    }
}

export async function createPaymentRecord(
    planId: string,
    amount: number,
    paymentMethod: string,
    tournamentId?: string | null
): Promise<ActionResponse<Payment>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const providerId = amount === 0 
            ? `LF_FREE_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            : `LF_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const adminSupabase = createAdminClient();

        // 1. Insert global payment record
        const { data: paymentData, error: paymentError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                tournament_id: tournamentId || null,
                amount,
                payment_status: "success",
                payment_method: paymentMethod,
                plan_name: planId,
                transaction_id: providerId,
                paid_at: amount === 0 ? new Date().toISOString() : null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentError) {
            console.error("Error inserting payment record:", paymentError);
            return { success: false, error: paymentError.message };
        }

        // 2. If upgrading a tournament, update tournament plan in DB
        if (tournamentId) {
            const { error: tournamentError } = await adminSupabase
                .from("tournaments")
                .update({
                    plan: "tournament",
                    payment_status: "paid",
                    payment_id: paymentData.id,
                    payment_method: paymentMethod,
                    updated_at: new Date().toISOString()
                })
                .eq("id", tournamentId)
                .eq("user_id", user.id);

            if (tournamentError) {
                console.error("Error updating tournament plan:", tournamentError);
                return { success: false, error: "Payment recorded, but failed to upgrade tournament: " + tournamentError.message };
            }
        }

        // Revalidate layout and settings paths
        revalidatePath("/", "layout");
        revalidatePath("/[locale]/dashboard", "layout");
        revalidatePath("/dashboard/settings", "page");
        if (tournamentId) {
            revalidatePath(`/dashboard/tournaments/${tournamentId}`, "layout");
        }

        // Map database model to expected Payment interface
        const createdAt = new Date(paymentData.created_at);
        let subscriptionExpiresAt = null;
        if (paymentData.plan_name === "monthly" || paymentData.plan_name === "pro" || paymentData.plan_name === "manager_pro") {
            const expires = new Date(createdAt);
            expires.setDate(createdAt.getDate() + 30);
            subscriptionExpiresAt = expires.toISOString();
        } else if (paymentData.plan_name === "yearly" || paymentData.plan_name === "pro_yearly") {
            const expires = new Date(createdAt);
            expires.setDate(createdAt.getDate() + 365);
            subscriptionExpiresAt = expires.toISOString();
        }

        const mappedPayment: Payment = {
            id: paymentData.id,
            amount: Number(paymentData.amount),
            status: paymentData.payment_status,
            payment_method: paymentData.payment_method || "",
            plan: paymentData.plan_name,
            created_at: paymentData.created_at,
            tournament_id: paymentData.tournament_id,
            provider_id: paymentData.transaction_id,
            subscription_expires_at: subscriptionExpiresAt,
            slip_url: (paymentData.raw_gateway_response as Record<string, unknown>)?.slip_url as string || null
        };

        return { success: true, data: mappedPayment };
    } catch (e) {
        console.error("Error in createPaymentRecordServerAction:", e);
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to process payment",
        };
    }
}

export async function createPaymentRecordWithSlip(formData: FormData): Promise<ActionResponse<Payment>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Authentication required" };
        }

        const planId = formData.get("planId") as string;
        const amount = Number(formData.get("amount"));
        const paymentMethod = formData.get("paymentMethod") as string;
        const tournamentId = formData.get("tournamentId") as string | null;
        const slipFile = formData.get("slipFile") as File | null;

        let slipUrl: string | null = null;

        if (slipFile && slipFile instanceof File) {
            if (slipFile.size > 5 * 1024 * 1024) {
                return { success: false, error: "File size must be less than 5MB" };
            }
            if (!slipFile.type.startsWith("image/")) {
                return { success: false, error: "File must be an image" };
            }

            const fileExt = slipFile.name.split('.').pop();
            const fileName = `subscriptions/${user.id}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('slips')
                .upload(fileName, slipFile);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                return { success: false, error: "Failed to upload slip image" };
            }

            const { data: urlData } = supabase.storage
                .from('slips')
                .getPublicUrl(fileName);
            slipUrl = urlData.publicUrl;
        }

        const providerId = `LF_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const adminSupabase = createAdminClient();

        // 1. Insert global payment record
        const { data: paymentData, error: paymentError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                tournament_id: tournamentId || null,
                amount,
                payment_status: "pending", // Pending approval from Admin
                payment_method: paymentMethod,
                plan_name: planId,
                transaction_id: providerId,
                raw_gateway_response: slipUrl ? { slip_url: slipUrl } : {},
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (paymentError) {
            console.error("Error inserting payment record:", paymentError);
            return { success: false, error: paymentError.message };
        }

        // Map database model to expected Payment interface
        const subscriptionExpiresAt = null;

        const mappedPayment: Payment = {
            id: paymentData.id,
            amount: Number(paymentData.amount),
            status: paymentData.payment_status,
            payment_method: paymentData.payment_method || "",
            plan: paymentData.plan_name,
            created_at: paymentData.created_at,
            tournament_id: paymentData.tournament_id,
            provider_id: paymentData.transaction_id,
            subscription_expires_at: subscriptionExpiresAt,
            slip_url: (paymentData.raw_gateway_response as Record<string, unknown>)?.slip_url as string || null
        };

        return { success: true, data: mappedPayment };
    } catch (e) {
        console.error("Error in createPaymentRecordWithSlip:", e);
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to process payment",
        };
    }
}
