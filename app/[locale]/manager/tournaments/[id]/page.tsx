import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Trophy, Calendar, Users, Info, ArrowLeft, Shield, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
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
            default: return 'secondary' as const;
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col gap-4">
                <Link href="/manager/tournaments" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tournaments
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="capitalize">{tournament.format}</Badge>
                            <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {tournament.status || 'draft'}
                            </Badge>
                            {tournament.registration_fee > 0 ? (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                    ฿{Number(tournament.registration_fee).toLocaleString()}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                                    Free
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Already Registered Teams */}
                    {userRegistrations && userRegistrations.length > 0 && (
                        <Card className="rounded-none shadow-sm border-2 border-green-500/10">
                            <CardHeader className="bg-green-500/5 border-b">
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <CheckCircle className="h-5 w-5" />
                                    {t("registered_teams") || "Your Registered Teams"}
                                </CardTitle>
                                <CardDescription>
                                    {t("my_registrations_desc") || "Track your registration status for this tournament."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {userRegistrations.map((reg) => (
                                        <div key={reg.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold">{reg.team_name}</h3>
                                                    <Badge variant={getStatusVariant(reg.payment_status)} className="gap-1.5 px-2 py-0.5 text-xs font-semibold">
                                                        {getStatusIcon(reg.payment_status)}
                                                        {reg.payment_status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {reg.created_at ? format(new Date(reg.created_at), "PPP p") : "Unknown Date"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {reg.tournament_team_id && (
                                                    <Button variant="default" size="sm" asChild className="bg-green-600 hover:bg-green-700">
                                                        <Link href={`/manager/my-registrations/${reg.tournament_team_id}`}>
                                                            <Users className="h-4 w-4 mr-2" />
                                                            {t("edit_roster") || "Edit Roster"}
                                                        </Link>
                                                    </Button>
                                                )}
                                                {reg.slip_url && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={reg.slip_url} target="_blank" rel="noopener noreferrer">
                                                            {t("view_slip") || tCommon("view")}
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Registration Form */}
                    <Card className="rounded-none shadow-sm border-2 border-primary/10">
                        <CardHeader className="bg-primary/5 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                {t("title") || "Tournament Registration"}
                            </CardTitle>
                            <CardDescription>
                                {t("register_desc") || "Fill in the details below to register your team for this tournament."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isRegistrationDisabled ? (
                                <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
                                    <div className="bg-red-500/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                                        {t("registration_closed_title")}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                                        {isFull 
                                            ? t("registration_closed_full_desc") 
                                            : (isPastDeadline ? t("registration_closed_deadline_desc") : t("registration_closed_desc"))}
                                    </p>
                                    <Button asChild variant="outline" size="sm" className="rounded-full px-6 font-black uppercase italic tracking-tighter">
                                        <Link href="/manager/tournaments">
                                            {tCommon("back_to_dashboard")}
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <RegistrationForm 
                                    tournament={tournament} 
                                    initialTeams={teams || []} 
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tournament Info / Sidebar */}
                <div className="space-y-6">
                    <Card className="rounded-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                {tCommon("overview") || "Tournament Info"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm border-b pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Trophy className="h-4 w-4" /> {tCommon("format") || "Format"}
                                    </span>
                                    <span className="font-semibold capitalize">{tSettings(tournament.format) || tournament.format}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4" /> {tCommon("teams") || "Max Teams"}
                                    </span>
                                    <span className="font-semibold">{tournament.max_teams || "Unlimited"}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> {tCommon("date") || "Start Date"}
                                    </span>
                                    <span className="font-semibold">
                                        {tournament.start_date ? formatDate(tournament.start_date, "MMM d, yyyy", locale) : "TBD"}
                                    </span>
                                </div>
                            </div>

                            {tournament.description && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{tCommon("description") || "Description"}</h4>
                                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                        {tournament.description}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Preview Link */}
                    <Link 
                        href={`/${tournament.id}`} 
                        target="_blank"
                        className="flex items-center justify-center gap-2 p-4 text-sm font-medium border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group"
                    >
                        <Info className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        {tCommon("preview") || "View Public Tournament Page"}
                    </Link>
                </div>
            </div>
        </div>
    );
}
