import { getTranslations } from "next-intl/server";
import { getAllPayments } from "./actions";
import { AdminPaymentsTable } from "@/components/admin/payments-table";

export default async function AdminFinancePage() {
    const payments = await getAllPayments();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t("payments_management")}</h1>
            </div>
            <AdminPaymentsTable initialPayments={payments || []} />
        </div>
    );
}
