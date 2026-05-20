import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateTournamentAccess } from "@/lib/security";
import { Canvas } from "@/features/tournaments/builder/canvas";

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

    // Fetch tournament name
    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select("name")
        .eq("id", id)
        .single();

    if (error || !tournament) {
        notFound();
    }

    // Fetch category canvas data
    const { data: categories } = await supabase
        .from("tournament_categories")
        .select("canvas_data")
        .eq("tournament_id", id);

    const category = categories && categories.length > 0 ? categories[0] : null;
    const canvasData = category ? category.canvas_data : null;

    return (
        <Canvas
            tournamentId={id}
            tournamentName={tournament.name}
            initialCanvasData={canvasData ?? null}
            readonly={access.role === 'viewer'}
        />
    );
}
