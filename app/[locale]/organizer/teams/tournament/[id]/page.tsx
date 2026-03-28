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
        .from("tournament_teams")
        .select(`
            *,
            tournament:tournaments(name),
            team:teams(user_id, description, name, logo_url)
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-6 relative">
                <div className="flex items-center gap-6">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-none border-2 border-secondary/20 hover:border-secondary hover:bg-secondary/5 transition-all group" asChild>
                        <Link href="/organizer/teams">
                            <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none flex items-center gap-4">
                            <Trophy className="h-10 w-10 text-secondary" />
                            {currentTournament.name}
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 flex items-center gap-2">
                            <span className="w-2 h-[1px] bg-secondary/40" />
                            {teams?.length || 0} teams registered for this tournament
                        </p>
                    </div>
                </div>
                <CreateTeamDialog />
            </div>

            <div className="mt-8">
                {(!teams || teams.length === 0) ? (
                    <div className="col-span-full border border-dashed border-border bg-muted/5 flex flex-col items-center justify-center py-24 text-center group relative overflow-hidden transition-all hover:bg-secondary/5 hover:border-secondary/30">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary/0 group-hover:bg-secondary/40 transition-all" />
                        <div className="h-20 w-20 rounded-none bg-background flex items-center justify-center border border-border group-hover:border-secondary transition-all rotate-12 group-hover:rotate-0 mb-6">
                            <Users className="h-10 w-10 text-muted-foreground group-hover:text-secondary transition-colors" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground mb-2">{t("no_teams")}</h3>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 max-w-xs">{t("no_teams_desc")}</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {teams.map((tItem: any) => {
                            const teamData = tItem.team || tItem; // Fallback if data is denormalized
                            return (
                                <Card key={tItem.id} className="flex flex-col bg-card border border-border transition-all hover:border-secondary/50 group overflow-hidden relative shadow-lg">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                                    <CardHeader className="pb-4 pt-6 relative z-10">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <Avatar className="h-14 w-14 rounded-none border border-border group-hover:border-secondary/30 transition-all shrink-0 p-1 bg-muted/30">
                                                <AvatarImage src={teamData.logo_url} alt={teamData.name} className="object-contain" />
                                                <AvatarFallback className="rounded-none bg-secondary/5 text-secondary font-black italic">{teamData.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-1">
                                                <CardTitle className="text-lg font-black leading-none tracking-tight uppercase italic group-hover:text-secondary transition-colors truncate">
                                                    {teamData.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-1.5">
                                                    {tItem.group_name && (
                                                        <Badge variant="outline" className="w-fit text-[9px] px-2 py-0.5 border border-secondary/20 bg-secondary/5 text-secondary font-black uppercase italic rounded-none shrink-0">
                                                            {t("group")} {tItem.group_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 pb-6 pt-2 text-sm relative z-10">
                                        <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 italic leading-relaxed">
                                            {teamData.description || t("no_description")}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="p-0 border-t border-border mt-2 bg-muted/5 group-hover:bg-muted/10 transition-all">
                                        {teamData.user_id === user.id ? (
                                            <EditTeamDialog team={teamData} />
                                        ) : (
                                            <Button variant="ghost" className="w-full rounded-none h-12 font-black uppercase italic tracking-wider text-[10px] opacity-40 cursor-not-allowed" disabled>
                                                {tCommon("view_only") || "View Only (Registered)"}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
