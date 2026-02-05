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
import { format } from "date-fns";

interface BillingHistoryProps {
    history?: PaymentRecord[];
}

export function BillingHistory({ history = [] }: BillingHistoryProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Invoice ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Expires At</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
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
                                            {record.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{record.payment_method}</TableCell>
                                    <TableCell className="capitalize">{record.plan || "-"}</TableCell>
                                    <TableCell>{format(new Date(record.created_at), 'PPP')}</TableCell>
                                    <TableCell>
                                        {record.subscription_expires_at ? (
                                            <span className="text-muted-foreground text-sm">
                                                {format(new Date(record.subscription_expires_at), 'PPP')}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">฿{record.amount}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                                    No payment history found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
