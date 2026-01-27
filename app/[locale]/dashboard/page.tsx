import { Link } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { CreateTournamentDialog } from "@/components/tournaments/create-tournament-dialog";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: tournaments } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });

    const t = await getTranslations("Common");
    const tSettings = await getTranslations("Settings");

    const hasTournaments = tournaments && tournaments.length > 0;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t("my_tournaments")}</h1>
                <CreateTournamentDialog />
            </div>

            {!hasTournaments ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 p-8 text-center animate-in fade-in-50">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <Trophy className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight">
                        {t("no_tournaments")}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm mb-6">
                        {t("no_tournaments_desc")}
                    </p>
                    <CreateTournamentDialog />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tournaments.map((tournament) => (
                        <Card key={tournament.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-bold">
                                    {tournament.name}
                                </CardTitle>
                                <Badge
                                    variant={tournament.status === 'active' ? 'default' : 'secondary'}
                                    className="capitalize"
                                >
                                    {tournament.status ? tSettings(tournament.status as any) : tSettings('draft')}
                                </Badge>
                            </CardHeader>
                            <CardContent className="flex-1 pt-4">
                                <div className="grid gap-2">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <span className="font-medium mr-2">{t("format")}:</span>
                                        <span className="capitalize">{tournament.format || 'League'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        {/* Placeholder for team count if we had it joined properly */}
                                        {/* <span className="font-medium mr-2">Teams:</span> 8 */}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/20 pt-4">
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href={`/dashboard/tournaments/${tournament.id}`}>
                                        {t("manage")}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
