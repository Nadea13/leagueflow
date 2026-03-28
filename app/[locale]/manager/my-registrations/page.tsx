import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Clock, CheckCircle, XCircle, Users, Trophy } from "lucide-react";
import { format } from "date-fns";
import { getFormatter } from "next-intl/server";

export default async function MyRegistrationsPage() {
    const supabase = await createClient();
    const t = await getTranslations("Registration");
    const tCommon = await getTranslations("Common");
    const tNav = await getTranslations("Nav");
    const { data: { user } } = await supabase.auth.getUser();
    const formatter = await getFormatter();

    if (!user) return null;

    // Fetch registrations for the user
    const { data: registrations } = await supabase
        .from("registrations")
        .select("*, tournament:tournaments(name, document_deadline)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const isApproved = (status: string) => status === 'APPROVED' || status === 'PAID';
    const isRejected = (status: string) => status === 'REJECTED';

    const totalCount = registrations?.length || 0;
    const approvedCount = registrations?.filter(r => isApproved(r.payment_status)).length || 0;
    const pendingCount = registrations?.filter(r => !isApproved(r.payment_status) && !isRejected(r.payment_status)).length || 0;

    const getStatusIcon = (status: string) => {
        if (isApproved(status)) return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (isRejected(status)) return <XCircle className="h-4 w-4 text-red-500" />;
        return <Clock className="h-4 w-4 text-yellow-500" />;
    };

    const getStatusVariant = (status: string) => {
        if (isApproved(status)) return 'default';
        if (isRejected(status)) return 'destructive';
        return 'secondary';
    };

    const getDisplayStatus = (status: string) => {
        if (isApproved(status)) return tCommon("approved") || "APPROVED";
        if (isRejected(status)) return tCommon("rejected") || "REJECTED";
        if (status === 'PENDING') return tCommon("pending") || "PENDING";
        return status;
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-secondary/20 pb-6">
                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase text-foreground leading-[0.8] mb-2">
                        {tNav("my_registrations")}
                    </h1>
                    <p className="text-muted-foreground/60 text-xs font-bold uppercase tracking-widest max-w-xl">
                        {t("my_registrations_desc") || "Track your team registration applications and their approval status."}
                    </p>
                </div>
            </div>

            <div className="grid gap-3 grid-cols-3 md:gap-6 md:grid-cols-3">
                <Card className="border border-border bg-card shadow-none overflow-hidden relative group transition-all hover:border-secondary/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("total_applications")}
                        </CardTitle>
                        <Trophy className="h-4 w-4 text-secondary opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">{totalCount}</div>
                        <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-secondary/40" />
                            {t("all_time_registrations")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card shadow-none overflow-hidden relative group transition-all hover:border-green-500/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-green-500/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("approved")}
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500 opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">{approvedCount}</div>
                        <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-green-500/40" />
                            {t("verified_applications")}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-border bg-card shadow-none overflow-hidden relative group transition-all hover:border-yellow-500/50">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                    <div className="absolute -right-2 -top-2 w-16 h-16 md:-right-4 md:-top-4 md:w-24 md:h-24 bg-yellow-500/5 rotate-12 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 md:px-6 relative z-10 gap-1 md:gap-0">
                        <CardTitle className="text-[8px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-black text-muted-foreground truncate pr-1">
                            {t("pending_status")}
                        </CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500 opacity-80 shrink-0 hidden sm:block" />
                    </CardHeader>
                    <CardContent className="relative z-10 px-3 pt-0 md:px-6 md:pt-0">
                        <div className="text-2xl md:text-5xl font-black tracking-tighter italic leading-none">{pendingCount}</div>
                        <p className="hidden md:flex text-[10px] uppercase font-bold text-muted-foreground mt-2 opacity-60 items-center gap-1">
                            <span className="w-2 h-[1px] bg-yellow-500/40" />
                            {t("currently_processing")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {(!registrations || registrations.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-b-4 border-dashed border-secondary/10 bg-muted/5">
                        <div className="h-16 w-16 bg-secondary/10 flex items-center justify-center mb-6 border border-secondary/20 rotate-3">
                            <FileText className="h-8 w-8 text-secondary/60" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-foreground mb-2">
                            {t("no_registrations_yet") || "No Applications Found"}
                        </h3>
                        <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-8 opacity-60">
                            {tCommon("browse_tournaments_desc") || "Start your competitive journey today"}
                        </p>
                        <Button asChild variant="outline" className="border-2 font-bold uppercase tracking-widest text-xs px-8 py-6 hover:bg-secondary hover:text-secondary-foreground transition-all">
                            <Link href="/tournaments">{tCommon("browse_tournaments") || "Browse Tournaments"}</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {registrations.map((reg) => (
                            <Card key={reg.id} className="flex flex-col bg-card border border-border transition-all hover:border-secondary/50 group overflow-hidden relative shadow-lg min-h-[300px]">
                                <div className={cn(
                                    "absolute top-0 left-0 w-1 h-full transition-all",
                                    isApproved(reg.payment_status) ? "bg-green-500" :
                                    isRejected(reg.payment_status) ? "bg-red-500" : "bg-yellow-500"
                                )} />
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rotate-12 transition-transform group-hover:scale-110" />
                                
                                <CardHeader className="relative z-10">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <Badge variant={getStatusVariant(reg.payment_status)} className="gap-1.5 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] rounded-none border-0 ring-1 ring-inset ring-foreground/10">
                                                {getStatusIcon(reg.payment_status)}
                                                {getDisplayStatus(reg.payment_status)}
                                            </Badge>
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                 <Trophy className="h-3 w-3 text-secondary" />
                                                 <span className="text-[9px] font-black uppercase italic tracking-tighter text-muted-foreground/80">{tCommon("registration")}</span>
                                            </div>
                                        </div>
                                        <CardTitle className="text-3xl font-black leading-none tracking-tighter uppercase italic group-hover:text-secondary transition-colors truncate">
                                            {reg.team_name}
                                        </CardTitle>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 relative z-10 px-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] italic">{tCommon("tournament") || "Tournament"}</span>
                                            <p className="text-sm font-bold uppercase tracking-tight text-secondary leading-tight line-clamp-2">
                                                {reg.tournament?.name || "Tournament Details Unavailable"}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] italic mb-1">{tCommon("date") || "Applied Date"}</span>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-secondary/40 shrink-0" />
                                                    <span className="text-[10px] font-black uppercase tabular-nums tracking-tight text-muted-foreground">
                                                        {reg.created_at ? formatter.dateTime(new Date(reg.created_at), { dateStyle: 'medium' }) : "Unknown"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] uppercase font-black text-muted-foreground/40 tracking-[0.2em] italic mb-1">{tCommon("contact") || "Contact"}</span>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Users className="h-3.5 w-3.5 text-secondary/40 shrink-0" />
                                                    <span className="text-[10px] font-black uppercase tracking-tight truncate">
                                                        {reg.contact_name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="p-0 mt-auto bg-muted/5 group-hover:bg-muted/10 transition-all border-t border-border/20 flex flex-col sm:flex-row">
                                    {reg.tournament_team_id && (() => {
                                        const deadline = reg.tournament?.document_deadline;
                                        const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;
                                        
                                        return (
                                            <Button 
                                                variant="ghost" 
                                                size="lg" 
                                                asChild 
                                                className="flex-1 rounded-none h-14 font-black uppercase italic tracking-widest text-[10px] hover:bg-secondary hover:text-secondary-foreground transition-all border-r border-border/20"
                                            >
                                                <Link href={`/manager/my-registrations/${reg.tournament_team_id}`}>
                                                    {isDeadlinePassed ? (t("view_roster") || "View Roster") : (t("edit_roster") || "Edit Roster")}
                                                </Link>
                                            </Button>
                                        );
                                    })()}
                                    
                                    <div className="flex items-center flex-1 h-14">
                                        {reg.slip_url && (
                                            <Button variant="ghost" className="flex-1 h-full rounded-none text-[9px] font-black uppercase tracking-widest border-r border-border/20 hover:bg-muted transition-all" asChild>
                                                <a href={reg.slip_url} target="_blank" rel="noopener noreferrer">
                                                    {tCommon("slip") || "Slip"}
                                                </a>
                                            </Button>
                                        )}
                                        <Button variant="ghost" className="flex-1 h-full rounded-none text-[9px] font-black uppercase tracking-widest hover:text-secondary hover:bg-secondary/5 transition-all" asChild>
                                            <Link href={`/tournaments/${reg.tournament_id}`}>
                                                {tCommon("info") || "Info"}
                                            </Link>
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
