import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { CreateTeamDialog } from "../../create-team-dialog";
import { EditTeamDialog } from "../../edit-team-dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Users, Trophy, ChevronLeft } from "lucide-react";

interface TournamentTeamsPageProps {
    params: Promise<{ id: string }>;
}

export default async function TournamentTeamsPage({ params }: TournamentTeamsPageProps) {
    const supabase = await createClient();
    const t = await getTranslations("Team");
    const tCommon = await getTranslations("Common");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const resolvedParams = await params;
    const tournamentId = resolvedParams.id;

    // 1. Fetch user's tournaments (Need this for the Dialog)
    const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // Validation: Verify this tournament belongs to user
    const currentTournament = tournaments?.find(t => t.id === tournamentId);

    if (!currentTournament) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/teams">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Tournament Not Found</h1>
                </div>
            </div>
        );
    }

    const { data: teams } = await supabase
        .from("teams")
        .select(`
            *,
            tournament:tournaments(name)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/teams">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Trophy className="h-8 w-8 text-primary" />
                            {currentTournament.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">{teams?.length || 0} teams</p>
                    </div>
                </div>
                {/* Pass selected tournament as default to Dialog */}
                <CreateTeamDialog tournaments={tournaments || []} defaultTournamentId={tournamentId} />
            </div>

            {(!teams || teams.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                    <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t("no_teams")}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {t("no_teams_desc")}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                    {teams.map((team) => (
                        <Card key={team.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <Avatar className="h-12 w-12 border">
                                    <AvatarImage src={team.logo_url} alt={team.name} className="object-contain bg-white" />
                                    <AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 overflow-hidden">
                                    <CardTitle className="text-lg truncate">{team.name}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex items-center gap-2 mt-2">
                                    {team.group_name && (
                                        <Badge variant="outline">{t("group")} {team.group_name}</Badge>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4">
                                <EditTeamDialog team={team} tournaments={tournaments || []} />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
