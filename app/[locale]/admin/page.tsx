import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-server"
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar"
import { DashboardNavbar } from "@/features/dashboard/dashboard-navbar"
import { getAdminPayments, getAdminUsers, getAdminMasterPlayers, getAdminTournamentStatusRequests } from "@/actions/common/admin"
import { AdminClient } from "@/features/admin/admin-client"

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const session = await getServerSession()
    const user = session?.user

    if (!user) {
        redirect(`/${locale}/sign-in`)
    }

    // Verify admin role directly from session
    if (user.role !== 'admin' && user.role !== 'super_admin') {
        redirect(`/${locale}/dashboard`)
    }

    // Fetch admin details
    const [paymentsRes, usersRes, masterPlayersRes, statusRequestsRes] = await Promise.all([
        getAdminPayments(),
        getAdminUsers(),
        getAdminMasterPlayers(),
        getAdminTournamentStatusRequests()
    ])

    if (!paymentsRes.success || !usersRes.success || !masterPlayersRes.success) {
        return (
            <div className="flex h-screen w-full items-center justify-center text-xs font-bold text-destructive">
                Error loading admin dashboard data. Please try again.
            </div>
        )
    }

    const userRole = user.role || 'user'
    const isOrganizer = true
    const isTeamManager = true
    const userAvatar = user.avatar_url || undefined
    const userName = user.full_name || (user.email ? user.email.split('@')[0] : "")

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
                        userName={userName}
                        userAvatar={userAvatar}
                    />
                </div>
            </div>
            <div className="flex flex-col min-w-0 min-h-screen">
                <DashboardNavbar
                    userEmail={user?.email || undefined}
                    userName={userName}
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
                        initialStatusRequests={statusRequestsRes.data || []}
                    />
                </main>
            </div>
        </div>
    )
}
