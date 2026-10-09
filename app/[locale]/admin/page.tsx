import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/auth-server"
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar"
import { DashboardNavbar } from "@/features/dashboard/dashboard-navbar"
import { getAdminPayments, getAdminUsers, getAdminMasterPlayers } from "@/actions/common/admin"
import { AdminClient } from "@/features/admin/admin-client"

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
    const supabase = await createClient()
    const { locale } = await params
    const session = await getServerSession()
    const user = session?.user

    if (!user) {
        redirect(`/${locale}/sign-in`)
    }

    // Fetch user profile and verify admin role
    const { data: profile } = await supabase
        .from("users")
        .select("role, is_organizer, is_team_manager, full_name, profile_img")
        .eq("id", user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect(`/${locale}/dashboard`)
    }

    // Fetch admin details
    const [paymentsRes, usersRes, masterPlayersRes] = await Promise.all([
        getAdminPayments(),
        getAdminUsers(),
        getAdminMasterPlayers()
    ])

    if (!paymentsRes.success || !usersRes.success || !masterPlayersRes.success) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-xs font-bold text-destructive">
                Error loading admin dashboard data. Please try again.
            </div>
        )
    }

    const userRole = profile?.role || 'user'
    const isOrganizer = profile?.is_organizer || false
    const isTeamManager = profile?.is_team_manager || false
    const userAvatar = profile?.profile_img || user?.avatar_url || undefined

    return (
        <div className="min-h-screen w-full md:grid md:grid-cols-[64px_1fr]">
            <div className="border-r hidden md:block">
                <div className="flex h-full min-h-screen flex-col gap-2">
                    <DashboardSidebar
                        role={userRole}
                        isOrganizer={isOrganizer}
                        isTeamManager={isTeamManager}
                        forcedMode="organizer"
                        userEmail={user?.email}
                        userName={profile?.full_name}
                        userAvatar={userAvatar}
                    />
                </div>
            </div>
            <div className="flex flex-col min-w-0 min-h-screen">
                <DashboardNavbar
                    userEmail={user?.email || undefined}
                    userName={profile?.full_name}
                    userAvatar={userAvatar}
                    role={userRole}
                    isOrganizer={isOrganizer}
                    isTeamManager={isTeamManager}
                    forcedMode="organizer"
                    className="md:hidden"
                />
                <main className="flex-1 p-2 md:p-4 pb-17 md:pb-4">
                    <AdminClient 
                        initialPayments={paymentsRes.data || []} 
                        initialUsers={usersRes.data || []} 
                        initialMasterPlayers={masterPlayersRes.data || []}
                    />
                </main>
            </div>
        </div>
    )
}
