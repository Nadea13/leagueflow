import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateTournamentAccess } from "@/lib/security";
import { BracketCanvas } from "@/components/tournaments/bracket-builder/bracket-canvas";

export default async function BracketBuilderPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Validate access
    const access = await validateTournamentAccess(id, "viewer");
    if (!access.success) {
        notFound();
    }

    // Fetch tournament name and canvas data
    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select("name, canvas_data, format")
        .eq("id", id)
        .single();

    if (error || !tournament) {
        notFound();
    }

    // Only allow for knockout format
    if (tournament.format !== "knockout") {
        notFound();
    }

    return (
        <BracketCanvas
            tournamentId={id}
            tournamentName={tournament.name}
            initialCanvasData={tournament.canvas_data ?? null}
            readonly={access.role === 'viewer'}
        />
    );
}
