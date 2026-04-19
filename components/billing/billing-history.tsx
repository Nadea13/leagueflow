"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentRecord } from "@/app/[locale]/dashboard/billing/actions";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { History, Receipt } from "lucide-react";

interface BillingHistoryProps {
    history?: PaymentRecord[];
}

export function BillingHistory({ history = [] }: BillingHistoryProps) {
    const t = useTranslations("Billing");
    const locale = useLocale();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <Receipt className="h-5 w-5 text-secondary" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                    {t("historyTitle")}
                </h3>
            </div>

            {history && history.length > 0 ? (
                <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors">
                    {/* Accent Line */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />

                    <Table>
                        <TableHeader className="bg-muted/0">
                            <TableRow className="hover:bg-transparent border-border/40">
                                <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest py-4 pl-4">{t("invoice_id")}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">{t("status")}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">{t("method")}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">{t("plan")}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">{t("date")}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">{t("expires_at")}</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4 pr-4">{t("amount_col")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((record) => (
                                <TableRow key={record.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                                    <TableCell className="font-mono text-[10px] font-bold py-4 pl-4 text-muted-foreground">
                                        #{record.id.slice(0, 8).toUpperCase()}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="outline" className={`rounded-none font-black uppercase tracking-tighter text-[9px] py-0 px-2 h-5 italic border-none ${
                                            record.status === 'success' ? "bg-green-500/10 text-green-500" :
                                                record.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                                                    "bg-red-500/10 text-red-500"
                                        }`}>
                                            {t(`status_${record.status}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 font-black uppercase italic text-[10px] tracking-tight">
                                        {record.payment_method === 'promptpay' ? t('method_promptpay') :
                                            record.payment_method === 'credit_card' ? t('method_credit_card') : record.payment_method}
                                    </TableCell>
                                    <TableCell className="py-4 font-black uppercase italic text-[10px] tracking-tight text-secondary">
                                        {record.plan === 'yearly' ? t('yearly.title') :
                                            record.plan === 'monthly' ? t('monthly.title') :
                                                record.plan === 'tournament' ? t('tournament.title') :
                                                    record.plan === 'starter' ? t('free.title') :
                                                        record.plan || "-"}
                                    </TableCell>
                                    <TableCell className="py-4 font-bold text-[11px] uppercase tracking-tight">
                                        {formatDate(record.created_at, "d MMM yyyy", locale)}
                                    </TableCell>
                                    <TableCell className="py-4 font-bold text-[11px] uppercase tracking-tight text-muted-foreground/60">
                                        {record.subscription_expires_at ? (
                                            formatDate(record.subscription_expires_at, "d MMM yyyy", locale)
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right py-4 pr-4 font-black italic text-sm">
                                        {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(record.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-none border border-border bg-muted/5 p-8 text-center animate-in fade-in-50 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />

                    <div className="p-6 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                        <History className="h-10 w-10 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
                    </div>

                    <h3 className="text-xl font-black uppercase italic tracking-tight mb-2 relative z-10">
                        {t("no_history")}
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 max-w-[200px] flex items-center gap-2 relative z-10 mx-auto">
                        <span className="w-4 h-[1px] bg-muted-foreground/30" />
                        {t("no_payment_records", { defaultValue: "No payment records found" })}
                        <span className="w-4 h-[1px] bg-muted-foreground/30" />
                    </p>
                </div>
            )}
        </div>
    );
}
