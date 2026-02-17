import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { CreateTeamDialog } from "./create-team-dialog";
import { EditTeamDialog } from "./edit-team-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Folder, ChevronLeft } from "lucide-react";

interface TeamsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
    const supabase = await createClient();
    const t = await getTranslations("Team");
    const tCommon = await getTranslations("Common");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const resolvedSearchParams = await searchParams;
    const tournamentId = resolvedSearchParams.tournament_id as string | undefined;

    // 1. Fetch user's tournaments
    const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // Fetch all teams for user's tournaments to count them
    let teamCounts: Record<string, number> = {};
    const { data: allTeams } = await supabase
        .from("teams")
        .select("tournament_id")
        .in("tournament_id", tournaments && tournaments.length > 0 ? tournaments.map(t => t.id) : []);

    allTeams?.forEach(team => {
        if (team.tournament_id) {
            teamCounts[team.tournament_id] = (teamCounts[team.tournament_id] || 0) + 1;
        }
    });

    // Fetch unassigned teams (teams with no tournament).
    // Note: This relies on RLS ensuring users only see teams they created if we filter by NULL tournament_id.
    const { data: unassignedTeams } = await supabase
        .from("teams")
        .select("*, tournament:tournaments(name)")
        .is("tournament_id", null)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{tCommon("teams")}</h1>
                </div>
                <CreateTeamDialog tournaments={tournaments || []} />
            </div>

            <div className="space-y-8">
                {/* Folders Section */}
                {tournaments && tournaments.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4 tracking-tight">{t("tournaments_folder")}</h2>
                        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                            {tournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/dashboard/teams/tournament/${tournament.id}`} className="block h-full">
                                    <Card className="flex flex-col h-full hover:bg-muted/50 transition-colors cursor-pointer group">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                    <Folder className="h-8 w-8 text-primary" />
                                                </div>
                                                <Badge variant="secondary">
                                                    {teamCounts[tournament.id] || 0}
                                                </Badge>
                                            </div>
                                            <CardTitle className="mt-4 truncate text-lg tracking-tight">{tournament.name}</CardTitle>
                                            <CardDescription>{t("teams_folder_desc")}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Unassigned Teams Section */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 tracking-tight">{t("unassigned_teams")}</h2>
                    {(!unassignedTeams || unassignedTeams.length === 0) ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 p-8 text-center">
                            <p className="text-muted-foreground text-sm">{t("no_unassigned")}</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                            {unassignedTeams.map((team) => (
                                <Card key={team.id} className="flex flex-col">
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <Avatar className="h-12 w-12 border">
                                            <AvatarImage src={team.logo_url} alt={team.name} className="object-contain bg-white" />
                                            <AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1 overflow-hidden">
                                            <CardTitle className="text-lg truncate tracking-tight">{team.name}</CardTitle>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="text-[10px]">{t("unassigned_badge")}</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <EditTeamDialog team={team} tournaments={tournaments || []} />
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
