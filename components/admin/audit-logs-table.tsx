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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminAuditLogsProps {
    initialLogs: AuditLog[];
    authLogs?: any[];
}

export function AdminAuditLogs({ initialLogs, authLogs = [] }: AdminAuditLogsProps) {
    const t = useTranslations("Admin");
    const locale = useLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

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
        if (action.includes("CREATE") || action.includes("ADD") || action.includes("PAYMENT")) return "default"; // typically black/primary
        if (action.includes("UPDATE") || action.includes("INVITE")) return "secondary"; // gray
        if (action.includes("DELETE") || action.includes("REMOVE")) return "destructive"; // red
        return "outline";
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("total_activity")}</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLogs}</div>
                        <p className="text-xs text-muted-foreground">{t("recorded_actions")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("tournament_actions")}</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tournamentLogs}</div>
                        <p className="text-xs text-muted-foreground">{t("creates_updates_deletes")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("payments")}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paymentLogs}</div>
                        <p className="text-xs text-muted-foreground">{t("transactions_recorded")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("critical_actions")}</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{suspiciousLogs}</div>
                        <p className="text-xs text-muted-foreground">{t("deletions_removals")}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="system" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="system">System Logs</TabsTrigger>
                    <TabsTrigger value="auth">Auth Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="system" className="space-y-4">
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
                    <div className="rounded-none border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">{t("time")}</TableHead>
                                    <TableHead className="w-[180px]">{t("user")}</TableHead>
                                    <TableHead className="w-[120px]">IP Address</TableHead>
                                    <TableHead className="w-[130px]">{t("action")}</TableHead>
                                    <TableHead className="w-[130px]">{t("target")}</TableHead>
                                    <TableHead>{t("details")}</TableHead>
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
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(log.created_at, "d MMM yyyy, HH:mm", locale)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
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
                                                <Badge variant={getActionColor(log.action)} className="text-[10px] px-1 py-0 h-4">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium capitalize">{log.target_type}</span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">
                                                        {log.target_id.split('-')[0]}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="relative bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground block max-w-[300px] truncate" title={JSON.stringify(log.details, null, 2)}>
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
                            <div className="text-sm text-muted-foreground hidden sm:block">
                                Showing {(systemPage - 1) * itemsPerPage + 1} to {Math.min(systemPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSystemPage(p => Math.max(1, p - 1))}
                                    disabled={systemPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground px-2">Page {systemPage} of {totalSystemPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSystemPage(p => Math.min(totalSystemPages, p + 1))}
                                    disabled={systemPage === totalSystemPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="auth" className="space-y-4">
                    <div className="rounded-none border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">{t("time")}</TableHead>
                                    <TableHead className="w-[200px]">IP Address</TableHead>
                                    <TableHead>Event Payload</TableHead>
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
                                    paginatedAuthLogs.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(log.created_at, "d MMM yyyy, HH:mm", locale)}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {log.ip_address || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                <code className="relative bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground block max-w-full overflow-x-auto whitespace-pre-wrap" title={JSON.stringify(log.payload, null, 2)}>
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
                            <div className="text-sm text-muted-foreground hidden sm:block">
                                Showing {(authPage - 1) * itemsPerPage + 1} to {Math.min(authPage * itemsPerPage, authLogs.length)} of {authLogs.length} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAuthPage(p => Math.max(1, p - 1))}
                                    disabled={authPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground px-2">Page {authPage} of {totalAuthPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAuthPage(p => Math.min(totalAuthPages, p + 1))}
                                    disabled={authPage === totalAuthPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
