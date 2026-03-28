import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { EditTeamDialog } from "./edit-team-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Folder, ChevronLeft, AlertCircle } from "lucide-react";

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
        .from("tournament_teams")
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
        .select(`
            *,
            tournament:tournaments(name)
        `)
        .is("tournament_id", null)
        .order("created_at", { ascending: false });

    // for assigned teams, we need to show them differently or fetch their status.
    // The current page uses a "Folder" view for tournaments.
    // Let's refine the "Tournament Folder" link or add a "My Registrations" overview.

    // 2. Fetch User's registrations to show status
    const { data: myRegistrations } = await supabase
        .from("registrations")
        .select(`
            *,
            tournament:tournaments(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-6 relative">
                <div>
                    <h1 className="text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">
                        {tCommon("teams")}
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 flex items-center gap-2">
                        <span className="w-2 h-[1px] bg-secondary/40" />
                        {t("my_teams_desc") || "Manage your teams and tournament participations."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTeamDialog />
                </div>
            </div>

            <div className="space-y-12">
                {/* Registrations Section (Synergy) */}
                {myRegistrations && myRegistrations.length > 0 && (
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-primary mb-6">
                            <AlertCircle className="h-5 w-5" />
                            {t("my_registrations") || "My Registrations"}
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {myRegistrations.map((reg) => (
                                <Card key={reg.id} className="flex flex-col bg-card border border-border transition-all hover:border-primary/50 group overflow-hidden relative shadow-lg">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                                    <CardHeader className="pb-3 pt-6 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg font-black uppercase italic tracking-tight">{reg.team_name}</CardTitle>
                                            <Badge 
                                                variant={reg.payment_status === 'PAID' ? "default" : "outline"}
                                                className={`rounded-none font-black uppercase italic text-[10px] ${reg.payment_status === 'PAID' ? "bg-green-600 hover:bg-green-700" : "border-primary/20 text-primary"}`}
                                            >
                                                {reg.payment_status}
                                            </Badge>
                                        </div>
                                        <CardDescription className="flex items-center gap-1 font-bold uppercase text-[10px] opacity-70">
                                            <Trophy className="h-3 w-3" />
                                            {(reg.tournament as any)?.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 pb-4 relative z-10">
                                        <span className="text-[10px] uppercase font-black italic text-muted-foreground/40">
                                            Applied on {new Date(reg.created_at).toLocaleDateString()}
                                        </span>
                                    </CardContent>
                                    <CardFooter className="p-0 border-t border-border bg-muted/5 group-hover:bg-muted/10 transition-all">
                                        <Button variant="ghost" className="w-full rounded-none h-12 font-black uppercase italic tracking-wider text-xs hover:bg-primary hover:text-primary-foreground transition-all" asChild>
                                            <Link href={`/organizer/teams`}>
                                                Track Status
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
                {/* Folders Section */}
                {tournaments && tournaments.length > 0 && (
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-6">{t("tournaments_folder")}</h2>
                        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {tournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/organizer/teams/tournament/${tournament.id}`} className="block h-full group">
                                    <Card className="flex flex-col h-full bg-card border border-border transition-all hover:border-primary/50 overflow-hidden relative shadow-lg">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                                        <CardHeader className="relative z-10 pb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="p-3 bg-primary/10 rounded-none group-hover:bg-primary/20 transition-colors">
                                                    <Folder className="h-6 w-6 text-primary" />
                                                </div>
                                                <Badge variant="secondary" className="font-black italic text-[10px] px-2 py-0.5 rounded-none">
                                                    {teamCounts[tournament.id] || 0} teams
                                                </Badge>
                                            </div>
                                            <CardTitle className="mt-4 truncate text-lg font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">{tournament.name}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold uppercase opacity-60 line-clamp-1">{t("teams_folder_desc")}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Unassigned Teams Section */}
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter mb-6">{t("unassigned_teams")}</h2>
                    {(!unassignedTeams || unassignedTeams.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border bg-muted/5 group relative overflow-hidden transition-all hover:bg-secondary/5 hover:border-secondary/30">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary/0 group-hover:bg-secondary/40 transition-all" />
                            <div className="h-20 w-20 rounded-none bg-background flex items-center justify-center border border-border group-hover:border-secondary transition-all rotate-12 group-hover:rotate-0 mb-6">
                                <Users className="h-10 w-10 text-muted-foreground group-hover:text-secondary transition-colors" />
                            </div>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground mb-2">{t("no_unassigned")}</h3>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 max-w-xs">{t("create_first_unassigned") || "No unassigned teams found. Create a team and then assign it to your tournament."}</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {unassignedTeams.map((team) => (
                                <Card key={team.id} className="flex flex-col bg-card border border-border transition-all hover:border-secondary/50 group overflow-hidden relative shadow-lg">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                                    <CardHeader className="pb-4 pt-6 relative z-10">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <Avatar className="h-14 w-14 rounded-none border border-border group-hover:border-secondary/30 transition-all shrink-0 p-1 bg-muted/30">
                                                <AvatarImage src={team.logo_url} alt={team.name} className="object-contain" />
                                                <AvatarFallback className="rounded-none bg-secondary/5 text-secondary font-black italic">{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-1">
                                                <CardTitle className="text-lg font-black leading-none tracking-tight uppercase italic group-hover:text-secondary transition-colors truncate">
                                                    {team.name}
                                                </CardTitle>
                                                <Badge variant="secondary" className="w-fit text-[9px] px-2 py-0.5 border-none font-black uppercase italic rounded-none shrink-0 opacity-70">
                                                    {t("unassigned_badge")}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 pb-6 pt-2 text-sm relative z-10">
                                        <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 italic leading-relaxed">
                                            {team.description || t("no_description")}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="p-0 border-t border-border mt-2 bg-muted/5 group-hover:bg-muted/10 transition-all">
                                        {team.user_id === user.id ? (
                                            <EditTeamDialog team={team} />
                                        ) : (
                                            <Button variant="ghost" className="w-full rounded-none h-12 font-black uppercase italic tracking-wider text-[10px] opacity-40 cursor-not-allowed" disabled>
                                                {tCommon("view_only") || "View Only (Registered)"}
                                            </Button>
                                        )}
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
