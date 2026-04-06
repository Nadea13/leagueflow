import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function OrganizerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const supabase = await createClient();
    const { locale } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login`)
    }

    // Fetch User Profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_organizer")
        .eq("id", user.id)
        .single();

    if (!profile?.is_organizer) {
        redirect(`/${locale}/dashboard`)
    }

    const userRole = profile?.role || 'user';
    const isOrganizer = profile?.is_organizer || false;

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="border-r bg-muted/40 hidden md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <Sidebar role={userRole} isOrganizer={isOrganizer} forcedMode="organizer" />
                </div>
            </div>
            <div className="flex flex-col">
                <DashboardHeader userEmail={user?.email || undefined} role={userRole} isOrganizer={isOrganizer} forcedMode="organizer" />
                <main className="flex flex-1 flex-col gap-4 p-2 md:p-4 lg:gap-6 lg:p-6 pb-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
