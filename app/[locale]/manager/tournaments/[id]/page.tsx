import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Trophy, Calendar, Users, Info, ArrowLeft, Shield, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { EmptyState } from "@/components/shared/empty-state";

import { format } from "date-fns";

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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'REJECTED': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'default' as const;
            case 'REJECTED': return 'destructive' as const;
            default: return 'default' as const;
        }
    };

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

            <div className="flex flex-col lg:flex-row gap-2 md:gap-3 items-start">
                {/* Info Sidebar */}
                <div className="bg-card w-full lg:w-[380px] shrink-0 space-y-6 lg:sticky lg:top-6 border p-4 md:p-6 order-1 lg:order-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Users className="h-6 w-6 text-primary" />
                            <h3 className="text-2xl font-black tracking-tighter text-foreground">
                                {tCommon("overview")}
                            </h3>                        </div>
                        <div className="relative overflow-hidden">
                            <div className="space-y-6 relative z-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-black tracking-wider border-b pb-3">
                                        <span className="text-muted-foreground/60 flex items-center gap-2">
                                            <Trophy className="h-4 w-4" /> {tCommon("format")}
                                        </span>
                                        <span className="text-foreground">{tSettings(tournament.format)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-black tracking-wider border-b pb-3">
                                        <span className="text-muted-foreground/60 flex items-center gap-2">
                                            <Users className="h-4 w-4" /> {tCommon("teams")}
                                        </span>
                                        <span className="text-foreground">{tournament.max_teams}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-black tracking-wider border-b pb-3">
                                        <span className="text-muted-foreground/60 flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> {tCommon("date")}
                                        </span>
                                        <span className="text-foreground">
                                            {tournament.start_date ? formatDate(tournament.start_date, "MMM d, yyyy", locale) : "TBD"}
                                        </span>
                                    </div>
                                </div>

                                {tournament.description && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2 text-xs font-black tracking-wider">
                                            <span className="text-xs font-black tracking-widest text-primary">
                                            {tCommon("description")}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-muted-foreground/80 tracking-tight whitespace-pre-wrap">
                                            {tournament.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full min-w-0 space-y-6 order-2 lg:order-1">
                    {/* Already Registered Teams */}
                    {userRegistrations && userRegistrations.length > 0 && (
                        <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center gap-4">
                                <CheckCircle className="h-4 w-4 text-primary" />
                                <h2 className="text-sm font-black tracking-widest text-foreground">{t("registered_teams")}</h2>
                            </div>
                            <div className="grid gap-3">
                                {userRegistrations.map((reg) => (
                                    <Card key={reg.id} className="rounded-none border transition-all hover:border-primary/30 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                                        <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black tracking-tight">{reg.team_name}</h3>
                                                    <Badge variant={getStatusVariant(reg.payment_status)} className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-none">
                                                        {reg.payment_status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/60 tracking-wider">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3" />
                                                        {reg.created_at ? format(new Date(reg.created_at), "PPP p") : "Unknown Date"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {reg.tournament_team_id && (
                                                    <Button variant="default" size="sm" asChild className="rounded-none font-black tracking-widest text-[10px] h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                                                        <Link href={`/manager/my-registrations/${reg.tournament_team_id}`}>
                                                            <Users className="h-4 w-4 mr-2" />
                                                            {t("edit_roster")}
                                                        </Link>
                                                    </Button>
                                                )}
                                                {reg.slip_url && (
                                                    <Button variant="outline" size="sm" asChild className="rounded-none font-black tracking-widest text-[10px] h-9 border-2">
                                                        <a href={reg.slip_url} target="_blank" rel="noopener noreferrer">
                                                            {t("view_slip")}
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
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
