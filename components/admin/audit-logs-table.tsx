"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuditLog } from "@/types";
import { formatDate } from "@/lib/date";
import { useLocale } from "next-intl";
import { Search, Filter, ShieldAlert, FileText, User, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tab } from "@/components/ui/tab";

interface AdminAuditLogsProps {
    initialLogs: AuditLog[];
    authLogs?: Record<string, unknown>[];
}

export function AdminAuditLogs({ initialLogs, authLogs = [] }: AdminAuditLogsProps) {
    const t = useTranslations("Admin");
    const locale = useLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const [activeTab, setActiveTab] = useState<"system" | "auth">("system");
    const [systemPage, setSystemPage] = useState(1);
    const [authPage, setAuthPage] = useState(1);
    const itemsPerPage = 100;

    // Extract unique action types for filter
    const actionTypes = Array.from(new Set(initialLogs.map(log => log.action)));

    // Filter logs
    const filteredLogs = initialLogs.filter(log => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.target_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.ip_address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === "all" || log.action === typeFilter;

        return matchesSearch && matchesType;
    });

    const paginatedSystemLogs = filteredLogs.slice((systemPage - 1) * itemsPerPage, systemPage * itemsPerPage);
    const totalSystemPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;

    const paginatedAuthLogs = authLogs.slice((authPage - 1) * itemsPerPage, authPage * itemsPerPage);
    const totalAuthPages = Math.ceil(authLogs.length / itemsPerPage) || 1;

    // Calculate stats
    const totalLogs = initialLogs.length;
    const paymentLogs = initialLogs.filter(l => l.target_type === 'payment').length;
    const tournamentLogs = initialLogs.filter(l => l.target_type === 'tournament').length;
    const suspiciousLogs = initialLogs.filter(l => l.action.includes('DELETE') || l.action.includes('REMOVE')).length;

    const getActionColor = (action: string) => {
        if (action.includes("CREATE") || action.includes("ADD") || action.includes("PAYMENT")) return "default";
        if (action.includes("UPDATE") || action.includes("INVITE")) return "default";
        if (action.includes("DELETE") || action.includes("REMOVE")) return "destructive";
        return "outline";
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-2 md:gap-4 lg:grid-cols-4">
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-primary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("total_activity")}
                        </CardTitle>
                        <FileText className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">
                            {totalLogs}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-primary/40" />
                            {t("recorded_actions")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-primary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("tournament_actions")}
                        </CardTitle>
                        <ShieldAlert className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">
                            {tournamentLogs}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-primary/40" />
                            {t("creates_updates_deletes")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-primary/30">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("payments")}
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-primary/70 opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">
                            {paymentLogs}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-primary/30" />
                            {t("transactions_recorded")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-destructive/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-destructive/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("critical_actions")}
                        </CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none text-destructive">
                            {suspiciousLogs}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-destructive/40" />
                            {t("deletions_removals")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tab
                value={activeTab}
                onChange={(val) => setActiveTab(val as "system" | "auth")}
                className="mb-6"
                options={[
                    { label: "System Logs", value: "system", icon: FileText },
                    { label: "Auth Logs", value: "auth", icon: ShieldAlert }
                ]}
            />

            {activeTab === "system" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("search_logs")}
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setSearchTerm(e.target.value);
                                    setSystemPage(1);
                                }}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(val) => {
                            setTypeFilter(val);
                            setSystemPage(1);
                        }}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    <SelectValue placeholder={t("filter_by_action")} />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("all_actions")}</SelectItem>
                                {actionTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="border border-border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="w-[180px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("time")}</TableHead>
                                    <TableHead className="w-[180px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("user")}</TableHead>
                                    <TableHead className="w-[120px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">IP Address</TableHead>
                                    <TableHead className="w-[130px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("action")}</TableHead>
                                    <TableHead className="w-[130px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("target")}</TableHead>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("details")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            {t("no_results")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSystemLogs.map((log) => (
                                        <TableRow key={log.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                            <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(log.created_at, "d MMM yyyy, HH:mm", locale)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 bg-primary/10 flex items-center justify-center border border-primary/20">
                                                        <User className="h-3 w-3 text-primary" />
                                                    </div>
                                                    <span className="text-sm truncate max-w-[120px]" title={log.user?.email || 'Unknown'}>
                                                        {log.user?.email || t("system")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] text-muted-foreground">
                                                {log.ip_address || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getActionColor(log.action)} className="text-[10px] px-1.5 py-0.5 h-auto font-black">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold capitalize">{log.target_type}</span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">
                                                        {log.target_id.split('-')[0]}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="relative bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground block max-w-[300px] truncate border border-border/50" title={JSON.stringify(log.details, null, 2)}>
                                                    {JSON.stringify(log.details)}
                                                </code>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredLogs.length > 0 && (
                        <div className="flex items-center justify-between py-2 mt-2">
                            <div className="text-[10px] tracking-wider font-bold text-muted-foreground hidden sm:block">
                                Showing {(systemPage - 1) * itemsPerPage + 1} to {Math.min(systemPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] font-black"
                                    onClick={() => setSystemPage(p => Math.max(1, p - 1))}
                                    disabled={systemPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-[10px] tracking-wider font-bold text-muted-foreground px-2">Page {systemPage} of {totalSystemPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] font-black"
                                    onClick={() => setSystemPage(p => Math.min(totalSystemPages, p + 1))}
                                    disabled={systemPage === totalSystemPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "auth" && (
                <div className="space-y-4">
                    <div className="border border-border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="w-[180px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("time")}</TableHead>
                                    <TableHead className="w-[200px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">IP Address</TableHead>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">Event Payload</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {authLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            {t("no_results")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedAuthLogs.map((log: Record<string, unknown>) => (
                                        <TableRow key={log.id as string} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                            <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(log.created_at as string, "d MMM yyyy, HH:mm", locale)}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {log.ip_address as string || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                <code className="relative bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground block max-w-full overflow-x-auto whitespace-pre-wrap border border-border/50" title={JSON.stringify(log.payload, null, 2)}>
                                                    {log.payload ? JSON.stringify(log.payload) : '{}'}
                                                </code>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {authLogs.length > 0 && (
                        <div className="flex items-center justify-between py-2 mt-2">
                            <div className="text-[10px] tracking-wider font-bold text-muted-foreground hidden sm:block">
                                Showing {(authPage - 1) * itemsPerPage + 1} to {Math.min(authPage * itemsPerPage, authLogs.length)} of {authLogs.length} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] font-black"
                                    onClick={() => setAuthPage(p => Math.max(1, p - 1))}
                                    disabled={authPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-[10px] tracking-wider font-bold text-muted-foreground px-2">Page {authPage} of {totalAuthPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] font-black"
                                    onClick={() => setAuthPage(p => Math.min(totalAuthPages, p + 1))}
                                    disabled={authPage === totalAuthPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
