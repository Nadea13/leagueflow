import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminDashboardHeader } from "@/components/admin/admin-dashboard-header";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if user has admin role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        redirect("/dashboard");
    }

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="border-r bg-muted/40 hidden md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <AdminSidebar />
                </div>
            </div>
            <div className="flex flex-col">
                <AdminDashboardHeader userEmail={user?.email || undefined} />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
