import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";

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
        .select("role, is_organizer, full_name")
        .eq("id", user.id)
        .single();

    if (!profile?.is_organizer) {
        redirect(`/${locale}/dashboard`)
    }

    const userRole = profile?.role || 'user';
    const isOrganizer = profile?.is_organizer || false;

    return (
        <div className="grid h-screen w-full md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] overflow-hidden">
            <div className="border-r bg-muted/40 hidden md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <DashboardSidebar 
                        role={userRole} 
                        isOrganizer={isOrganizer} 
                        forcedMode="organizer" 
                        userEmail={user?.email}
                        userName={profile?.full_name}
                    />
                </div>
            </div>
            <div className="flex flex-col h-full overflow-hidden">
                <DashboardNavbar 
                    userEmail={user?.email || undefined} 
                    userName={profile?.full_name}
                    role={userRole} 
                    isOrganizer={isOrganizer} 
                    forcedMode="organizer" 
                    className="md:hidden"
                />
                <main className="flex-1 h-full overflow-hidden p-2 md:p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}
