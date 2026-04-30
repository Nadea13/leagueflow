"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { markBugReportAsRead, resolveBugReport, type BugReport } from "@/actions/common/bug-reports"
import { toast } from "sonner"
import { Search, AlertCircle, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

export function BugReportList({ initialReports }: { initialReports: BugReport[] }) {
    const t = useTranslations("Admin")
    const [reports, setReports] = useState(initialReports)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [page, setPage] = useState(1);
    const itemsPerPage = 100;

    const filteredReports = reports.filter(r =>
        (r.message?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (r.user_email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const paginatedReports = filteredReports.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;

    const handleMarkAsRead = async (id: string) => {
        const res = await markBugReportAsRead(id)
        if (res.success) {
            setReports(prev =>
                prev.map(r => r.id === id ? { ...r, status: 'read' } : r)
            )
            toast.success(t("report_marked_read_success"))
        } else {
            toast.error(t("update_status_failed"))
        }
    }

    const handleViewReport = async (report: BugReport) => {
        setSelectedReport(report)
        setDialogOpen(true)

        if (report.status === 'unread') {
            const res = await markBugReportAsRead(report.id)
            if (res.success) {
                setReports(prev =>
                    prev.map(r => r.id === report.id ? { ...r, status: 'read' } : r)
                )
            } else {
                toast.error(t("update_status_failed"))
            }
        }
    }

    const handleResolve = async (id: string) => {
        const res = await resolveBugReport(id)
        if (res.success) {
            setReports(prev =>
                prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r)
            )
            setDialogOpen(false)
            toast.success(t("report_resolved_success"))
        } else {
            toast.error(t("update_status_failed"))
        }
    }

    const getStatusBadge = (status: string) => {
        if (status === 'unread') {
            return <Badge variant="destructive" className="rounded-none text-[10px] font-black">{t("report_status_new")}</Badge>
        }
        if (status === 'read') {
            return <Badge variant="secondary" className="rounded-none text-[10px] font-black">{t("report_status_read")}</Badge>
        }
        return <Badge variant="outline" className="rounded-none text-[10px] font-black">{t("report_status_resolved")}</Badge>
    }

    return (
        <div className="space-y-4">
            <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t("search_reports")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            <div className="rounded-none border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[100px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("status")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("report_date")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("reporter")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("report_message")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {t("no_reports")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedReports.map((report) => (
                                <TableRow
                                    key={report.id}
                                    className={`cursor-pointer transition-colors hover:bg-muted/10 border-b border-border/50 ${report.status === 'unread' ? 'bg-destructive/5' : ''}`}
                                    onClick={() => handleViewReport(report)}
                                >
                                    <TableCell>
                                        {getStatusBadge(report.status)}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(new Date(report.created_at), "dd MMM yyyy HH:mm", { locale: th })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 bg-secondary/10 flex items-center justify-center border border-secondary/20 shrink-0">
                                                <User className="h-3 w-3 text-secondary" />
                                            </div>
                                            <span className="text-sm truncate max-w-[150px]">
                                                {report.user_email || t("anonymous")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <span className="text-sm truncate block">{report.message}</span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {filteredReports.length > 0 && (
                <div className="flex items-center justify-between py-2">
                    <div className="text-[10px] tracking-wider font-bold text-muted-foreground hidden sm:block">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredReports.length)} of {filteredReports.length} entries
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[525px] rounded-none border-border p-0 overflow-hidden">
                    <div className="bg-secondary/10 px-6 py-5 border-b border-border relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-secondary" />
                                {t("report_details")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm font-medium pt-1">
                                {t("reported_at")}: {selectedReport ? format(new Date(selectedReport.created_at), "dd MMMM yyyy HH:mm", { locale: th }) : ''}
                                <br />
                                {t("reporter")}: {selectedReport?.user_email || t("anonymous")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-6 py-6">
                        <div className="p-4 bg-muted/30 border border-border whitespace-pre-wrap leading-relaxed text-sm">
                            {selectedReport?.message}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                className="rounded-none text-[10px] font-black"
                            >
                                {t("close")}
                            </Button>
                            {selectedReport && selectedReport.status === 'unread' && (
                                <Button
                                    variant="secondary"
                                    onClick={() => handleMarkAsRead(selectedReport.id)}
                                    className="rounded-none text-[10px] font-black"
                                >
                                    {t("mark_as_read")}
                                </Button>
                            )}
                            {selectedReport && selectedReport.status !== 'resolved' && (
                                <Button
                                    onClick={() => handleResolve(selectedReport.id)}
                                    className="rounded-none text-[10px] font-black"
                                >
                                    {t("mark_as_resolved")}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
