import { getAllPublicTournaments, getMasterPlayer } from "@/actions/common/user";
import { DashboardClient } from "../../../features/dashboard/dashboard-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "LeagueFlow Dashboard",
    description: "View tournaments and manage your master player profile.",
};

export default async function DashboardPage() {
    const [tournaments, masterPlayer] = await Promise.all([
        getAllPublicTournaments(),
        getMasterPlayer()
    ]);

    return (
        <DashboardClient
            initialTournaments={tournaments}
            initialMasterPlayer={masterPlayer}
        />
    );
}
