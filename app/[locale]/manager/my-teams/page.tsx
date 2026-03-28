import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Users, Info } from "lucide-react";
import { CreateTeamDialog } from "@/app/[locale]/organizer/teams/create-team-dialog";

export default async function MyTeamsPage() {
    const supabase = await createClient();
    const t = await getTranslations("Team");
    const tCommon = await getTranslations("Common");
    const tNav = await getTranslations("Nav");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch teams owned by the user
    const { data: teams } = await supabase
        .from("teams")
        .select(`
            *,
            participations:tournament_teams(
                tournament:tournaments(name)
            )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-6">
                <div>
                    <h1 className="text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">
                        {tNav("my_teams")}
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 flex items-center gap-2">
                        <span className="w-2 h-[1px] bg-secondary/40" />
                        {t("my_teams_desc") || "Manage teams you own and track their tournament participations."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTeamDialog />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(!teams || teams.length === 0) ? (
                    <div className="col-span-full border border-dashed border-border bg-muted/5 flex flex-col items-center justify-center py-24 text-center group relative overflow-hidden transition-all hover:bg-secondary/5 hover:border-secondary/30">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-secondary/0 group-hover:bg-secondary/40 transition-all" />
                        <div className="h-20 w-20 rounded-none bg-background flex items-center justify-center border border-border group-hover:border-secondary group-hover:shadow-[0_0_20px_rgba(0,196,154,0.2)] transition-all rotate-12 group-hover:rotate-0 mb-6">
                            <Users className="h-10 w-10 text-muted-foreground group-hover:text-secondary transition-colors" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground mb-2">{t("no_teams_yet")}</h3>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 max-w-xs">{t("no_teams_desc") || "Create your first team to start participating in tournaments."}</p>
                    </div>
                ) : (
                    teams.map((team) => (
                        <Card key={team.id} className="flex flex-col bg-card border border-border transition-all hover:border-secondary/50 group overflow-hidden relative shadow-lg">
                            <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                            <CardHeader className="pb-4 pt-6 relative z-10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <Avatar className="h-14 w-14 rounded-none border border-border group-hover:border-secondary/30 transition-all shrink-0 p-1 bg-muted/30">
                                            <AvatarImage src={team.logo_url} alt={team.name} className="object-contain" />
                                            <AvatarFallback className="rounded-none bg-secondary/5 text-secondary font-black italic">{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-1">
                                            <CardTitle className="text-lg font-black leading-none tracking-tight uppercase italic group-hover:text-secondary transition-colors truncate">
                                                {team.name}
                                            </CardTitle>
                                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                                {team.participations && team.participations.length > 0 ? (
                                                    team.participations.slice(0, 2).map((p: any, i: number) => (
                                                        <Badge key={i} variant="outline" className="w-fit text-[9px] px-2 py-0.5 border border-secondary/20 bg-secondary/5 text-secondary font-black uppercase italic rounded-none shrink-0">
                                                            {p.tournament.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Badge variant="secondary" className="w-fit text-[9px] px-2 py-0.5 border-none font-black uppercase italic rounded-none shrink-0 opacity-70">
                                                        {t("unassigned_badge")}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 pb-6 pt-2 text-sm relative z-10">
                                <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 italic leading-relaxed">
                                    {team.description || t("no_description")}
                                </p>
                            </CardContent>
                            <CardFooter className="p-0 border-t border-border mt-2 bg-muted/5 group-hover:bg-muted/10 transition-all">
                                <Button className="w-full rounded-none h-12 font-black uppercase italic tracking-wider text-xs hover:bg-secondary hover:text-secondary-foreground transition-all" asChild variant="ghost">
                                    <Link href={`/manager/my-teams/${team.id}`}>
                                        {tCommon("view_details")}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
