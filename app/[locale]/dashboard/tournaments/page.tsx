import { getDashboardTournaments } from "@/actions/organizer/dashboard";
import { getUserSubscriptionPlan } from "@/actions/common/user";
import { MyTournamentsClient } from "@/features/tournaments/management/my-tournaments-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tournaments",
    description: "Browse and search for active and completed football tournaments.",
};

export default async function TournamentsPage() {
    const tournaments = await getDashboardTournaments();
    const userPlan = await getUserSubscriptionPlan();

    return (
        <MyTournamentsClient
            initialTournaments={tournaments}
            userPlan={userPlan}
        />
    );
}
