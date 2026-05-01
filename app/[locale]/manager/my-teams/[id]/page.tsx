import { redirect } from "next/navigation";
import { getTeam, getPlayers } from "@/actions/manager/team";
import { SquadManagement } from "@/components/squads/squad-management";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerTeamManagementPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}) {
    const { id, locale } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login`);
    }

    const team = await getTeam(id);

    if (!team) {
        redirect(`/${locale}/manager/my-teams`);
    }

    // Verify ownership
    let isOwner = team.user_id === user.id;

    if (!isOwner && team.tournament_id) {
        // Check if user is manager of the tournament this team belongs to (for cross-role support)
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("user_id")
            .eq("id", team.tournament_id)
            .single();

        if (tournament && tournament.user_id === user.id) {
            isOwner = true;
        }
    }

    if (!isOwner) {
        redirect(`/${locale}/manager/my-teams`);
    }

    const playersResult = await getPlayers(id);
    const initialPlayers = playersResult.success ? (playersResult.data || []) : [];



    return (
        <div className="w-full max-w-[1600px] mx-auto">
            <SquadManagement
                team={team}
                initialPlayers={initialPlayers}
            />
        </div>
    );
}
