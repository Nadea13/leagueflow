"use client"

import { useState, useTransition, useEffect } from "react"
import { Tab, TabOption } from "@/components/ui/tab"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, CreditCard, Users, Search, Check, X, CheckCircle, XCircle, AlertCircle, Activity, Database, RefreshCw, HardDrive, UserCheck, Link as LinkIcon, Unlink, RotateCcw, ArrowRight, Loader2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { Payment, TournamentStatusRequest } from "@/types"
import { AdminUser, AdminMasterPlayer, updatePaymentStatus, updateUserFields, getSystemMonitorStats, SystemMonitorStats, ActiveUserInfo, linkMasterPlayerToUser, approveMasterPlayerRequest, rejectMasterPlayerRequest, approveTournamentStatusRequest, rejectTournamentStatusRequest } from "@/actions/common/admin"
import { cn } from "@/lib/utils"
import { Header } from "@/components/ui/header"

interface AdminClientProps {
    initialPayments: Payment[]
    initialUsers: AdminUser[]
    initialMasterPlayers: AdminMasterPlayer[]
    initialStatusRequests: TournamentStatusRequest[]
}

type TabType = "pending" | "payments" | "users" | "players" | "monitor" | "status_requests"

export function AdminClient({ initialPayments, initialUsers, initialMasterPlayers, initialStatusRequests }: AdminClientProps) {
    const t = useTranslations("Admin")
    const tCommon = useTranslations("Common")
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<TabType>("monitor")
    const [payments, setPayments] = useState<Payment[]>(initialPayments)
    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [masterPlayers, setMasterPlayers] = useState<AdminMasterPlayer[]>(initialMasterPlayers)
    const [statusRequests, setStatusRequests] = useState<TournamentStatusRequest[]>(initialStatusRequests || [])
    const [statusRequestSearch, setStatusRequestSearch] = useState("")
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [selectedRequestForReject, setSelectedRequestForReject] = useState<TournamentStatusRequest | null>(null)
    const [adminRejectReason, setAdminRejectReason] = useState("")
    const [paymentSearch, setPaymentSearch] = useState("")
    const [userSearch, setUserSearch] = useState("")
    const [playerSearch, setPlayerSearch] = useState("")
    const [playerFilter, setPlayerFilter] = useState<"all" | "unclaimed" | "claimed">("all")
    const [selectedUserForClaim, setSelectedUserForClaim] = useState<{ [playerId: string]: string }>({})
    const [isPending, startTransition] = useTransition()
    const [monitorStats, setMonitorStats] = useState<SystemMonitorStats | null>(null)
    const [isLoadingStats, setIsLoadingStats] = useState(false)
    const [logFilterTab, setLogFilterTab] = useState<"all" | "auth" | "guest">("all")

    const [presenceUsers, _setPresenceUsers] = useState<ActiveUserInfo[]>([])

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

        // Polling ticker (3s) for monitor stats
        const heartbeatId = setInterval(() => {
            fetchMonitorStats(false)
        }, 3000)

        return () => {
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
            value: "status_requests",
            label: "Status Requests",
            icon: RotateCcw,
            badge: statusRequests.filter(r => r.status === 'pending').length > 0 ? statusRequests.filter(r => r.status === 'pending').length : undefined
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
        },
        {
            value: "players",
            label: "Master Players",
            icon: UserCheck,
            badge: masterPlayers.filter(mp => !mp.user_id).length > 0 ? masterPlayers.filter(mp => !mp.user_id).length : undefined
        }
    ]

    const handleApproveStatusRequest = async (tournamentId: string) => {
        if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการอนุมัติคำขอเปลี่ยนสถานะของทัวร์นาเมนต์นี้?")) return

        startTransition(async () => {
            const res = await approveTournamentStatusRequest(tournamentId)
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: "อนุมัติคำขอเปลี่ยนสถานะเรียบร้อยแล้ว สถานะทัวร์นาเมนต์ถูกเปลี่ยนแล้ว"
                })
                setStatusRequests(prev => prev.map(r => r.tournament_id === tournamentId ? { ...r, status: 'approved' } : r))
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error || "เกิดข้อผิดพลาดในการอนุมัติ",
                    variant: "destructive"
                })
            }
        })
    }

    const handleRejectStatusRequest = async () => {
        if (!selectedRequestForReject) return
        const tournamentId = selectedRequestForReject.tournament_id

        startTransition(async () => {
            const res = await rejectTournamentStatusRequest(tournamentId, adminRejectReason.trim())
            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: "ปฏิเสธคำขอเรียบร้อยแล้ว"
                })
                setRejectDialogOpen(false)
                setSelectedRequestForReject(null)
                setAdminRejectReason("")
                setStatusRequests(prev => prev.map(r => r.tournament_id === tournamentId ? { ...r, status: 'rejected', reject_reason: adminRejectReason.trim() } : r))
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error || "เกิดข้อผิดพลาดในการปฏิเสธ",
                    variant: "destructive"
                })
            }
        })
    }

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

    const handleLinkPlayer = async (masterPlayerId: string, userId: string | null) => {
        startTransition(async () => {
            const res = await linkMasterPlayerToUser(masterPlayerId, userId)
            if (res.success) {
                const targetUser = users.find(u => u.id === userId)
                setMasterPlayers(prev => prev.map(mp => mp.id === masterPlayerId ? {
                    ...mp,
                    user_id: userId,
                    user: targetUser ? { email: targetUser.email, full_name: targetUser.full_name } : null
                } : mp))
                toast({
                    title: tCommon("success") || "Success",
                    description: userId ? "Successfully assigned player to user" : "Unlinked player from user",
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

    const handleApprovePlayer = async (masterPlayerId: string) => {
        startTransition(async () => {
            const res = await approveMasterPlayerRequest(masterPlayerId)
            if (res.success) {
                setMasterPlayers(prev => prev.map(mp => mp.id === masterPlayerId ? {
                    ...mp,
                    verified: true
                } : mp))
                toast({
                    title: tCommon("success") || "Success",
                    description: "ยืนยันข้อมูลผู้เล่นสำเร็จ (Verified)",
                })
            } else {
                toast({
                    title: tCommon("error") || "Error",
                    description: res.error || "Failed to approve request",
                    variant: "destructive"
                })
            }
        })
    }

    const handleRejectPlayer = async (masterPlayerId: string) => {
        startTransition(async () => {
            const res = await rejectMasterPlayerRequest(masterPlayerId)
            if (res.success) {
                setMasterPlayers(prev => prev.map(mp => mp.id === masterPlayerId ? {
                    ...mp,
                    user_id: null,
                    verified: false,
                    user: null
                } : mp))
                toast({
                    title: tCommon("success") || "Success",
                    description: "ปฏิเสธคำขอและปลดการผูกบัญชีสำเร็จ",
                })
            } else {
                toast({
                    title: tCommon("error") || "Error",
                    description: res.error || "Failed to reject request",
                    variant: "destructive"
                })
            }
        })
    }

    const filteredMasterPlayers = masterPlayers.filter(mp => {
        const query = playerSearch.toLowerCase()
        const fullNameLocal = `${mp.first_name_local || mp.first_name_th || ''} ${mp.last_name_local || mp.last_name_th || ''}`.toLowerCase()
        const fullNameIntl = `${mp.first_name_intl || mp.first_name_en || ''} ${mp.last_name_intl || mp.last_name_en || ''}`.toLowerCase()
        const matchesQuery = (
            fullNameLocal.includes(query) ||
            fullNameIntl.includes(query) ||
            (mp.tel || "").toLowerCase().includes(query) ||
            (mp.user?.email || "").toLowerCase().includes(query) ||
            (mp.user?.full_name || "").toLowerCase().includes(query) ||
            mp.id.toLowerCase().includes(query)
        )

        if (!matchesQuery) return false
        if (playerFilter === "unclaimed") return !mp.user_id
        if (playerFilter === "claimed") return !!mp.user_id
        return true
    })

    const pendingPayments = payments.filter(p => p.status === "pending")
    const filteredStatusRequests = statusRequests.filter(req => {
        const query = statusRequestSearch.toLowerCase().trim()
        if (!query) return true
        return (
            (req.tournament_name && req.tournament_name.toLowerCase().includes(query)) ||
            (req.requested_by_name && req.requested_by_name.toLowerCase().includes(query)) ||
            (req.requested_by_email && req.requested_by_email.toLowerCase().includes(query)) ||
            (req.reason && req.reason.toLowerCase().includes(query))
        )
    })

    return (
        <div className="space-y-2 lg:space-y-4 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <Header level={2}>{t("title") || "Admin Dashboard"}</Header>
                <Tab options={tabOptions} value={activeTab} onChange={setActiveTab} />
            </div>

            {activeTab === "monitor" && (
                <div className="space-y-1 lg:space-y-2">
                    <div className="flex justify-between items-center bg-card p-2 lg:p-4 rounded-sm border">
                        <div>
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                System Infrastructure & Database Metrics
                                <Badge variant="outline" className="text-primary bg-primary/10 border-primary/50">
                                    Live
                                </Badge>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Real-time connection status, latency, and database data breakdown.
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
                                    <Badge variant="outline">
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
                                <CardDescription>Realtime online user sessions tracked across active sessions.</CardDescription>
                            </div>
                            {(() => {
                                const allActiveUsers = [...(monitorStats?.activeUsers || [])]
                                presenceUsers.forEach(pu => {
                                    if (!allActiveUsers.some(u => u.id === pu.id || u.email === pu.email)) {
                                        allActiveUsers.push(pu)
                                    }
                                })
                                return (
                                    <Badge variant="outline" className="font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
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
                                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/50">
                                                            Online
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-card">
                                                            Offline
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
                            <CardDescription>Live row counts across core data tables in database.</CardDescription>
                        </div>
                        <div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 lg:gap-2 text-center">
                                <div className="p-3 rounded-sm bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.users ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Users</div>
                                </div>
                                <div className="p-3 rounded-sm bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.tournaments ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Tournaments</div>
                                </div>
                                <div className="p-3 rounded-sm bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.teams ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Teams</div>
                                </div>
                                <div className="p-3 rounded-sm bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.matches ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Matches</div>
                                </div>
                                <div className="p-3 rounded-sm bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.payments ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Payments</div>
                                </div>
                                <div className="p-3 rounded-sm bg-card border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.players ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground mt-1">Master Players</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Activity & Logs */}
                    <div className="space-y-1 lg:space-y-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div>
                                <Header level={4}>System Activity & Logs</Header>
                                <CardDescription>Live system activity, registration events, and visitor logs fetched from system.</CardDescription>
                            </div>
                            <Tab
                                options={[
                                    { value: "all", label: "All Logs" },
                                    { value: "auth", label: "Logged-in Users", icon: Shield },
                                    { value: "guest", label: "Guests / Public", icon: Users }
                                ]}
                                value={logFilterTab}
                                onChange={(val) => setLogFilterTab(val)}
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
                                                className="flex items-center justify-between p-2.5 rounded-sm bg-muted/40 border text-xs"
                                            >
                                                <div className="flex items-center gap-1 lg:gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
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
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-sm">
                                No pending payment confirmations.
                            </div>
                        ) : (
                            <div className="border rounded-sm bg-card overflow-hidden">
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
                                                            <Check className="h-4 w-4" />
                                                            {t("approve") || "Approve"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={isPending}
                                                            onClick={() => handlePaymentAction(pmt.id, 'failed')}
                                                            className="font-bold text-[10px] h-7 px-2"
                                                        >
                                                            <X className="h-4 w-4" />
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

            {activeTab === "status_requests" && (
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
                                    <RotateCcw className="size-4 text-warning" />
                                    <span>คำขอเปลี่ยนสถานะการแข่งขัน (Tournament Status Change Requests)</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    พิจารณาคำขอจากผู้จัดการแข่งขันที่ต้องการเปลี่ยนสถานะของทัวร์นาเมนต์ที่เสร็จสิ้นหรือถูกยกเลิกแล้ว
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="ค้นหาทัวร์นาเมนต์หรือผู้ขอ..."
                                        value={statusRequestSearch}
                                        onChange={(e) => setStatusRequestSearch(e.target.value)}
                                        className="pl-8 text-xs h-8"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredStatusRequests.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-sm">
                                ไม่มีคำขอเปลี่ยนสถานะการแข่งขัน
                            </div>
                        ) : (
                            <div className="border rounded-sm bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs font-black">ทัวร์นาเมนต์</TableHead>
                                            <TableHead className="text-xs font-black">ผู้ยื่นคำขอ</TableHead>
                                            <TableHead className="text-xs font-black">การเปลี่ยนสถานะ</TableHead>
                                            <TableHead className="text-xs font-black">เหตุผล</TableHead>
                                            <TableHead className="text-xs font-black">วันเวลาที่ยื่น</TableHead>
                                            <TableHead className="text-xs font-black">สถานะคำขอ</TableHead>
                                            <TableHead className="text-xs font-black text-right">ดำเนินการ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStatusRequests.map((req) => (
                                            <TableRow key={req.id} className="text-xs">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <Link
                                                            href={`/dashboard/tournaments/${req.tournament_id}`}
                                                            target="_blank"
                                                            className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                                                        >
                                                            <span>{req.tournament_name || req.tournament_id}</span>
                                                        </Link>
                                                        {req.sport_name && (
                                                            <span className="text-[10px] text-muted-foreground">{req.sport_name}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">{req.requested_by_name || "N/A"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{req.requested_by_email || req.requested_by}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0 h-4 font-semibold capitalize",
                                                                req.current_status === 'completed' && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                                                                req.current_status === 'cancelled' && "border-destructive/40 bg-destructive/10 text-destructive",
                                                                req.current_status === 'ongoing' && "border-primary/40 bg-primary/10 text-primary",
                                                                req.current_status === 'draft' && "border-border bg-muted/40 text-muted-foreground"
                                                            )}
                                                        >
                                                            {req.current_status}
                                                        </Badge>
                                                        <ArrowRight className="size-3 text-muted-foreground" />
                                                        <Badge
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0 h-4 font-semibold capitalize text-white",
                                                                req.target_status === 'ongoing' && "bg-primary",
                                                                req.target_status === 'draft' && "bg-muted-foreground",
                                                                req.target_status === 'completed' && "bg-emerald-600",
                                                                req.target_status === 'cancelled' && "bg-destructive"
                                                            )}
                                                        >
                                                            {req.target_status}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <span className="text-[11px] text-foreground/90 line-clamp-2" title={req.reason}>
                                                        {req.reason || "-"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {new Date(req.requested_at).toLocaleString('th-TH')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] font-bold px-2 py-0.5",
                                                            req.status === 'pending' && "bg-warning/10 text-warning border-warning/30",
                                                            req.status === 'approved' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                                                            req.status === 'rejected' && "bg-destructive/10 text-destructive border-destructive/30",
                                                            req.status === 'cancelled' && "bg-muted text-muted-foreground border-border"
                                                        )}
                                                    >
                                                        {req.status === 'pending' ? "รออนุมัติ (Pending)"
                                                            : req.status === 'approved' ? "อนุมัติแล้ว (Approved)"
                                                            : req.status === 'rejected' ? "ปฏิเสธ (Rejected)"
                                                            : "ยกเลิก (Cancelled)"}
                                                    </Badge>
                                                    {req.reject_reason && (
                                                        <p className="text-[10px] text-destructive mt-0.5 max-w-[150px] truncate" title={req.reject_reason}>
                                                            เหตุผล: {req.reject_reason}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {req.status === 'pending' ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                disabled={isPending}
                                                                onClick={() => handleApproveStatusRequest(req.tournament_id)}
                                                                className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                            >
                                                                <Check className="size-3.5 mr-1" />
                                                                อนุมัติ
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={isPending}
                                                                onClick={() => {
                                                                    setSelectedRequestForReject(req);
                                                                    setAdminRejectReason("");
                                                                    setRejectDialogOpen(true);
                                                                }}
                                                                className="h-7 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                                                            >
                                                                <X className="size-3.5 mr-1" />
                                                                ปฏิเสธ
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground">-</span>
                                                    )}
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
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-sm">
                                {t("no_results")}
                            </div>
                        ) : (
                            <div className="border rounded-sm bg-card overflow-hidden">
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
                                                            pmt.status === "success" && "bg-green-500/10 text-green-500 border-green-500/20",
                                                            pmt.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                                                            pmt.status === "failed" && "bg-red-500/10 text-red-500 border-red-500/20"
                                                        )}
                                                    >
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
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-sm">
                                {t("no_results")}
                            </div>
                        ) : (
                            <div className="border rounded-sm bg-card overflow-hidden">
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

            {activeTab === "players" && (
                <Card className="border rounded-sm bg-card">
                    <CardHeader className="py-2 lg:py-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-primary" />
                                    Master Players Management
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    List of all registered master player profiles from master_players table and user account claims.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                <Tab
                                    options={[
                                        { value: "all", label: "All Players" },
                                        { value: "unclaimed", label: "Unclaimed", badge: masterPlayers.filter(mp => !mp.user_id).length },
                                        { value: "claimed", label: "Claimed" }
                                    ]}
                                    value={playerFilter}
                                    onChange={(val) => setPlayerFilter(val)}
                                />
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, phone, email..."
                                        value={playerSearch}
                                        onChange={(e) => setPlayerSearch(e.target.value)}
                                        className="pl-9 h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredMasterPlayers.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-sm">
                                {t("no_results")}
                            </div>
                        ) : (
                            <div className="border rounded-sm bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs font-black">Player</TableHead>
                                            <TableHead className="text-xs font-black">Gender & DOB</TableHead>
                                            <TableHead className="text-xs font-black">Phone</TableHead>
                                            <TableHead className="text-xs font-black">Claimed User Account</TableHead>
                                            <TableHead className="text-xs font-black">Claim Action / Link User</TableHead>
                                            <TableHead className="text-xs font-black text-right">Created Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMasterPlayers.map((mp) => {
                                            const nameLocal = `${mp.first_name_local || mp.first_name_th || ''} ${mp.middle_name_local || mp.middle_name_th || ''} ${mp.last_name_local || mp.last_name_th || ''}`.trim()
                                            const nameIntl = `${mp.first_name_intl || mp.first_name_en || ''} ${mp.middle_name_intl || mp.middle_name_en || ''} ${mp.last_name_intl || mp.last_name_en || ''}`.trim()
                                            const displayName = nameLocal || nameIntl || "Unnamed Player"

                                            return (
                                                <TableRow key={mp.id} className="text-xs">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            {(mp.photo_url || mp.profile_img) ? (
                                                                 
                                                                <img
                                                                    src={(mp.photo_url || mp.profile_img) || ""}
                                                                    alt={displayName}
                                                                    className="w-8 h-8 rounded-full object-cover border"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground border">
                                                                    {displayName.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-foreground">{displayName}</span>
                                                                {nameIntl && nameLocal && (
                                                                    <span className="text-[10px] text-muted-foreground">{nameIntl}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-[11px]">
                                                            <span className="capitalize text-foreground font-medium">{mp.gender}</span>
                                                            <span className="text-[10px] text-muted-foreground">{mp.birthday || '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[11px]">
                                                        {mp.tel || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {mp.user_id ? (
                                                            <div className="flex items-center gap-1.5">
                                                                {mp.verified ? (
                                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/40">
                                                                        Verified
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/40 animate-pulse">
                                                                        รอยืนยันคำขอ
                                                                    </Badge>
                                                                )}
                                                                <div className="flex flex-col text-[10px]">
                                                                    <span className="font-bold text-foreground">{mp.user?.full_name || 'User'}</span>
                                                                    <span className="text-muted-foreground font-mono">{mp.user?.email}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/40">
                                                                Unclaimed / Master Only
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {mp.user_id && !mp.verified ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isPending}
                                                                    onClick={() => handleApprovePlayer(mp.id)}
                                                                    className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-bold"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" /> ยืนยัน (Accept)
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={isPending}
                                                                    onClick={() => handleRejectPlayer(mp.id)}
                                                                    className="h-7 text-[11px] text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                                                                >
                                                                    <XCircle className="h-4 w-4" /> ปฏิเสธ (Reject)
                                                                </Button>
                                                            </div>
                                                        ) : mp.user_id && mp.verified ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={isPending}
                                                                onClick={() => handleLinkPlayer(mp.id, null)}
                                                                className="h-7 text-[11px] text-muted-foreground hover:bg-muted gap-1"
                                                            >
                                                                <Unlink className="h-4 w-4" /> Unlink User
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <Select
                                                                    disabled={isPending}
                                                                    value={selectedUserForClaim[mp.id] || ""}
                                                                    onValueChange={(val) => setSelectedUserForClaim(prev => ({ ...prev, [mp.id]: val }))}
                                                                >
                                                                    <SelectTrigger className="w-[180px] h-7 text-[11px]">
                                                                        <SelectValue placeholder="Select user account..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {users.map((u) => (
                                                                            <SelectItem key={u.id} value={u.id} className="text-xs">
                                                                                {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isPending || !selectedUserForClaim[mp.id]}
                                                                    onClick={() => handleLinkPlayer(mp.id, selectedUserForClaim[mp.id])}
                                                                    className="h-7 text-[11px] gap-1 font-bold"
                                                                >
                                                                    <LinkIcon className="h-4 w-4" /> Assign User
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground text-[10px]">
                                                        {new Date(mp.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Reject Status Request Dialog */}
            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="p-2 lg:p-4 border-b">
                            <Header level={4} className="text-destructive">
                                ปฏิเสธคำขอเปลี่ยนสถานะการแข่งขัน
                            </Header>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 lg:p-4 text-xs text-foreground/80 space-y-3">
                            <p>
                                คุณกำลังจะปฏิเสธคำขอเปลี่ยนสถานะของทัวร์นาเมนต์:{" "}
                                <span className="font-bold text-foreground">
                                    {selectedRequestForReject?.tournament_name}
                                </span>
                            </p>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-foreground">
                                    ระบุเหตุผลในการปฏิเสธคำขอ (จะแสดงให้ผู้จัดการแข่งขันเห็น):
                                </label>
                                <Input
                                    value={adminRejectReason}
                                    onChange={(e) => setAdminRejectReason(e.target.value)}
                                    placeholder="เช่น ไม่อนุญาตเนื่องจากการแข่งขันจบสิ้นสมบูรณ์แล้ว"
                                    className="text-xs"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-2 lg:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                        <AlertDialogCancel
                            onClick={() => {
                                setRejectDialogOpen(false);
                                setSelectedRequestForReject(null);
                            }}
                            className="mt-0"
                            disabled={isPending}
                        >
                            ยกเลิก
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRejectStatusRequest}
                            disabled={isPending}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                        >
                            {isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                            ยืนยันปฏิเสธ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

