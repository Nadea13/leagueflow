import { redirect } from "next/navigation";
import { getTeam, getPlayers } from "@/actions/manager/team";
import { SquadManagement } from "@/components/squads/squad-management";
import { createClient } from "@/lib/supabase/server";

export default async function RegistrationTeamManagementPage({
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

    // Attempt to fetch by registration ID first (just in case the user passed registration ID)
    const { data: registration } = await supabase
        .from("registrations")
        .select("tournament_team_id")
        .eq("id", id)
        .single();

    const teamId = registration?.tournament_team_id || id;
    const team = await getTeam(teamId);

    if (!team) {
        redirect(`/${locale}/manager/my-registrations`);
    }

    // Verify ownership (or participation owner)
    const isOwner = team.user_id === user.id;
    if (!isOwner) {
        redirect(`/${locale}/manager/my-registrations`);
    }

    const playersResult = await getPlayers(teamId);
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
