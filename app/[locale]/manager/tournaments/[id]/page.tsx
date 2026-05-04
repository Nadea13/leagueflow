import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Info, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { TournamentOverview } from "@/components/registrations/tournament-overview";
import { RegisteredTeams } from "@/components/registrations/registered-teams";
import { Button } from "@/components/ui/button";

export default async function ManagerTournamentRegisterPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
    const { id, locale } = await params;
    const supabase = await createClient();
    const t = await getTranslations("Registration");
    const tCommon = await getTranslations("Common");
    const tSettings = await getTranslations("Settings");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Fetch Tournament
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("*, tournament_teams(count)")
        .eq("id", id)
        .single();

    if (!tournament) {
        notFound();
    }

    const currentTeams = tournament.tournament_teams?.[0]?.count || 0;
    const isFull = tournament.max_teams && currentTeams >= tournament.max_teams;
    const isPastDeadline = tournament.document_deadline && new Date(tournament.document_deadline) < new Date();
    const isRegistrationDisabled = isFull || isPastDeadline || !tournament.is_registration_open;

    // 2. Fetch User's Teams (Initial teams for registration)
    const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // 3. Fetch User's Registrations for this tournament
    const { data: userRegistrations } = await supabase
        .from("registrations")
        .select("*")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // 4. Fetch All Approved Registrations for this tournament
    const { data: allApprovedRegistrations } = await supabase
        .from("registrations")
        .select("team_name, logo_url")
        .eq("tournament_id", id)
        .eq("payment_status", "PAID")
        .order("created_at", { ascending: true });


    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-2 md:space-y-6">
            {/* Top Navigation & Header */}
            <div className="flex md:items-start justify-between gap-4 md:gap-6">
                <div className="flex items-start gap-2 md:gap-6">
                    <Button variant="ghost" size="icon" asChild className="rounded-none h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                        <Link href="/manager/tournaments">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="space-y-2 md:space-y-3">
                        <div className="flex items-center gap-2 md:gap-3">
                            <Badge variant="default" className="text-[10px] font-black tracking-wider">
                                {tournament.format}
                            </Badge>
                            <span className="text-[10px] font-black tracking-wider text-primary/60">
                                {tournament.status}
                            </span>
                            {tournament.registration_fee > 0 ? (
                                <Badge variant="default" className="bg-primary/10 text-primary border-primary text-[10px] font-black tracking-wider">
                                    ฿{Number(tournament.registration_fee).toLocaleString()}
                                </Badge>
                            ) : (
                                <Badge variant="default" className="bg-primary/10 text-primary border-primary text-[10px] font-black tracking-wider">
                                    FREE
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none text-foreground">
                            {tournament.name}
                        </h1>
                    </div>
                </div>
                <div className="hidden md:flex items-start gap-2">
                    <Button variant="outline" size="sm" asChild className="rounded-none font-bold tracking-wider text-[10px] h-10 border-2">
                        <Link href={`/${tournament.id}`} target="_blank">
                            <Info className="h-4 w-4 mr-2" />
                            {tCommon("preview")}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2 md:gap-6 items-start">
                {/* Info Sidebar */}
                <div className="bg-card w-full lg:w-[380px] shrink-0 space-y-6 lg:sticky lg:top-6 border p-4 md:p-6 order-1 lg:order-2">
                    <TournamentOverview 
                        tournament={tournament}
                        allApprovedRegistrations={allApprovedRegistrations}
                        locale={locale}
                    />
                </div>

                <div className="flex-1 w-full min-w-0 space-y-2 md:space-y-6 order-2 lg:order-1">
                    {/* Already Registered Teams */}
                    {userRegistrations && userRegistrations.length > 0 && (
                        <RegisteredTeams userRegistrations={userRegistrations} />
                    )}

                    {/* Registration Form Area */}
                    <RegistrationForm
                        tournament={tournament}
                        initialTeams={teams || []}
                        isRegistrationDisabled={isRegistrationDisabled}
                        isFull={isFull}
                        isPastDeadline={isPastDeadline}
                    />
                </div>
            </div>
        </div>
    );
}
