"use client";

import { useState, useEffect } from "react";
import { TeamPayment } from "@/types/index";
import { getTeamPayments, updateTeamPayment, getFinancialSummary } from "@/app/[locale]/dashboard/tournaments/[id]/financial-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface FinancialSummaryProps {
    tournamentId: string;
}

export function FinancialSummary({ tournamentId }: FinancialSummaryProps) {
    const { toast } = useToast();
    const t = useTranslations("Financial");
    const [payments, setPayments] = useState<TeamPayment[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        const [paymentsRes, summaryRes] = await Promise.all([
            getTeamPayments(tournamentId),
            getFinancialSummary(tournamentId),
        ]);

        if (paymentsRes.success && paymentsRes.data) setPayments(paymentsRes.data);
        if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [tournamentId]);

    const handleStatusChange = async (teamId: string, status: 'pending' | 'paid' | 'waived') => {
        const payment = payments.find(p => p.team_id === teamId);
        const result = await updateTeamPayment(
            tournamentId,
            teamId,
            status,
            payment?.amount,
            payment?.notes || undefined
        );

        if (result.success) {
            toast({ title: t("updated"), description: t("status_updated") });
            fetchData();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 border rounded-none p-6 bg-background shadow-sm">
            <div>
                <h3 className="font-semibold leading-none tracking-tight mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t("title")}
                </h3>
                <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-none border bg-muted/20 text-center">
                        <p className="text-xs text-muted-foreground">{t("total_teams")}</p>
                        <p className="text-xl font-bold">{summary.totalTeams}</p>
                    </div>
                    <div className="p-3 rounded-none border bg-green-50 dark:bg-green-950/20 text-center">
                        <p className="text-xs text-green-600">{t("paid")}</p>
                        <p className="text-xl font-bold text-green-700">{summary.paidTeams}</p>
                    </div>
                    <div className="p-3 rounded-none border bg-yellow-50 dark:bg-yellow-950/20 text-center">
                        <p className="text-xs text-yellow-600">{t("pending")}</p>
                        <p className="text-xl font-bold text-yellow-700">{summary.pendingTeams}</p>
                    </div>
                    <div className="p-3 rounded-none border bg-muted/20 text-center">
                        <p className="text-xs text-muted-foreground">{t("received")}</p>
                        <p className="text-xl font-bold">฿{summary.totalReceived?.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Payment Table */}
            {payments.length > 0 ? (
                <div className="border rounded-none">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("team_header")}</TableHead>
                                <TableHead className="text-center">{t("amount_header")}</TableHead>
                                <TableHead className="text-center">{t("status_header")}</TableHead>
                                <TableHead>{t("notes_header")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map(payment => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {payment.team?.logo_url ? (
                                                <img src={payment.team.logo_url} alt="" className="w-5 h-5 object-contain" />
                                            ) : (
                                                <div className="w-5 h-5 bg-muted rounded-none flex items-center justify-center text-[9px] font-bold">
                                                    {payment.team?.name?.charAt(0)}
                                                </div>
                                            )}
                                            {payment.team?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                        ฿{payment.amount?.toLocaleString() || '0'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Select
                                            defaultValue={payment.status}
                                            onValueChange={(val) => handleStatusChange(payment.team_id, val as any)}
                                        >
                                            <SelectTrigger className="w-[110px] h-8 text-xs mx-auto">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> {t("status_pending")}</span>
                                                </SelectItem>
                                                <SelectItem value="paid">
                                                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {t("status_paid")}</span>
                                                </SelectItem>
                                                <SelectItem value="waived">
                                                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-gray-500" /> {t("status_waived")}</span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {payment.notes || "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                    <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                        <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t("no_payments")}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {t("no_payments_desc")}
                    </p>
                </div>
            )}
        </div>
    );
}
