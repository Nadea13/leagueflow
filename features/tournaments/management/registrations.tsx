"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Registration, TournamentTeam } from "@/types/index";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Phone, User, Users, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { approveRegistration, rejectRegistration } from "@/actions/tournaments/registration";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { toast } from "sonner";
import { RosterDialog } from "@/features/tournaments/teams/roster-manager";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamQueryResult {
    id: string;
    name: string;
    contact_name: string | null;
    contact_phone: string | null;
    logo_img: string | null;
    description: string | null;
}

interface CategoryQueryResult {
    tournament_id: string;
}

interface RegistrationQueryResult {
    id: string;
    payment_status: string | null;
    registration_status: string | null;
    slip_img: string | null;
    remark: string | null;
    created_at: string;
    teams: TeamQueryResult | null;
    tournament_categories: CategoryQueryResult | null;
}

export function Registrations({ tournamentId, categoryId }: { tournamentId: string; categoryId?: string }) {
    const t = useTranslations("Registrations");
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActing, setIsActing] = useState<string | null>(null);
    const [registrationToReject, setRegistrationToReject] = useState<string | null>(null);
    const supabase = createClient();

    const fetchRegistrations = useCallback(async () => {
        setIsLoading(true);
        let query = supabase
            .from("tournament_teams")
            .select(`
                id,
                payment_status,
                registration_status,
                slip_img,
                remark,
                created_at,
                teams!inner (
                    id,
                    name,
                    contact_name,
                    contact_phone,
                    logo_img,
                    description
                ),
                tournament_categories!inner (
                    id,
                    tournament_id
                )
            `)
            .eq("tournament_categories.tournament_id", tournamentId)
            .is("deleted_at", null);

        if (categoryId) {
            query = query.eq("tournament_category_id", categoryId);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (!error && data) {
            const mapped: Registration[] = (data as unknown as RegistrationQueryResult[]).map((item) => ({
                id: item.id,
                tournament_id: item.tournament_categories?.tournament_id || tournamentId,
                team_name: item.teams?.name || '',
                contact_name: item.teams?.contact_name || '',
                contact_phone: item.teams?.contact_phone || '',
                logo_url: item.teams?.logo_img || null,
                existing_team_id: item.teams?.id || null,
                slip_url: item.slip_img || null,
                payment_status: item.payment_status === 'paid' ? 'PAID' : item.payment_status === 'rejected' ? 'REJECTED' : 'PENDING',
                trans_ref: item.remark || null,
                description: item.teams?.description || null,
                tournament_team_id: item.id,
                created_at: item.created_at,
            }));
            setRegistrations(mapped);
        } else if (error) {
            console.error("Error fetching registrations:", error);
        }
        setIsLoading(false);
    }, [tournamentId, categoryId, supabase]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRegistrations(), 0);
        return () => clearTimeout(timer);
    }, [fetchRegistrations]);

    const handleApprove = async (id: string) => {
        setIsActing(id);
        const res = await approveRegistration(id, tournamentId);
        if (res.success) {
            toast.success(res.message);
            fetchRegistrations();
            // Re-fetch bracket store teams so sidebar + canvas update in real-time
            const activeCategoryId = useBracketStore.getState().activeCategoryId;
            if (activeCategoryId) {
                useBracketStore.getState().fetchTeams(activeCategoryId);
            }
        } else {
            toast.error(res.error);
        }
        setIsActing(null);
    };

    const confirmReject = async () => {
        if (!registrationToReject) return;

        setIsActing(registrationToReject);
        const id = registrationToReject;
        setRegistrationToReject(null);

        const res = await rejectRegistration(id, tournamentId);
        if (res.success) {
            toast.success(res.message);
            fetchRegistrations();
            // Re-fetch bracket store teams so sidebar + canvas update in real-time
            const activeCategoryId = useBracketStore.getState().activeCategoryId;
            if (activeCategoryId) {
                useBracketStore.getState().fetchTeams(activeCategoryId);
            }
        } else {
            toast.error(res.error);
        }
        setIsActing(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Hide entire section if no registrations
    if (registrations.length === 0) {
        return null;
    }

    return (
        <div className="relative overflow-hidden transition-colors space-y-1 md:space-y-2">
            <div className="relative overflow-hidden transition-colors">
                <div className="w-full overflow-x-auto">
                    <Table className="min-w-[800px] border-t">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent h-10">
                                <TableHead className="px-1 md:px-2 text-[10px] font-black tracking-widest">{t("team_name")}</TableHead>
                                <TableHead className="px-1 md:px-2 text-[10px] font-black tracking-widest">{t("contact_info")}</TableHead>
                                <TableHead className="text-center px-1 md:px-2 text-[10px] font-black tracking-widest">{t("payment_status")}</TableHead>
                                <TableHead className="text-center px-1 md:px-2 text-[10px] font-black tracking-widest">{t("slip")}</TableHead>
                                <TableHead className="px-1 md:px-2 text-[10px] font-black tracking-widest">{t("date")}</TableHead>
                                <TableHead className="text-center px-1 md:px-2 text-[10px] font-black tracking-widest"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.map((reg) => (
                                <TableRow key={reg.id} className="hover:bg-muted/5 transition-colors group">
                                    <TableCell className="px-1 md:px-2">
                                        <RosterDialog
                                            team={{
                                                id: reg.tournament_team_id || "",
                                                name: reg.team_name,
                                                logo_url: reg.logo_url,
                                                description: reg.description,
                                                contact_name: reg.contact_name,
                                                contact_phone: reg.contact_phone,
                                                sport: 'football'
                                            } as unknown as TournamentTeam}
                                            tournamentId={tournamentId}
                                            readOnly={false}
                                            trigger={
                                                <div className="flex items-center gap-1 md:gap-2 cursor-pointer">
                                                    {reg.logo_url ? (
                                                        <Image
                                                            src={reg.logo_url}
                                                            alt={reg.team_name || "Team logo"}
                                                            width={24}
                                                            height={24}
                                                            className="h-6 w-6 rounded-full object-cover border"
                                                        />
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border">
                                                            <Users className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <span className="font-black tracking-tight text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[150px]">{reg.team_name}</span>
                                                </div>
                                            }
                                        />
                                    </TableCell>
                                    <TableCell className="px-1 md:px-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs group-hover:text-primary transition-colors font-black tracking-tight">
                                                <User className="h-3 w-3 text-primary" />
                                                {reg.contact_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tabular-nums tracking-widest">
                                                <Phone className="h-3 w-3" />
                                                {reg.contact_phone}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center px-1 md:px-2">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[9px] font-black tracking-tighter h-5 px-3",
                                                reg.payment_status === 'PAID' ? "bg-primary text-primary-foreground border-primary" :
                                                    reg.payment_status === 'REJECTED' ? "bg-destructive text-destructive-foreground border-destructive" :
                                                        "bg-muted text-muted-foreground border-muted-foreground/20"
                                            )}
                                        >
                                            {reg.payment_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {reg.slip_url ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(reg.slip_url!, "_blank")}
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                {t("view_slip")}
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] font-black text-muted-foreground/20 tracking-tighter">{t("no_slip") || "No Slip"}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-[10px] font-black text-muted-foreground/30 tabular-nums whitespace-nowrap tracking-widest">
                                        {new Date(reg.created_at).toLocaleString('en-US', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        }).replace(',', '')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {reg.payment_status === 'PENDING' && (
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 w-9 p-0 border-none bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                                                    disabled={isActing !== null}
                                                    onClick={() => handleApprove(reg.id)}
                                                    title="Approve"
                                                >
                                                    {isActing === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 w-9 p-0 border-none bg-destructive/10 text-destructive hover:bg-destructive hover:text-foreground transition-all shadow-sm"
                                                    disabled={isActing !== null}
                                                    onClick={() => setRegistrationToReject(reg.id)}
                                                    title="Reject"
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <AlertDialog open={!!registrationToReject} onOpenChange={(open) => !open && setRegistrationToReject(null)}>
                <AlertDialogContent className="bg-card border-border/10 shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <X className="h-5 w-5 text-destructive" />
                            Reject Registration
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            Are you sure you want to reject this registration? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmReject();
                            }}
                            className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                        >
                            <X className="h-3.5 w-3.5 mr-2" />
                            Reject
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
