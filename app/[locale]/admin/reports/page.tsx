import { getTranslations } from "next-intl/server"
import { getBugReports } from "@/actions/common/bug-reports"
import { BugReportList } from "./_components/bug-report-list"

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
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
                        {t("reports_feedback")}
                    </h1>
                    <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Bug Reports & Feedback
                    </p>
                </div>
            </div>
            <BugReportList initialReports={reports} />
        </div>
    )
}
