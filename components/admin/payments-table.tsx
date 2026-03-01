"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Payment } from "@/types";
import { formatDate } from "@/lib/date";
import { useLocale } from "next-intl";
import { Search, CreditCard, Filter, ArrowUpRight, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

interface AdminPaymentsTableProps {
    initialPayments: Payment[];
}

export function AdminPaymentsTable({ initialPayments }: AdminPaymentsTableProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Filter payments
    const filteredPayments = initialPayments.filter(payment => {
        const matchesSearch =
            (payment.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.provider_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.id || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalAmount = initialPayments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const successfulPayments = initialPayments.filter(p => p.status === 'success').length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return "default"; // black/primary
            case 'pending': return "secondary"; // gray
            case 'failed': return "destructive"; // red
            default: return "outline";
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("total_revenue")}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">฿{totalAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{t("all_time_earnings")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("recent_transactions")}</CardTitle>
                        <Check className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{successfulPayments}</div>
                        <p className="text-xs text-muted-foreground">{t("transactions_recorded")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("total_activity")}</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{initialPayments.length}</div>
                        <p className="text-xs text-muted-foreground">{t("recorded_actions")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("search_payments")}
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <SelectValue placeholder={t("status")} />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("all_statuses")}</SelectItem>
                        <SelectItem value="success">{t("status")}: {t("status_success")}</SelectItem>
                        <SelectItem value="pending">{t("status")}: {t("status_pending")}</SelectItem>
                        <SelectItem value="failed">{t("status")}: {t("status_failed")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-none border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">{t("date")}</TableHead>
                            <TableHead>{t("user")}</TableHead>
                            <TableHead>{t("details")}</TableHead>
                            <TableHead>PG ID</TableHead>
                            <TableHead>{t("amount")}</TableHead>
                            <TableHead className="text-right">{t("status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    {t("no_results")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                        {formatDate(payment.created_at, "d MMM yyyy, HH:mm", locale)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{payment.user?.email || t("unknown")}</span>
                                            <span className="text-xs text-muted-foreground">{payment.user?.full_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium capitalize">
                                                {payment.plan ? t("plan_label", { plan: payment.plan }) : t("one_time")}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {payment.tournament_id ? t("tournament_upgrade") : t("subscription")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-xs text-muted-foreground" title={payment.provider_id || ''}>
                                            {payment.provider_id ?
                                                (payment.provider_id.length > 20 ? payment.provider_id.substring(0, 20) + '...' : payment.provider_id)
                                                : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold">฿{payment.amount.toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getStatusColor(payment.status)}>
                                            {payment.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-muted-foreground text-center">
                {t.rich("showing_payments", {
                    count: filteredPayments.length,
                    total: initialPayments.length
                })}
            </div>
        </div>
    );
}
