import { getDashboardTournaments } from "@/actions/organizer/dashboard";
import { getUserSubscriptionPlan, getUserDashboardMetrics, getUserProfile } from "@/actions/common/user";
import { getUserTeams } from "@/actions/manager/dashboard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Organizer Dashboard",
    description: "Manage your tournaments, view stats, and track your leagues.",
};

export default async function OrganizerDashboardPage() {
    // Parallel data fetching
    const [allTournaments, userPlan, teams, metrics, profile] = await Promise.all([
        getDashboardTournaments(),
        getUserSubscriptionPlan(),
        getUserTeams(),
        getUserDashboardMetrics(),
        getUserProfile()
    ]);

    return (
        <DashboardShell 
            tournaments={allTournaments} 
            teams={teams} 
            userPlan={userPlan} 
            metrics={metrics}
            isOrganizer={profile?.is_organizer || false}
            forcedMode="organizer"
        />
    );
}
