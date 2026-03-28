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
import { markBugReportAsRead, resolveBugReport } from "@/app/[locale]/actions/bug-reports"
import { toast } from "sonner"
import { Search } from "lucide-react"
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

export function BugReportList({ initialReports }: { initialReports: any[] }) {
    const t = useTranslations("Admin")
    const [reports, setReports] = useState(initialReports)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedReport, setSelectedReport] = useState<any | null>(null)
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

    const handleViewReport = async (report: any) => {
        setSelectedReport(report)
        setDialogOpen(true)

        if (report.status === 'unread') {
            const res = await markBugReportAsRead(report.id)
            if (res.success) {
                // Update local state to reflect 'read' status
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

            <div className="rounded-none border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">{t("status")}</TableHead>
                            <TableHead>{t("report_date")}</TableHead>
                            <TableHead>{t("reporter")}</TableHead>
                            <TableHead>{t("report_message")}</TableHead>
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
                                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${report.status === 'unread' ? 'bg-muted/20 font-medium' : ''}`}
                                    onClick={() => handleViewReport(report)}
                                >
                                    <TableCell>
                                        {report.status === 'unread' ? (
                                            <Badge variant="destructive">{t("report_status_new")}</Badge>
                                        ) : report.status === 'read' ? (
                                            <Badge variant="secondary">{t("report_status_read")}</Badge>
                                        ) : (
                                            <Badge variant="outline">{t("report_status_resolved")}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{format(new Date(report.created_at), "dd MMM yyyy HH:mm", { locale: th })}</TableCell>
                                    <TableCell>{report.user_email || t("anonymous")}</TableCell>
                                    <TableCell className="max-w-md truncate">
                                        {report.message}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {filteredReports.length > 0 && (
                <div className="flex items-center justify-between py-2 border-t px-4 mt-2">
                    <div className="text-sm text-muted-foreground hidden sm:block">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredReports.length)} of {filteredReports.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>{t("report_details")}</DialogTitle>
                        <DialogDescription>
                            {t("reported_at")}: {selectedReport ? format(new Date(selectedReport.created_at), "dd MMMM yyyy HH:mm", { locale: th }) : ''}
                            <br />
                            {t("reporter")}: {selectedReport?.user_email || t("anonymous")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 p-4 bg-muted rounded-md whitespace-pre-wrap leading-relaxed text-sm">
                        {selectedReport?.message}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            {t("close")}
                        </Button>
                        {selectedReport && selectedReport.status === 'unread' && (
                            <Button variant="secondary" onClick={() => handleMarkAsRead(selectedReport.id)}>
                                {t("mark_as_read")}
                            </Button>
                        )}
                        {selectedReport && selectedReport.status !== 'resolved' && (
                            <Button onClick={() => handleResolve(selectedReport.id)}>
                                {t("mark_as_resolved")}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
