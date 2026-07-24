"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { ActionResponse, Payment } from "@/types"
import { headers } from "next/headers"

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
export interface AdminMasterPlayer {
    id: string
    user_id: string | null
    first_name_th: string | null
    middle_name_th: string | null
    last_name_th: string | null
    first_name_en: string | null
    middle_name_en: string | null
    last_name_en: string | null
    gender: string
    birthday: string
    tel: string | null
    profile_img: string | null
    status: string
    verified: boolean
    created_at: string
    user?: {
        email: string
        full_name: string | null
    } | null
}

export async function getAdminMasterPlayers(): Promise<ActionResponse<AdminMasterPlayer[]>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const adminSupabase = createAdminClient()
        const { data, error: dbError } = await adminSupabase
            .from("master_players")
            .select(`
                *,
                user:users (
                    email,
                    full_name
                )
            `)
            .order("created_at", { ascending: false })

        if (dbError) throw dbError

        return { success: true, data: data as AdminMasterPlayer[] }
    } catch (e) {
        console.error("Error fetching admin master players:", e)
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" }
    }
}

export async function linkMasterPlayerToUser(
    masterPlayerId: string,
    userId: string | null
): Promise<ActionResponse<void>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const adminSupabase = createAdminClient()
        const { error: dbError } = await adminSupabase
            .from("master_players")
            .update({
                user_id: userId,
                updated_at: new Date().toISOString()
            })
            .eq("id", masterPlayerId)

        if (dbError) throw dbError

        return { success: true }
    } catch (e) {
        console.error("Error linking master player to user:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}

export async function approveMasterPlayerRequest(
    masterPlayerId: string
): Promise<ActionResponse<void>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const adminSupabase = createAdminClient()
        const { error: dbError } = await adminSupabase
            .from("master_players")
            .update({
                verified: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", masterPlayerId)

        if (dbError) throw dbError

        return { success: true }
    } catch (e) {
        console.error("Error approving master player request:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}

export async function rejectMasterPlayerRequest(
    masterPlayerId: string
): Promise<ActionResponse<void>> {
    try {
        const { isAdmin, error } = await verifyAdmin()
        if (!isAdmin) return { success: false, error }

        const adminSupabase = createAdminClient()
        const { error: dbError } = await adminSupabase
            .from("master_players")
            .update({
                user_id: null,
                verified: false,
                updated_at: new Date().toISOString()
            })
            .eq("id", masterPlayerId)

        if (dbError) throw dbError

        return { success: true }
    } catch (e) {
        console.error("Error rejecting master player request:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}



export interface SystemLogItem {
    id: string
    event: string
    level: 'info' | 'warning' | 'error'
    message: string
    timestamp: string
    isAuthenticated?: boolean
}

export interface ActiveUserInfo {
    id: string
    email: string
    full_name: string | null
    ip: string
    lastActive: string
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
        players: number
    }
    recentErrorsCount: number
    services: {
        database: 'operational' | 'degraded' | 'down'
        auth: 'operational' | 'degraded' | 'down'
        storage: 'operational' | 'degraded' | 'down'
    }
    activeUsers?: ActiveUserInfo[]
    recentLogs?: SystemLogItem[]
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
            { count: paymentsCount },
            { count: playersCount }
        ] = await Promise.all([
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("tournaments").select("*", { count: "exact", head: true }),
            supabase.from("teams").select("*", { count: "exact", head: true }),
            supabase.from("matches").select("*", { count: "exact", head: true }),
            supabase.from("payments").select("*", { count: "exact", head: true }),
            supabase.from("master_players").select("*", { count: "exact", head: true })
        ])

        // 3. Check auth & storage status
        const { error: authError } = await supabase.auth.getSession()
        const { error: storageError } = await supabase.storage.listBuckets()
        // 4. Fetch recent system activity logs from actual Supabase tables (payments, users, tournaments, teams, players)
        const headerList = await headers()
        const clientIp = headerList.get("x-client-ip") || headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "127.0.0.1"

        const [
            { data: recentPayments },
            { data: recentUsers },
            { data: recentTournaments },
            { data: recentUpdatedTournaments },
            { data: recentCategories },
            { data: recentTeams },
            { data: recentUpdatedTeams },
            { data: recentTournamentTeams },
            { data: recentPlayers },
            { data: recentUpdatedPlayers },
            { data: recentMatches },
            { data: recentUpdatedMatches },
            { data: recentAuditLogs }
        ] = await Promise.all([
            supabase.from("payments").select("id, amount, payment_status, created_at, plan_name, user:users(email, full_name)").order("created_at", { ascending: false }).limit(5),
            supabase.from("users").select("id, email, full_name, created_at, updated_at").order("updated_at", { ascending: false }).limit(10),
            supabase.from("tournaments").select("id, name, created_at, user:users(email, full_name)").order("created_at", { ascending: false }).limit(5),
            supabase.from("tournaments").select("id, name, updated_at, user:users(email, full_name)").order("updated_at", { ascending: false }).limit(5),
            supabase.from("tournament_categories").select("id, name, created_at, tournament:tournaments(name, user:users(email))").order("created_at", { ascending: false }).limit(5),
            supabase.from("teams").select("id, name, created_at, user:users(email, full_name)").order("created_at", { ascending: false }).limit(5),
            supabase.from("teams").select("id, name, updated_at, created_at, user:users(email, full_name)").order("updated_at", { ascending: false }).limit(5),
            supabase.from("tournament_teams").select("id, registration_status, payment_status, created_at, updated_at, team:teams(name, user:users(email)), category:tournament_categories(name, tournament:tournaments(name))").order("updated_at", { ascending: false }).limit(10),
            supabase.from("players").select("id, name, first_name, last_name, created_at, user:users(email, full_name)").order("created_at", { ascending: false }).limit(5),
            supabase.from("players").select("id, name, first_name, last_name, updated_at, created_at, user:users(email, full_name)").order("updated_at", { ascending: false }).limit(5),
            supabase.from("matches").select("id, round_name, match_number, created_at, tournament:tournaments(name, user:users(email))").order("created_at", { ascending: false }).limit(5),
            supabase.from("matches").select("id, round_name, match_number, status, team_a_score, team_b_score, updated_at, created_at, tournament:tournaments(name, user:users(email))").order("updated_at", { ascending: false }).limit(5),
            supabase.from("audit_logs").select("id, user_id, action, target_type, target_id, details, created_at").order("created_at", { ascending: false }).limit(20)
        ])

        // Check current session to mark active visitor authentication state
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        const logs: SystemLogItem[] = []

        // 1. Log USER_REGISTERED when a new user signs up (using exact account creation time)
        if (recentUsers) {
            recentUsers.forEach(u => {
                logs.push({
                    id: `usr_reg_${u.id}`,
                    event: "USER_REGISTERED",
                    level: "info",
                    message: `New user registered: ${u.full_name ? `${u.full_name} (${u.email})` : u.email}`,
                    timestamp: u.created_at,
                    isAuthenticated: true
                })
            })
        }

        // 2. Log audit_logs events (e.g. COOKIE_CONSENT)
        if (recentAuditLogs) {
            recentAuditLogs.forEach(al => {
                if (al.action === "COOKIE_CONSENT") {
                    const isAnalyticsAccepted = al.target_id === "analytics_accepted"
                    logs.push({
                        id: `audit_${al.id}`,
                        event: "COOKIE_CONSENT",
                        level: "info",
                        message: isAnalyticsAccepted
                            ? "Visitor accepted analysis cookies (All Cookies)"
                            : "Visitor accepted necessary cookies only",
                        timestamp: al.created_at,
                        isAuthenticated: !!al.user_id
                    })
                }
            })
        }

        // Fetch auth users using Admin Supabase client to get actual last_sign_in_at timestamps
        const adminSupabase = createAdminClient()
        const { data: authUsersData } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 20 })
        const authUsersMap = new Map((authUsersData?.users || []).map(u => [u.id, u]))

        const activeUsersList: ActiveUserInfo[] = (recentUsers || []).map(u => {
            const authUser = authUsersMap.get(u.id)
            const lastSignIn = authUser?.last_sign_in_at || u.updated_at || u.created_at
            return {
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                ip: u.id === currentUser?.id ? clientIp : '127.0.0.1',
                lastActive: u.id === currentUser?.id ? new Date().toISOString() : (lastSignIn || new Date().toISOString())
            }
        })

        // Sort logs descending by timestamp
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

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
                    payments: paymentsCount || 0,
                    players: playersCount || 0
                },
                recentErrorsCount: 0,
                services: {
                    database: pingError ? 'down' : (latencyMs > 500 ? 'degraded' : 'operational'),
                    auth: authError ? 'down' : 'operational',
                    storage: storageError ? 'down' : 'operational'
                },
                activeUsers: activeUsersList,
                recentLogs: logs
            }
        }
    } catch (e) {
        console.error("Error fetching system monitor stats:", e)
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}
