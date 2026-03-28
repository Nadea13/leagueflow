"use client";

import { useState, useEffect } from "react";
import { Registration } from "@/types/index";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Phone, User, Home, Check, X, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { approveRegistration, rejectRegistration } from "@/app/[locale]/organizer/tournaments/[id]/registration-actions";
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

    const fetchRegistrations = async () => {
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
    };

    useEffect(() => {
        fetchRegistrations();
    }, [tournamentId]);

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
        <div className="space-y-4">
            <div className="border border-border/10 rounded-none overflow-hidden bg-white/5">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 h-10">{t("team_name")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 h-10">{t("contact_info")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 h-10 text-center">{t("payment_status")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 h-10 text-center">{t("slip")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 h-10 text-center">Actions</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 h-10 text-right">{t("date")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {registrations.length > 0 ? (
                            registrations.map((reg) => (
                                <TableRow key={reg.id} className="border-none hover:bg-white/5 transition-colors group">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-none bg-white/10 flex items-center justify-center">
                                                <Home className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-black uppercase italic tracking-tighter text-sm">{reg.team_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground/80">
                                                <User className="h-3 w-3 text-primary" />
                                                {reg.contact_name}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground/40">
                                                <Phone className="h-3 w-3" />
                                                {reg.contact_phone}
                                            </div>
                                            {reg.description && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-secondary/70 mt-1 uppercase italic tracking-tight bg-secondary/5 px-1 py-0.5 border border-secondary/10 w-fit">
                                                    <FileText className="h-2.5 w-2.5" />
                                                    {reg.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <Badge variant="outline" className={cn(
                                            "rounded-none border-none text-[9px] font-black uppercase px-2 py-0.5",
                                            reg.payment_status === 'PAID' ? "bg-secondary text-secondary-foreground" :
                                            reg.payment_status === 'REJECTED' ? "bg-destructive text-destructive-foreground" : "bg-white/10 text-muted-foreground"
                                        )}>
                                            {reg.payment_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        {reg.slip_url ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-[10px] font-black uppercase italic tracking-tight text-primary hover:text-primary hover:bg-primary/10 rounded-none"
                                                onClick={() => window.open(reg.slip_url!, "_blank")}
                                            >
                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                {t("view_slip")}
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] font-bold text-muted-foreground/20 italic">No Slip</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        {reg.payment_status === 'PENDING' && (
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-none border-none bg-secondary/20 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
                                                    disabled={isActing !== null}
                                                    onClick={() => handleApprove(reg.id)}
                                                    title="Approve"
                                                >
                                                    {isActing === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-none border-none bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                                                    disabled={isActing !== null}
                                                    onClick={() => setRegistrationToReject(reg.id)}
                                                    title="Reject"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right py-4 text-[9px] font-bold text-muted-foreground/40 uppercase whitespace-nowrap">
                                        {new Date(reg.created_at).toLocaleString('en-US', { 
                                            day: '2-digit', 
                                            month: 'short', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-[11px] border-none bg-white/2">
                                    {t("no_registrations")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!registrationToReject} onOpenChange={(open) => !open && setRegistrationToReject(null)}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                            <X className="h-5 w-5 text-destructive" />
                            Reject Registration
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            Are you sure you want to reject this registration? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none border-border/10 bg-white/5 hover:bg-white/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmReject();
                            }}
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-white hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
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
