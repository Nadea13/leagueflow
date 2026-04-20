import { getDashboardTournaments } from "@/actions/organizer/dashboard";
import { getUserSubscriptionPlan, getUserDashboardMetrics, getUserProfile } from "@/actions/common/user";
import { getUserTeams } from "@/actions/manager/dashboard";
import { DashboardUI } from "@/components/dashboard/dashboard-ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manager Dashboard",
    description: "Manage your teams and view your registrations.",
};

export default async function ManagerDashboardPage() {
    // Parallel data fetching
    const [allTournaments, userPlan, teams, metrics, profile] = await Promise.all([
        getDashboardTournaments(),
        getUserSubscriptionPlan(),
        getUserTeams(),
        getUserDashboardMetrics(),
        getUserProfile()
    ]);

    return (
        <DashboardUI 
            tournaments={allTournaments} 
            teams={teams} 
            userPlan={userPlan} 
            metrics={metrics}
            isOrganizer={profile?.is_organizer || false}
            forcedMode="team"
        />
    );
}
