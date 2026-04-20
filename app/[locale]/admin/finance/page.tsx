import { getTranslations } from "next-intl/server";
import { getAllPayments } from "@/actions/admin/finance";
import { AdminPaymentsTable } from "@/components/admin/payments-table";

export default async function AdminFinancePage() {
    const payments = await getAllPayments();
    const t = await getTranslations("Admin");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-foreground">
                        {t("payments_management")}
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground mt-1">
                        Financial Administration
                    </p>
                </div>
            </div>
            <AdminPaymentsTable initialPayments={payments || []} />
        </div>
    );
}
