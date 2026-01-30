import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BottomNav } from "@/components/dashboard/bottom-nav";

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const supabase = await createClient();
    const { locale } = await params;
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user) {
        // redirect(`/${locale}/login`);
    }

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="border-r bg-muted/40 hidden md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <Sidebar />
                </div>
            </div>
            <div className="flex flex-col">
                <DashboardHeader userEmail={user?.email} />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20 md:pb-6">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    );
}