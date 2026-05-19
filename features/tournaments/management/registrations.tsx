"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Registration } from "@/types/index";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Phone, User, Users, Check, X, ClipboardEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { approveRegistration, rejectRegistration } from "@/actions/organizer/tournaments/registration";
import { toast } from "sonner";
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

export function Registrations({ tournamentId }: { tournamentId: string }) {
    const t = useTranslations("Registrations");
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActing, setIsActing] = useState<string | null>(null);
    const [registrationToReject, setRegistrationToReject] = useState<string | null>(null);
    const supabase = createClient();

    const fetchRegistrations = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("registrations")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setRegistrations(data as Registration[]);
        }
        setIsLoading(false);
    }, [tournamentId, supabase]);

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
        <div className="relative overflow-hidden transition-colors space-y-4 md:space-y-6">
            <div className="relative overflow-hidden transition-colors">
                <div className="w-full overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="h-10 hover:bg-transparent border-border/50">
                                <TableHead className="px-2 md:px-3 text-[10px] font-black tracking-widest text-muted-foreground/50">{t("team_name")}</TableHead>
                                <TableHead className="px-2 md:px-3 text-[10px] font-black tracking-widest text-muted-foreground/50">{t("contact_info")}</TableHead>
                                <TableHead className="text-center px-2 md:px-3 text-[10px] font-black tracking-widest text-muted-foreground/50">{t("payment_status")}</TableHead>
                                <TableHead className="text-center px-2 md:px-3 text-[10px] font-black tracking-widest text-muted-foreground/50">{t("slip")}</TableHead>
                                <TableHead className="px-2 md:px-3 text-[10px] font-black tracking-widest text-muted-foreground/50">{t("date")}</TableHead>
                                <TableHead className="text-center px-2 md:px-3 text-[10px] font-black tracking-widest text-muted-foreground/50"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.map((reg) => (
                                <TableRow key={reg.id} className="hover:bg-muted/5 transition-colors group border-border/50">
                                    <TableCell className="px-2 md:px-3 py-3">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            {reg.logo_url ? (
                                                <img 
                                                    src={reg.logo_url} 
                                                    alt="" 
                                                    className="h-6 w-6 rounded-full object-cover border border-border" 
                                                />
                                            ) : (
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border">
                                                    <Users className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                            )}
                                            <span className="font-black tracking-tight text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[150px]">{reg.team_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-2 md:px-3">
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
                                    <TableCell className="text-center px-2 md:px-3">
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
                                    <TableCell className="text-center px-4">
                                        {reg.slip_url ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 px-3 text-[10px] font-black tracking-widest text-primary hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all"
                                                onClick={() => window.open(reg.slip_url!, "_blank")}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                                {t("view_slip")}
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] font-black text-muted-foreground/20 tracking-tighter">{t("no_slip") || "No Slip"}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-2 md:px-3 text-[10px] font-black text-muted-foreground/30 tabular-nums whitespace-nowrap tracking-widest">
                                        {new Date(reg.created_at).toLocaleString('en-US', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        }).replace(',', '')}
                                    </TableCell>
                                    <TableCell className="px-2 md:px-3 text-right">
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
