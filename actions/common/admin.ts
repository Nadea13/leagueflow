"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { ActionResponse, Payment } from "@/types"

interface AdminPaymentRow {
    id: string
    user_id: string
    tournament_id: string | null
    amount: number | string
    plan_name: string
    payment_status: string
    payment_method: string | null
    transaction_id: string | null
    raw_gateway_response: Record<string, unknown> | null
    created_at: string
    user: {
        email: string
        full_name: string | null
    } | null
}

export interface AdminUser {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    role: 'admin' | 'organizer' | 'team_manager' | 'player'
    is_organizer: boolean
    is_team_manager: boolean
    created_at: string
}

async function verifyAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { isAdmin: false, error: "Authentication required" }
    }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { isAdmin: false, error: "Access denied: Admins only" }
    }

    return { isAdmin: true }
}

export async function getAdminPayments(): Promise<ActionResponse<Payment[]>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const supabase = await createClient()
        const { data, error: dbError } = await supabase
            .from("payments")
            .select(`
                *,
                user:users (
                    email,
                    full_name
                )
            `)
            .order("created_at", { ascending: false })

        if (dbError) throw dbError

        // Map to standard Payment interface
        const payments: Payment[] = (data || []).map((item: AdminPaymentRow) => {
            const createdAt = new Date(item.created_at)
            let expiresAt: Date | null = null

            if (item.payment_status === "success") {
                if (item.plan_name === "monthly" || item.plan_name === "pro" || item.plan_name === "manager_pro") {
                    expiresAt = new Date(createdAt)
                    expiresAt.setDate(createdAt.getDate() + 30)
                } else if (item.plan_name === "yearly" || item.plan_name === "pro_yearly") {
                    expiresAt = new Date(createdAt)
                    expiresAt.setDate(createdAt.getDate() + 365)
                }
            }

            return {
                id: item.id,
                user_id: item.user_id,
                tournament_id: item.tournament_id,
                amount: Number(item.amount),
                plan: item.plan_name,
                status: item.payment_status,
                payment_method: item.payment_method || "promptpay",
                provider_id: item.transaction_id,
                subscription_expires_at: expiresAt ? expiresAt.toISOString() : null,
                created_at: item.created_at,
                slip_url: (item.raw_gateway_response as Record<string, unknown> | null)?.slip_url as string || null,
                user: item.user ? {
                    email: item.user.email,
                    full_name: item.user.full_name || undefined
                } : undefined
            }
        })

        return { success: true, data: payments }
    } catch (e: unknown) {
        console.error("Error fetching admin payments:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}

export async function updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'success' | 'failed'
): Promise<ActionResponse<void>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const adminSupabase = createAdminClient()

        const updates: {
            payment_status: 'pending' | 'success' | 'failed'
            updated_at: string
            paid_at?: string | null
        } = {
            payment_status: status,
            updated_at: new Date().toISOString()
        }

        if (status === 'success') {
            updates.paid_at = new Date().toISOString()
        } else {
            updates.paid_at = null
        }

        const { error: updateError } = await adminSupabase
            .from("payments")
            .update(updates)
            .eq("id", paymentId)

        if (updateError) throw updateError

        return { success: true }
    } catch (e: unknown) {
        console.error("Error updating payment status:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}

export async function getAdminUsers(): Promise<ActionResponse<AdminUser[]>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const supabase = await createClient()
        const { data, error: dbError } = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false })

        if (dbError) throw dbError

        return { success: true, data: data as AdminUser[] }
    } catch (e) {
        console.error("Error fetching admin users:", e)
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" }
    }
}

export async function updateUserFields(
    userId: string,
    updates: {
        role?: 'admin' | 'organizer' | 'team_manager' | 'player'
        is_organizer?: boolean
        is_team_manager?: boolean
    }
): Promise<ActionResponse<void>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const adminSupabase = createAdminClient()
        const { error: dbError } = await adminSupabase
            .from("users")
            .update(updates)
            .eq("id", userId)

        if (dbError) throw dbError

        return { success: true }
    } catch (e) {
        console.error("Error updating user fields:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}

export interface SystemMonitorStats {
    dbConnected: boolean
    latencyMs: number
    tableCounts: {
        users: number
        tournaments: number
        teams: number
        matches: number
        payments: number
    }
    recentErrorsCount: number
    services: {
        database: 'operational' | 'degraded' | 'down'
        auth: 'operational' | 'degraded' | 'down'
        storage: 'operational' | 'degraded' | 'down'
    }
}

export async function getSystemMonitorStats(): Promise<ActionResponse<SystemMonitorStats>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const supabase = await createClient()
        const startTime = Date.now()

        // 1. Health check & latency
        const { error: pingError } = await supabase.from("users").select("id").limit(1)
        const latencyMs = Date.now() - startTime

        if (pingError) throw pingError

        // 2. Table row counts
        const [
            { count: usersCount },
            { count: tournamentsCount },
            { count: teamsCount },
            { count: matchesCount },
            { count: paymentsCount }
        ] = await Promise.all([
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("tournaments").select("*", { count: "exact", head: true }),
            supabase.from("teams").select("*", { count: "exact", head: true }),
            supabase.from("matches").select("*", { count: "exact", head: true }),
            supabase.from("payments").select("*", { count: "exact", head: true })
        ])

        // 3. Check auth & storage status
        const { error: authError } = await supabase.auth.getSession()
        const { error: storageError } = await supabase.storage.listBuckets()

        return {
            success: true,
            data: {
                dbConnected: !pingError,
                latencyMs,
                tableCounts: {
                    users: usersCount || 0,
                    tournaments: tournamentsCount || 0,
                    teams: teamsCount || 0,
                    matches: matchesCount || 0,
                    payments: paymentsCount || 0
                },
                recentErrorsCount: 0,
                services: {
                    database: pingError ? 'down' : (latencyMs > 500 ? 'degraded' : 'operational'),
                    auth: authError ? 'down' : 'operational',
                    storage: storageError ? 'down' : 'operational'
                }
            }
        }
    } catch (e) {
        console.error("Error fetching system monitor stats:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}
