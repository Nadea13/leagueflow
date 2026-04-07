import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Users, Info } from "lucide-react";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";

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
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-start justify-between border-b-4 border-secondary/20 pb-4 md:pb-6 relative">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-[calc(-0.05em)] uppercase italic leading-none">
                        {t("dashboard")}
                    </h1>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                        {t("dashboard_desc")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateTeamDialog />
                </div>
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(!teams || teams.length === 0) ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-border bg-muted/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                        <div className="p-8 bg-background border border-border rotate-12 transition-transform group-hover:rotate-0 shadow-xl mb-6 relative z-10">
                            <Users className="h-12 w-12 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
                        </div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tight relative z-10">
                            {t("no_teams_yet")}
                        </h3>
                        <p className="text-[11px] uppercase font-bold text-muted-foreground/60 mt-2 opacity-60 flex items-center gap-2 relative z-10">
                            <span className="w-4 h-[1px] bg-muted-foreground/30" />
                            {t("no_teams_desc") || "Create your first team to start participating in tournaments."}
                            <span className="w-4 h-[1px] bg-muted-foreground/30" />
                        </p>
                    </div>
                ) : (
                    teams.map((team) => (
                        <Link key={team.id} href={`/manager/my-teams/${team.id}`} className="block group h-full">
                            <Card className="flex flex-col h-full bg-card border border-border transition-all hover:border-secondary/50 group overflow-hidden relative shadow-lg hover:shadow-secondary/5 hover:-translate-y-1">
                                <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                                <CardHeader className="pt-4 md:pt-6 relative z-10">
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
                                <CardContent className="flex-1 pb-4 md:pb-6 text-sm relative z-10">
                                    <p className="text-[11px] font-medium text-muted-foreground/60 line-clamp-2 italic leading-relaxed">
                                        {team.description || t("no_description")}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
