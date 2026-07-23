"use client"

import { useState, useTransition, useEffect } from "react"
import { Tab, TabOption } from "@/components/ui/tab"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, CreditCard, Users, Search, Check, X, CheckCircle, XCircle, AlertCircle, Activity, Database, RefreshCw, HardDrive } from "lucide-react"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { Payment } from "@/types"
import { AdminUser, updatePaymentStatus, updateUserFields, getSystemMonitorStats, SystemMonitorStats, ActiveUserInfo } from "@/actions/common/admin"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Header } from "@/components/ui/header"

interface AdminClientProps {
    initialPayments: Payment[]
    initialUsers: AdminUser[]
}

type TabType = "pending" | "payments" | "users" | "monitor"

export function AdminClient({ initialPayments, initialUsers }: AdminClientProps) {
    const t = useTranslations("Admin")
    const tCommon = useTranslations("Common")
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<TabType>("monitor")
    const [payments, setPayments] = useState<Payment[]>(initialPayments)
    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [paymentSearch, setPaymentSearch] = useState("")
    const [userSearch, setUserSearch] = useState("")
    const [isPending, startTransition] = useTransition()
    const [monitorStats, setMonitorStats] = useState<SystemMonitorStats | null>(null)
    const [isLoadingStats, setIsLoadingStats] = useState(false)
    const [logFilterTab, setLogFilterTab] = useState<"all" | "auth" | "guest">("all")

    const [presenceUsers, setPresenceUsers] = useState<ActiveUserInfo[]>([])

    const fetchMonitorStats = async (showLoading = false) => {
        if (showLoading) setIsLoadingStats(true)
        const res = await getSystemMonitorStats()
        if (res.success && res.data) {
            setMonitorStats(res.data)
        }
        if (showLoading) setIsLoadingStats(false)
    }

    useEffect(() => {
        if (activeTab !== "monitor") return

        // Initial fetch on tab switch
        Promise.resolve().then(() => fetchMonitorStats(true))

        // 1. Set up Supabase Realtime Subscription for instant DB event pushes & Realtime Presence
        const supabase = createClient()
        const channel = supabase
            .channel('online-users-room')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchMonitorStats(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchMonitorStats(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => fetchMonitorStats(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchMonitorStats(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_teams' }, () => fetchMonitorStats(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchMonitorStats(false))
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                const onlineUsers: ActiveUserInfo[] = []
                Object.keys(newState).forEach((key) => {
                    const presences = newState[key] as Record<string, unknown>[]
                    presences.forEach((p) => {
                        const presence = p as { id?: string; email?: string; full_name?: string | null; ip?: string; onlineAt?: string }
                        if (presence.email && !onlineUsers.some(u => u.id === presence.id)) {
                            onlineUsers.push({
                                id: presence.id || key,
                                email: presence.email,
                                full_name: presence.full_name || null,
                                ip: presence.ip || '127.0.0.1',
                                lastActive: presence.onlineAt || new Date().toISOString()
                            })
                        }
                    })
                })
                setPresenceUsers(onlineUsers)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        await channel.track({
                            id: user.id,
                            email: user.email,
                            full_name: user.user_metadata?.full_name || null,
                            onlineAt: new Date().toISOString()
                        })
                    }
                }
            })

        // 2. Add lightweight heartbeat ticker (3s)
        const heartbeatId = setInterval(() => {
            fetchMonitorStats(false)
        }, 3000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(heartbeatId)
        }
    }, [activeTab])

    const tabOptions: TabOption<TabType>[] = [
        {
            value: "monitor",
            label: "System Monitor",
            icon: Activity
        },
        {
            value: "pending",
            label: t("payments_pending") || "Pending Approvals",
            icon: AlertCircle,
            badge: payments.filter(p => p.status === "pending").length
        },
        {
            value: "payments",
            label: t("payments") || "Payments",
            icon: CreditCard
        },
        {
            value: "users",
            label: t("users") || "Users & Roles",
            icon: Users
        }
    ]

    const handlePaymentAction = async (paymentId: string, status: 'success' | 'failed') => {
        const confirmMessage = status === 'success'
            ? t("approve_confirm") || "Are you sure you want to approve this payment?"
            : t("reject_confirm") || "Are you sure you want to reject this payment?"

        if (!window.confirm(confirmMessage)) return

        startTransition(async () => {
            const res = await updatePaymentStatus(paymentId, status)
            if (res.success) {
                setPayments(prev =>
                    prev.map(p => p.id === paymentId
                        ? {
                            ...p,
                            status,
                            subscription_expires_at: status === 'success'
                                ? new Date(Date.now() + (p.plan === 'yearly' || p.plan === 'pro_yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
                                : null
                        }
                        : p
                    )
                )
                toast({
                    title: tCommon("success") || "Success",
                    description: t("success_message") || "Action completed successfully",
                })
            } else {
                toast({
                    title: tCommon("error") || "Error",
                    description: res.error || "An error occurred",
                    variant: "destructive"
                })
            }
        })
    }

    const handleRoleChange = async (userId: string, newRole: AdminUser['role']) => {
        startTransition(async () => {
            const res = await updateUserFields(userId, { role: newRole })
            if (res.success) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
                toast({
                    title: tCommon("success") || "Success",
                    description: t("role_updated") || "Role updated successfully",
                })
            } else {
                toast({
                    title: tCommon("error") || "Error",
                    description: res.error || "Failed to update role",
                    variant: "destructive"
                })
            }
        })
    }

    const handleToggleField = async (userId: string, field: 'is_organizer' | 'is_team_manager', value: boolean) => {
        startTransition(async () => {
            const updates = { [field]: value }
            const res = await updateUserFields(userId, updates)
            if (res.success) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u))
                toast({
                    title: tCommon("success") || "Success",
                    description: t("success_message") || "Action completed successfully",
                })
            } else {
                toast({
                    title: tCommon("error") || "Error",
                    description: res.error || "An error occurred",
                    variant: "destructive"
                })
            }
        })
    }

    const filteredPayments = payments.filter(p => {
        const query = paymentSearch.toLowerCase()
        return (
            p.id.toLowerCase().includes(query) ||
            (p.provider_id || "").toLowerCase().includes(query) ||
            (p.user?.email || "").toLowerCase().includes(query) ||
            (p.user?.full_name || "").toLowerCase().includes(query) ||
            (p.plan || "").toLowerCase().includes(query)
        )
    })

    const filteredUsers = users.filter(u => {
        const query = userSearch.toLowerCase()
        return (
            (u.email || "").toLowerCase().includes(query) ||
            (u.full_name || "").toLowerCase().includes(query) ||
            u.id.toLowerCase().includes(query)
        )
    })

    const pendingPayments = payments.filter(p => p.status === "pending")

    return (
        <div className="space-y-2 lg:space-y-4 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <Header level={2}>{t("title") || "Admin Dashboard"}</Header>
                <Tab options={tabOptions} value={activeTab} onChange={setActiveTab} className="bg-card" />
            </div>

            {activeTab === "monitor" && (
                <div className="space-y-1 lg:space-y-2">
                    <div className="flex justify-between items-center bg-card p-2 lg:p-4 rounded-sm border">
                        <div>
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                System Infrastructure & Database Metrics
                                <Badge variant="outline" className="text-[10px] text-primary bg-primary/10 border-primary/50 gap-2">
                                    <span className="w-1 h-1 rounded-full bg-primary animate-ping" /> Live
                                </Badge>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Real-time connection status, latency, and Supabase data breakdown.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchMonitorStats(true)}
                            disabled={isLoadingStats}
                            className="h-8 gap-1.5 text-xs font-medium"
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoadingStats && "animate-spin")} />
                            Refresh Stats
                        </Button>
                    </div>

                    {/* Services Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 lg:gap-2">
                        <Card className="border py-2 lg:py-4 rounded-sm bg-card space-y-1 lg:space-y-2">
                            <CardHeader className="flex items-center justify-between">
                                <Header level={5}>Database (PostgreSQL)</Header>
                                <Database className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black">
                                        {monitorStats?.services.database === 'operational' ? (
                                            <span className="text-emerald-500 flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4" /> Operational
                                            </span>
                                        ) : (
                                            <span className="text-destructive flex items-center gap-2">
                                                <XCircle className="h-4 w-4" /> Issue Detected
                                            </span>
                                        )}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                        {monitorStats?.latencyMs ? `${monitorStats.latencyMs} ms` : '-'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border py-2 lg:py-4 rounded-sm bg-card space-y-1 lg:space-y-2">
                            <CardHeader className="flex items-center justify-between">
                                <Header level={5}>Auth Service (GoTrue)</Header>
                                <Shield className="h-4 w-4 text-sky-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black">
                                        {monitorStats?.services.auth === 'operational' ? (
                                            <span className="text-emerald-500 flex items-center gap-1.5 text-base">
                                                <CheckCircle className="h-4 w-4" /> Operational
                                            </span>
                                        ) : (
                                            <span className="text-destructive flex items-center gap-1.5 text-base">
                                                <XCircle className="h-4 w-4" /> Service Down
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border py-2 lg:py-4 rounded-sm bg-card space-y-1 lg:space-y-2">
                            <CardHeader className="flex items-center justify-between">
                                <Header level={5}>Storage Engine</Header>
                                <HardDrive className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black">
                                        {monitorStats?.services.storage === 'operational' ? (
                                            <span className="text-emerald-500 flex items-center gap-1.5 text-base">
                                                <CheckCircle className="h-4 w-4" /> Operational
                                            </span>
                                        ) : (
                                            <span className="text-destructive flex items-center gap-1.5 text-base">
                                                <XCircle className="h-4 w-4" /> Service Down
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Active Logged-in Users Card */}
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Header level={4}>Active Logged-in Sessions (USER_ACTIVE)</Header>
                                <CardDescription>Realtime online user sessions tracked via Supabase Realtime Presence.</CardDescription>
                            </div>
                            {(() => {
                                const allActiveUsers = [...(monitorStats?.activeUsers || [])]
                                presenceUsers.forEach(pu => {
                                    if (!allActiveUsers.some(u => u.id === pu.id || u.email === pu.email)) {
                                        allActiveUsers.push(pu)
                                    }
                                })
                                return (
                                    <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                        {presenceUsers.length} Online
                                    </Badge>
                                )
                            })()}
                        </div>
                    </div>
                    <div>
                        {(() => {
                            const allActiveUsers = [...(monitorStats?.activeUsers || [])]
                            presenceUsers.forEach(pu => {
                                if (!allActiveUsers.some(u => u.id === pu.id || u.email === pu.email)) {
                                    allActiveUsers.push(pu)
                                }
                            })

                            if (allActiveUsers.length === 0) {
                                return <p className="text-xs text-muted-foreground text-center py-4">No active user sessions.</p>
                            }

                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 lg:gap-2">
                                    {allActiveUsers.map((user) => {
                                        const isRealtimeOnline = presenceUsers.some(pu => pu.id === user.id || pu.email === user.email)
                                        return (
                                            <div
                                                key={user.id}
                                                className={cn(
                                                    "p-2 lg:p-4 rounded-sm border flex flex-col justify-between space-y-2 text-xs",
                                                    isRealtimeOnline ? "bg-primary/10 border-primary/50" : "bg-card"
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-foreground truncate">{user.full_name || user.email}</span>
                                                    {isRealtimeOnline ? (
                                                        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/50">
                                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Online
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[9px] bg-card">
                                                            <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Offline
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {user.email}
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                    <span>IP: {user.ip}</span>
                                                    <span>Last: {new Date(user.lastActive).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>

                    {/* Table Row Breakdown */}
                    <div className="space-y-1 lg:space-y-2">
                        <div>
                            <Header level={4}>Database Table Statistics</Header>
                            <CardDescription>Live row counts across core data tables in Supabase.</CardDescription>
                        </div>
                        <div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 lg:gap-2 text-center">
                                <div className="p-3 rounded-md bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.users ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Users</div>
                                </div>
                                <div className="p-3 rounded-md bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.tournaments ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Tournaments</div>
                                </div>
                                <div className="p-3 rounded-md bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.teams ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Teams</div>
                                </div>
                                <div className="p-3 rounded-md bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.matches ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Matches</div>
                                </div>
                                <div className="p-3 rounded-md bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.payments ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Payments</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Activity & Logs */}
                    <div className="space-y-1 lg:space-y-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div>
                                <Header level={4}>System Activity & Logs</Header>
                                <CardDescription>Live system activity, registration events, and visitor logs fetched from Supabase.</CardDescription>
                            </div>
                            <Tab
                                options={[
                                    { value: "all", label: "All Logs" },
                                    { value: "auth", label: "Logged-in Users", icon: Shield },
                                    { value: "guest", label: "Guests / Public", icon: Users }
                                ]}
                                value={logFilterTab}
                                onChange={(val) => setLogFilterTab(val)}
                                className="bg-card"
                            />
                        </div>
                        <div>
                            {(() => {
                                const filteredLogs = (monitorStats?.recentLogs || []).filter(log => {
                                    if (logFilterTab === "auth") return log.isAuthenticated === true
                                    if (logFilterTab === "guest") return log.isAuthenticated === false
                                    return true
                                })

                                if (filteredLogs.length === 0) {
                                    return <p className="text-xs text-muted-foreground text-center">No logs available for this filter.</p>
                                }

                                return (
                                    <div className="space-y-1 lg:space-y-2">
                                        {filteredLogs.map((log) => (
                                            <div
                                                key={log.id}
                                                className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border text-xs"
                                            >
                                                <div className="flex items-center gap-1 lg:gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px]",
                                                            log.level === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
                                                            log.level === "warning" && "border-amber-500/40 bg-amber-500/10 text-amber-600",
                                                            log.event === "PAGE_VIEW" && "border-teal-500/40 bg-teal-500/10 text-teal-600 font-bold",
                                                            log.event === "TOURNAMENT_CREATED" && "border-purple-500/40 bg-purple-500/10 text-purple-600",
                                                            log.event === "TOURNAMENT_UPDATED" && "border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold",
                                                            log.event === "TOURNAMENT_DELETED" && "border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold",
                                                            log.event === "CATEGORY_CREATED" && "border-pink-500/40 bg-pink-500/10 text-pink-600",
                                                            log.event === "BRACKET_NODE_UPDATED" && "border-orange-500/40 bg-orange-500/10 text-orange-600",
                                                            log.event === "MATCH_SCORE_UPDATED" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold",
                                                            log.event === "TEAM_CREATED" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                                                            log.event === "TEAM_UPDATED" && "border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold",
                                                            log.event === "TEAM_DELETED" && "border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold",
                                                            log.event === "TEAM_REGISTERED" && "border-cyan-500/40 bg-cyan-500/10 text-cyan-600",
                                                            log.event === "TEAM_ACCEPTED" && "border-green-500/40 bg-green-500/10 text-green-600 font-bold",
                                                            log.event === "TEAM_REJECTED" && "border-red-500/40 bg-red-500/10 text-red-600 font-bold",
                                                            log.event === "PLAYER_ADDED" && "border-indigo-500/40 bg-indigo-500/10 text-indigo-600",
                                                            log.event === "PLAYER_UPDATED" && "border-violet-500/40 bg-violet-500/10 text-violet-600 font-bold",
                                                            log.event === "USER_REGISTERED" && "border-sky-500/40 bg-sky-500/10 text-sky-600",
                                                            log.event === "COOKIE_CONSENT" && "border-purple-500/40 bg-purple-500/10 text-purple-600 font-bold",
                                                            log.event === "PAYMENT_TRANSACTION" && log.level === "info" && "border-blue-500/40 bg-blue-500/10 text-blue-600"
                                                        )}
                                                    >
                                                        {log.event}
                                                    </Badge>
                                                    <span className="font-medium text-foreground">{log.message}</span>
                                                </div>
                                                <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap ml-2">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "pending" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold tracking-wider text-primary">
                            {t("payments_pending") || "Pending Approvals"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Verify and approve PromptPay QR code transfer transactions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pendingPayments.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-lg">
                                No pending payment confirmations.
                            </div>
                        ) : (
                            <div className="border rounded-md bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs font-black">Transaction ID</TableHead>
                                            <TableHead className="text-xs font-black">{t("user")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("plan_name")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("amount")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("method")}</TableHead>
                                            <TableHead className="text-xs font-black text-right">{t("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingPayments.map((pmt) => (
                                            <TableRow key={pmt.id} className="text-xs">
                                                <TableCell className="font-mono text-[10px] text-muted-foreground">
                                                    {pmt.provider_id || pmt.id}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{pmt.user?.full_name || "N/A"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{pmt.user?.email || "N/A"}</span>
                                                        {pmt.slip_url && (
                                                            <a
                                                                href={pmt.slip_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline text-[10px] font-bold mt-1 inline-block"
                                                            >
                                                                {t("view_slip") || "View Slip"}
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize font-bold text-foreground">
                                                    {pmt.plan}
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    ฿{pmt.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="capitalize text-muted-foreground">
                                                    {pmt.payment_method}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            disabled={isPending}
                                                            onClick={() => handlePaymentAction(pmt.id, 'success')}
                                                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] h-7 px-2"
                                                        >
                                                            <Check className="h-3.5 w-3.5 mr-1" />
                                                            {t("approve") || "Approve"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={isPending}
                                                            onClick={() => handlePaymentAction(pmt.id, 'failed')}
                                                            className="font-bold text-[10px] h-7 px-2"
                                                        >
                                                            <X className="h-3.5 w-3.5 mr-1" />
                                                            {t("reject") || "Reject"}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === "payments" && (
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-sm font-bold tracking-wider text-primary">
                                    {t("payments_management") || "Payments Management"}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    View and manage all historical transactions.
                                </CardDescription>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("search_payments") || "Search payment ID, email..."}
                                    value={paymentSearch}
                                    onChange={(e) => setPaymentSearch(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredPayments.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-lg">
                                {t("no_results")}
                            </div>
                        ) : (
                            <div className="border rounded-md bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs font-black">Transaction ID</TableHead>
                                            <TableHead className="text-xs font-black">{t("user")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("plan_name")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("amount")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("status")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("date")}</TableHead>
                                            <TableHead className="text-xs font-black text-right">{t("expires_at") || "Expires At"}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPayments.map((pmt) => (
                                            <TableRow key={pmt.id} className="text-xs">
                                                <TableCell className="font-mono text-[10px] text-muted-foreground">
                                                    {pmt.provider_id || pmt.id}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{pmt.user?.full_name || "N/A"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{pmt.user?.email || "N/A"}</span>
                                                        {pmt.slip_url && (
                                                            <a
                                                                href={pmt.slip_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline text-[10px] font-bold mt-1 inline-block"
                                                            >
                                                                {t("view_slip") || "View Slip"}
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize font-bold text-foreground">
                                                    {pmt.plan}
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    ฿{pmt.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[9px] font-bold px-1.5 py-0.5",
                                                            pmt.status === "success" && "bg-green-500/10 text-green-500 border-green-500/20",
                                                            pmt.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                                                            pmt.status === "failed" && "bg-red-500/10 text-red-500 border-red-500/20"
                                                        )}
                                                    >
                                                        {pmt.status === "success" && <CheckCircle className="h-2.5 w-2.5 mr-1 inline" />}
                                                        {pmt.status === "pending" && <AlertCircle className="h-2.5 w-2.5 mr-1 inline" />}
                                                        {pmt.status === "failed" && <XCircle className="h-2.5 w-2.5 mr-1 inline" />}
                                                        {t(`status_${pmt.status}`) || pmt.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-[10px]">
                                                    {new Date(pmt.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground text-[10px]">
                                                    {pmt.subscription_expires_at
                                                        ? new Date(pmt.subscription_expires_at).toLocaleDateString()
                                                        : "-"
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === "users" && (
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-sm font-bold tracking-wider text-primary">
                                    {t("users_management") || "Users & Roles"}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Manage platform users, update access permissions, and roles.
                                </CardDescription>
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("search_users") || "Search users..."}
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-lg">
                                {t("no_results")}
                            </div>
                        ) : (
                            <div className="border rounded-md bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs font-black">{t("user")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("role")}</TableHead>
                                            <TableHead className="text-xs font-black">{t("is_organizer") || "Organizer"}</TableHead>
                                            <TableHead className="text-xs font-black">{t("is_team_manager") || "Team Manager"}</TableHead>
                                            <TableHead className="text-xs font-black text-right">{t("created_at")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user) => (
                                            <TableRow key={user.id} className="text-xs">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{user.full_name || "N/A"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{user.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        disabled={isPending}
                                                        value={user.role}
                                                        onValueChange={(val) => handleRoleChange(user.id, val as AdminUser['role'])}
                                                    >
                                                        <SelectTrigger className="w-[120px] h-8 text-[11px] font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="player" className="text-xs">Player</SelectItem>
                                                            <SelectItem value="team_manager" className="text-xs">Team Manager</SelectItem>
                                                            <SelectItem value="organizer" className="text-xs">Organizer</SelectItem>
                                                            <SelectItem value="admin" className="text-xs font-bold text-primary">Admin</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        disabled={isPending}
                                                        checked={user.is_organizer}
                                                        onCheckedChange={(checked) => handleToggleField(user.id, "is_organizer", checked)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        disabled={isPending}
                                                        checked={user.is_team_manager}
                                                        onCheckedChange={(checked) => handleToggleField(user.id, "is_team_manager", checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground text-[10px]">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
