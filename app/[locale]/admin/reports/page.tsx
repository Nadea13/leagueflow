import { getTranslations } from "next-intl/server"
import { getBugReports } from "@/app/[locale]/actions/bug-reports"
import { BugReportList } from "./_components/bug-report-list"
import { AlertCircle } from "lucide-react"

export const metadata = {
    title: "รายงานปัญหา | LeagueFlow Admin",
}

export default async function AdminReportsPage() {
    const t = await getTranslations("Admin")
    const reportsRes = await getBugReports()

    const reports = reportsRes.success ? reportsRes.data || [] : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    {t("reports_feedback")}
                </h1>
            </div>
            <BugReportList initialReports={reports} />
        </div>
    )
}
