"use client";

import { useState, useEffect, useCallback } from "react";
import { Registration } from "@/types/index";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Phone, User, Home, Check, X, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
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

interface RegistrationsTableProps {
    tournamentId: string;
}

export function RegistrationsTable({ tournamentId }: RegistrationsTableProps) {
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

    return (
        <div className="w-full">
            <div className="w-full overflow-x-auto rounded-none">
                <Table className="min-w-[800px] border-separate border-spacing-0">
                    <TableHeader className="bg-muted/5">
                        <TableRow className="h-10 border-b border-border/10 hover:bg-muted/5 transition-colors">
                            <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">{t("team_name")}</TableHead>
                            <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">{t("contact_info")}</TableHead>
                            <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">{t("payment_status")}</TableHead>
                            <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">{t("slip")}</TableHead>
                            <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">Actions</TableHead>
                            <TableHead className="text-right px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/10">{t("date")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {registrations.length > 0 ? (
                            registrations.map((reg) => (
                                <TableRow key={reg.id} className="h-16 border-b border-border/5 hover:bg-muted/5 transition-colors group">
                                    <TableCell className="px-6 border-b border-border/5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-9 w-9 rounded-none bg-muted/10 border border-border/10 flex items-center justify-center shrink-0">
                                                <Home className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-black uppercase tracking-tighter text-base text-foreground group-hover:text-primary transition-colors">{reg.team_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 border-b border-border/5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-foreground/80">
                                                <User className="h-3 w-3 text-primary" />
                                                {reg.contact_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 tabular-nums uppercase">
                                                <Phone className="h-3 w-3" />
                                                {reg.contact_phone}
                                            </div>
                                            {reg.description && (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary/60 mt-1">
                                                    <FileText className="h-3 w-3" />
                                                    {reg.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center px-4 border-b border-border/5">
                                        <Badge variant="outline" className={cn(
                                            "rounded-none border-none text-[10px] font-black uppercase px-2.5 py-1 tracking-widest",
                                            reg.payment_status === 'PAID' ? "bg-secondary text-secondary-foreground shadow-[0_0_10px_rgba(0,196,154,0.2)]" :
                                            reg.payment_status === 'REJECTED' ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                                        )}>
                                            {reg.payment_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center px-4 border-b border-border/5">
                                        {reg.slip_url ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 rounded-none border border-primary/20 hover:border-primary/40 transition-all"
                                                onClick={() => window.open(reg.slip_url!, "_blank")}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                                {t("view_slip")}
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase text-muted-foreground/20 tracking-tighter">No Slip</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center px-4 border-b border-border/5">
                                        {reg.payment_status === 'PENDING' && (
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 w-9 p-0 rounded-none border-none bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all shadow-sm"
                                                    disabled={isActing !== null}
                                                    onClick={() => handleApprove(reg.id)}
                                                    title="Approve"
                                                >
                                                    {isActing === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 w-9 p-0 rounded-none border-none bg-destructive/10 text-destructive hover:bg-destructive hover:text-foreground transition-all shadow-sm"
                                                    disabled={isActing !== null}
                                                    onClick={() => setRegistrationToReject(reg.id)}
                                                    title="Reject"
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right px-6 border-b border-border/5 text-[10px] font-black text-muted-foreground/30 uppercase tabular-nums whitespace-nowrap">
                                        {new Date(reg.created_at).toLocaleString('en-US', { 
                                            day: '2-digit', 
                                            month: 'short', 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            hour12: false
                                        }).replace(',', '')}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="py-24 bg-muted/2">
                                    <div className="flex flex-col items-center justify-center gap-4 text-center">
                                        <div className="h-16 w-16 rounded-none bg-muted/10 border border-border/10 flex items-center justify-center relative group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-muted/20" />
                                            <FileText className="h-8 w-8 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">{t("no_registrations")}</h3>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground/20">Waiting for first signup</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!registrationToReject} onOpenChange={(open) => !open && setRegistrationToReject(null)}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2">
                            <X className="h-5 w-5 text-destructive" />
                            Reject Registration
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            Are you sure you want to reject this registration? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmReject();
                            }}
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
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
