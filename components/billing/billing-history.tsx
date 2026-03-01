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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentRecord } from "@/app/[locale]/dashboard/billing/actions";
import { formatDate } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import { List } from "lucide-react";

interface BillingHistoryProps {
    history?: PaymentRecord[];
}

export function BillingHistory({ history = [] }: BillingHistoryProps) {
    const t = useTranslations("Billing");
    const tPricing = useTranslations("Pricing");
    const locale = useLocale();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("historyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">{t("invoice_id")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead>{t("method")}</TableHead>
                            <TableHead>{t("plan")}</TableHead>
                            <TableHead>{t("date")}</TableHead>
                            <TableHead>{t("expires_at")}</TableHead>
                            <TableHead className="text-right">{t("amount_col")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history && history.length > 0 ? (
                            history.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium font-mono text-xs">{record.id.slice(0, 8)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            record.status === 'success' ? "bg-green-50 text-green-700 border-green-200" :
                                                record.status === 'pending' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                    "bg-red-50 text-red-700 border-red-200"
                                        }>
                                            {t(`status_${record.status}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        {record.payment_method === 'promptpay' ? t('method_promptpay') :
                                            record.payment_method === 'credit_card' ? t('method_credit_card') : record.payment_method}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        {record.plan === 'yearly' ? tPricing('yearly.title') :
                                            record.plan === 'monthly' ? tPricing('monthly.title') :
                                                record.plan === 'tournament' ? tPricing('tournament.title') :
                                                    record.plan === 'starter' ? tPricing('free.title') :
                                                        record.plan || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(record.created_at, "d MMM yyyy", locale)}
                                    </TableCell>
                                    <TableCell>
                                        {record.subscription_expires_at ? (
                                            <span className="text-muted-foreground text-sm">
                                                {formatDate(record.subscription_expires_at, "d MMM yyyy", locale)}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(record.amount)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                                            <List className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">{t("no_history")}</h3>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
