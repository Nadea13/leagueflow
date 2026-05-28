import { redirect } from "next/navigation";
import { getTeam, getPlayers } from "@/actions/manager/team";
import { SquadManagement } from "@/features/teams/squad-management";
import { createClient } from "@/lib/supabase/server";

export default async function TournamentTeamDetailPage({
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
        redirect(`/${locale}/dashboard/teams`);
    }

    // Verify ownership
    let isOwner = team.user_id === user.id;

    if (!isOwner && team.isParticipation && team.team_id) {
        // Fallback: Check if user owns the global team
        const { data: globalTeam } = await supabase
            .from("teams")
            .select("user_id")
            .eq("id", team.team_id)
            .single();
        if (globalTeam && globalTeam.user_id === user.id) {
            isOwner = true;
        }
    }

    if (!isOwner && team.tournament_id) {
        // Check if user is manager of the tournament this team belongs to (for cross-role support)
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("organizer_id")
            .eq("id", team.tournament_id)
            .single();

        if (tournament && tournament.organizer_id === user.id) {
            isOwner = true;
        }
    }

    if (!isOwner) {
        redirect(`/${locale}/dashboard/teams`);
    }

    const playersResult = await getPlayers(id);
    const initialPlayers = playersResult.success ? (playersResult.data || []) : [];

    return (
        <div className="w-full">
            <SquadManagement
                team={team}
                initialPlayers={initialPlayers}
            />
        </div>
    );
}
