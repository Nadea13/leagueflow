"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Payment } from "@/types";
import { formatDate } from "@/lib/date";
import { useLocale } from "next-intl";
import Image from "next/image";
import { Search, CreditCard, Filter, ArrowUpRight, Check, User } from "lucide-react";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { approvePayment, rejectPayment } from "@/app/[locale]/admin/finance/actions";

interface AdminPaymentsTableProps {
    initialPayments: Payment[];
}

export function AdminPaymentsTable({ initialPayments }: AdminPaymentsTableProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const itemsPerPage = 100;

    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const { toast } = useToast();

    const handleVerify = (payment: Payment) => {
        setSelectedPayment(payment);
        setIsVerifyDialogOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedPayment) return;
        setIsVerifying(true);
        try {
            const res = await approvePayment(selectedPayment.id);
            if (res.success) {
                toast({ title: tCommon("success"), description: t("status_success", { defaultValue: "Payment Approved" }) });
                setIsVerifyDialogOpen(false);
            } else {
                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: tCommon("error"), description: error instanceof Error ? error.message : String(error), variant: "destructive" });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReject = async () => {
        if (!selectedPayment) return;
        setIsVerifying(true);
        try {
            const res = await rejectPayment(selectedPayment.id);
            if (res.success) {
                toast({ title: tCommon("success"), description: t("status_failed", { defaultValue: "Payment Rejected" }) });
                setIsVerifyDialogOpen(false);
            } else {
                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: tCommon("error"), description: error instanceof Error ? error.message : String(error), variant: "destructive" });
        } finally {
            setIsVerifying(false);
        }
    };

    // Filter payments
    const filteredPayments = initialPayments.filter(payment => {
        const matchesSearch =
            (payment.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.provider_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.id || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const paginatedPayments = filteredPayments.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;

    // Stats
    const totalAmount = initialPayments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const successfulPayments = initialPayments.filter(p => p.status === 'success').length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return "default";
            case 'pending': return "primary";
            case 'failed': return "destructive";
            default: return "outline";
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-3 md:gap-4">
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-primary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("total_revenue")}
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">
                            ฿{totalAmount.toLocaleString()}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-primary/40" />
                            {t("all_time_earnings")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-emerald-500/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-emerald-500/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("recent_transactions")}
                        </CardTitle>
                        <Check className="h-4 w-4 text-emerald-500 opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">
                            {successfulPayments}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-emerald-500/40" />
                            {t("transactions_recorded")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card py-2 md:py-6 shadow-none overflow-hidden relative group transition-all hover:border-primary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("total_activity")}
                        </CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-primary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter leading-none">
                            {initialPayments.length}
                        </div>
                        <p className="hidden md:flex text-[10px] font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-primary/40" />
                            {t("recorded_actions")}
                        </p>
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
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                }}>
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
            <div className="rounded-none border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[180px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("date")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("user")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("details")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">PG ID</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("amount")}</TableHead>
                            <TableHead className="text-right text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("status")}</TableHead>
                            <TableHead className="text-right text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("actions", { defaultValue: "Actions" })}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    {t("no_results")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedPayments.map((payment) => (
                                <TableRow key={payment.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                        {formatDate(payment.created_at, "d MMM yyyy, HH:mm", locale)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                                <User className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm truncate">{payment.user?.email || t("unknown")}</span>
                                                <span className="text-[10px] text-muted-foreground tracking-wider font-medium">{payment.user?.full_name}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold capitalize">
                                                {payment.plan ? t("plan_label", { plan: payment.plan }) : t("one_time")}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground tracking-wider">
                                                {payment.tournament_id ? t("tournament_upgrade") : t("subscription")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="font-mono text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 border border-border/50" title={payment.provider_id || ''}>
                                            {payment.provider_id ?
                                                (payment.provider_id.length > 20 ? payment.provider_id.substring(0, 20) + '...' : payment.provider_id)
                                                : '-'}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-black text-sm">฿{payment.amount.toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant={getStatusColor(payment.status)}
                                            className="rounded-none text-[10px] font-black"
                                        >
                                            {payment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {payment.status === 'pending' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleVerify(payment)}
                                                className="rounded-none text-[10px] font-black"
                                            >
                                                Verify
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {filteredPayments.length > 0 && (
                <div className="flex items-center justify-between py-2 mt-2">
                    <div className="text-[10px] tracking-wider font-bold text-muted-foreground hidden sm:block">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none text-[10px] font-black"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-[10px] tracking-wider font-bold text-muted-foreground px-2">Page {page} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none text-[10px] font-black"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Verify Dialog */}
            <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-none border-border p-0 overflow-hidden">
                    <div className="bg-primary/10 px-6 py-5 border-b border-border relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black tracking-tighter text-foreground">
                                Verify Payment
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm font-medium pt-1">
                                Review the uploaded slip to confirm the payment.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 py-6">
                        {selectedPayment?.provider_id ? (
                            <div className="flex justify-center">
                                {(() => {
                                    try {
                                        const parsed = JSON.parse(selectedPayment.provider_id);
                                        return parsed.url ? <Image src={parsed.url} alt="Slip" width={400} height={600} className="max-h-[400px] object-contain" unoptimized /> : <p>No image available</p>;
                                    } catch (_e) {
                                        return <p className="text-muted-foreground break-all font-mono text-xs">{selectedPayment.provider_id}</p>;
                                    }
                                })()}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">No slip uploaded for this payment.</p>
                        )}
                        <div className="mt-6 text-center border-t border-border pt-4">
                            <p className="text-3xl font-black tracking-tighter">฿{selectedPayment?.amount.toLocaleString()}</p>
                            <p className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground mt-1 capitalize">{selectedPayment?.plan}</p>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between w-full px-6 pb-6">
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isVerifying}
                            className="rounded-none text-[10px] font-black"
                        >
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reject
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsVerifyDialogOpen(false)}
                                disabled={isVerifying}
                                className="rounded-none text-[10px] font-black"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                onClick={handleApprove}
                                disabled={isVerifying}
                                className="rounded-none text-[10px] font-black"
                            >
                                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Approve
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
