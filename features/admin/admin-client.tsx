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
import { Shield, CreditCard, Users, Search, Check, X, CheckCircle, XCircle, AlertCircle, Activity, Database, Server, RefreshCw, ExternalLink, HardDrive, Zap } from "lucide-react"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { Payment } from "@/types"
import { AdminUser, updatePaymentStatus, updateUserFields, getSystemMonitorStats, SystemMonitorStats } from "@/actions/common/admin"
import { cn } from "@/lib/utils"

interface AdminClientProps {
    initialPayments: Payment[]
    initialUsers: AdminUser[]
}

type TabType = "pending" | "payments" | "users" | "monitor"

export function AdminClient({ initialPayments, initialUsers }: AdminClientProps) {
    const t = useTranslations("Admin")
    const tCommon = useTranslations("Common")
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<TabType>("pending")
    const [payments, setPayments] = useState<Payment[]>(initialPayments)
    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [paymentSearch, setPaymentSearch] = useState("")
    const [userSearch, setUserSearch] = useState("")
    const [isPending, startTransition] = useTransition()
    const [monitorStats, setMonitorStats] = useState<SystemMonitorStats | null>(null)
    const [isLoadingStats, setIsLoadingStats] = useState(false)

    const fetchMonitorStats = async () => {
        setIsLoadingStats(true)
        const res = await getSystemMonitorStats()
        if (res.success && res.data) {
            setMonitorStats(res.data)
        }
        setIsLoadingStats(false)
    }

    useEffect(() => {
        if (activeTab === "monitor") {
            queueMicrotask(() => {
                fetchMonitorStats()
            })
        }
    }, [activeTab])

    const tabOptions: TabOption<TabType>[] = [
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
        },
        {
            value: "monitor",
            label: "System Monitor",
            icon: Activity
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
        <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        {t("title") || "Admin Dashboard"}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Global administrative console for managing plans, payments, and users.
                    </p>
                </div>
                <Tab options={tabOptions} value={activeTab} onChange={setActiveTab} />
            </div>

            {activeTab === "pending" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
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
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
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
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
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

            {activeTab === "monitor" && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
                        <div>
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                                System Infrastructure & Database Metrics
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Real-time connection status, latency, and Supabase data breakdown.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchMonitorStats}
                            disabled={isLoadingStats}
                            className="h-8 gap-1.5 text-xs font-medium"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingStats && "animate-spin")} />
                            Refresh Stats
                        </Button>
                    </div>

                    {/* Services Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                                    <span>Database (PostgreSQL)</span>
                                    <Database className="h-4 w-4 text-emerald-500" />
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black">
                                        {monitorStats?.services.database === 'operational' ? (
                                            <span className="text-emerald-500 flex items-center gap-1.5 text-base">
                                                <CheckCircle className="h-4 w-4" /> Operational
                                            </span>
                                        ) : (
                                            <span className="text-destructive flex items-center gap-1.5 text-base">
                                                <XCircle className="h-4 w-4" /> Issue Detected
                                            </span>
                                        )}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {monitorStats?.latencyMs ? `${monitorStats.latencyMs} ms` : '-'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                                    <span>Auth Service (GoTrue)</span>
                                    <Shield className="h-4 w-4 text-sky-500" />
                                </CardDescription>
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

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                                    <span>Storage Engine</span>
                                    <HardDrive className="h-4 w-4 text-purple-500" />
                                </CardDescription>
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

                    {/* Table Row Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                Database Table Statistics
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Live row counts across core data tables in Supabase.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
                                <div className="p-3 rounded-md bg-muted/40 border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.users ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground uppercase mt-1">Users</div>
                                </div>
                                <div className="p-3 rounded-md bg-muted/40 border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.tournaments ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground uppercase mt-1">Tournaments</div>
                                </div>
                                <div className="p-3 rounded-md bg-muted/40 border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.teams ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground uppercase mt-1">Teams</div>
                                </div>
                                <div className="p-3 rounded-md bg-muted/40 border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.matches ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground uppercase mt-1">Matches</div>
                                </div>
                                <div className="p-3 rounded-md bg-muted/40 border">
                                    <div className="text-2xl font-black text-foreground">{monitorStats?.tableCounts.payments ?? '-'}</div>
                                    <div className="text-[11px] font-medium text-muted-foreground uppercase mt-1">Payments</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supabase Studio Direct Embed / Full View */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    Deep Diagnostics & Supabase Studio
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                    Open local Supabase Studio console for SQL query performance, API logs, and authentication details.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                variant="default"
                                className="h-8 gap-1.5 text-xs font-semibold"
                                asChild
                            >
                                <a
                                    href={process.env.NEXT_PUBLIC_SUPABASE_STUDIO_URL || "http://127.0.0.1:55323"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Launch Supabase Studio
                                </a>
                            </Button>
                        </CardHeader>
                    </Card>
                </div>
            )}
        </div>
    )
}
