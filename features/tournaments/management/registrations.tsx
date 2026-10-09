"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Registration } from "@/types/index";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Phone, User, Users, Check, X, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";
import { approveRegistration, rejectRegistration, withdrawTournamentTeam } from "@/actions/tournaments/registration";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamRosterDetailsDialog } from "@/features/dialogs";
import { Input } from "@/components/ui/input";
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

export function Registrations({ tournamentId, categoryId }: { tournamentId: string; categoryId?: string }) {
    const t = useTranslations("Registrations");
    const locale = useLocale();
    const storeTeams = useBracketStore((state) => state.teams);
    const storeCategoryId = useBracketStore((state) => state.activeCategoryId);
    const resolvedCategoryId = categoryId || storeCategoryId || undefined;

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActing, setIsActing] = useState<string | null>(null);
    const [registrationToReject, setRegistrationToReject] = useState<string | null>(null);
    const [withdrawingReg, setWithdrawingReg] = useState<{ id: string; name: string } | null>(null);
    const [withdrawConfirmText, setWithdrawConfirmText] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Team Details & Roster Dialog state
    const [selectedTeamForDetails, setSelectedTeamForDetails] = useState<Registration | null>(null);
    const _supabase = createClient();

    const fetchRegistrations = useCallback(async (showLoading = false) => {
        if (showLoading) setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
            const url = resolvedCategoryId
                ? `${apiUrl}/tournaments/${tournamentId}/teams?category_id=${resolvedCategoryId}`
                : `${apiUrl}/tournaments/${tournamentId}/teams`;

            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const mapped: Registration[] = (data || []).map((item: any) => {
                    const ps = String(item.payment_status || '').toLowerCase();
                    const rs = String(item.registration_status || '').toLowerCase();
                    const s = String(item.status || '').toLowerCase();

                    // If registration_status is pending or status is pending, it is ALWAYS pending approval
                    let mappedStatus: 'PENDING' | 'PAID' | 'REJECTED' = 'PENDING';
                    if (rs === 'rejected' || ps === 'rejected' || s === 'rejected') {
                        mappedStatus = 'REJECTED';
                    } else if (rs === 'approved' || rs === 'confirmed' || s === 'approved' || (s === 'registered' && rs !== 'pending' && ps !== 'pending')) {
                        mappedStatus = 'PAID';
                    } else {
                        mappedStatus = 'PENDING';
                    }

                    return {
                        id: item.id,
                        tournament_id: item.tournament_id || tournamentId,
                        team_name: item.team?.name || item.name || '',
                        contact_name: item.contact_name || item.team?.contact_name || '',
                        contact_phone: item.contact_phone || item.team?.contact_phone || '',
                        logo_url: item.team?.logo_img || item.team?.logo_url || item.logo_img || item.logo_url || null,
                        existing_team_id: item.team_id || item.team?.id || null,
                        slip_url: item.slip_img || null,
                        payment_status: mappedStatus,
                        trans_ref: item.remark || null,
                        description: item.team?.description || item.description || null,
                        tournament_team_id: item.id,
                        created_at: item.created_at || new Date().toISOString(),
                    };
                });
                setRegistrations(mapped);
            }
        } catch (e) {
            console.error("Error fetching registrations:", e);
        } finally {
            setIsLoading(false);
        }
    }, [tournamentId, resolvedCategoryId]);

    useEffect(() => {
        fetchRegistrations(true);

        const interval = setInterval(() => {
            fetchRegistrations(false);
        }, 3000);

        const handleFocus = () => {
            fetchRegistrations(false);
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchRegistrations]);

    // Re-fetch whenever store teams update (e.g. after adding or modifying a team)
    useEffect(() => {
        if (storeTeams.length > 0 || registrations.length > 0) {
            fetchRegistrations(false);
        }
    }, [storeTeams, fetchRegistrations]);

    const handleApprove = async (id: string) => {
        setIsActing(id);
        // Optimistically update status to PAID/APPROVED
        setRegistrations((prev) =>
            prev.map((r) => (r.id === id ? { ...r, payment_status: 'PAID' } : r))
        );
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
            const clientRes = await fetch(`${apiUrl}/tournaments/${tournamentId || '0'}/registrations/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'approved',
                    payment_status: 'paid',
                    registration_status: 'approved',
                }),
            });

            if (clientRes.ok) {
                toast.success(locale === 'th' ? "ยืนยันทีมเรียบร้อยแล้ว" : "Registration approved!");
            } else {
                const res = await approveRegistration(id, tournamentId);
                if (res.success) {
                    toast.success(res.message);
                } else {
                    toast.error(res.error || (locale === 'th' ? "ไม่สามารถยืนยันทีมได้" : "Failed to approve"));
                }
            }
        } catch (e: any) {
            console.error("Error approving registration:", e);
            const res = await approveRegistration(id, tournamentId);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error || (locale === 'th' ? "ไม่สามารถยืนยันทีมได้" : "Failed to approve"));
            }
        } finally {
            await fetchRegistrations();
            const activeCategoryId = useBracketStore.getState().activeCategoryId;
            if (activeCategoryId) {
                await useBracketStore.getState().fetchTeams(activeCategoryId);
            }
            setIsActing(null);
        }
    };

    const confirmReject = async () => {
        if (!registrationToReject) return;

        const id = registrationToReject;
        setRegistrationToReject(null);
        setIsActing(id);

        // Optimistically update status to REJECTED
        setRegistrations((prev) =>
            prev.map((r) => (r.id === id ? { ...r, payment_status: 'REJECTED' } : r))
        );

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
            const clientRes = await fetch(`${apiUrl}/tournaments/${tournamentId || '0'}/registrations/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'rejected',
                    payment_status: 'rejected',
                    registration_status: 'rejected',
                }),
            });

            if (clientRes.ok) {
                toast.success(locale === 'th' ? "ปฏิเสธทีมเรียบร้อยแล้ว" : "Registration rejected");
            } else {
                const res = await rejectRegistration(id, tournamentId);
                if (res.success) {
                    toast.success(res.message);
                } else {
                    toast.error(res.error || (locale === 'th' ? "ไม่สามารถปฏิเสธทีมได้" : "Failed to reject"));
                }
            }
        } catch (e: any) {
            console.error("Error rejecting registration:", e);
            const res = await rejectRegistration(id, tournamentId);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error || (locale === 'th' ? "ไม่สามารถปฏิเสธทีมได้" : "Failed to reject"));
            }
        } finally {
            await fetchRegistrations();
            const activeCategoryId = useBracketStore.getState().activeCategoryId;
            if (activeCategoryId) {
                await useBracketStore.getState().fetchTeams(activeCategoryId);
            }
            setIsActing(null);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawingReg) return;
        if (withdrawConfirmText !== withdrawingReg.name) {
            toast.error(locale === 'th' ? "ชื่อทีมไม่ถูกต้อง" : "Invalid team name");
            return;
        }

        setIsWithdrawing(true);
        const res = await withdrawTournamentTeam(withdrawingReg.id);
        if (res.success) {
            toast.success(res.message);
            setWithdrawingReg(null);
            setWithdrawConfirmText("");
            await fetchRegistrations();
            // Re-fetch bracket store teams so sidebar + canvas update in real-time
            const activeCategoryId = useBracketStore.getState().activeCategoryId;
            if (activeCategoryId) {
                await useBracketStore.getState().fetchTeams(activeCategoryId);
            }
        } else {
            toast.error(res.error);
        }
        setIsWithdrawing(false);
    };



    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (registrations.length === 0) {
        return (
            <EmptyState
                icon={Inbox}
                title={locale === 'th' ? "ยังไม่มีรายการสมัครเข้าทีม" : "No registrations received yet"}
                description={locale === 'th' ? "เมื่อมีทีมสมัครเข้ามารายชื่อจะแสดงที่นี่" : "Submitted team registrations will appear here"}
            />
        );
    }

    return (
        <div className="relative overflow-hidden transition-colors space-y-1 md:space-y-2">
            <div className="border bg-card rounded-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent h-10 border-b">
                                <TableHead className="px-2 md:px-3 text-[10px] font-black tracking-widest">{t("team_name")}</TableHead>
                                <TableHead className="px-2 md:px-3 text-[10px] font-black tracking-widest">{t("contact_info")}</TableHead>
                                <TableHead className="text-center px-2 md:px-3 text-[10px] font-black tracking-widest">{t("payment_status")}</TableHead>
                                <TableHead className="text-center px-2 md:px-3 text-[10px] font-black tracking-widest">{t("slip")}</TableHead>
                                <TableHead className="px-2 md:px-3 text-[10px] font-black tracking-widest">{t("date")}</TableHead>
                                <TableHead className="text-center px-2 md:px-3 text-[10px] font-black tracking-widest"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y">
                            {registrations.map((reg) => (
                                <TableRow key={reg.id} className="hover:bg-muted/5 transition-colors group">
                                    <TableCell className="px-2 md:px-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTeamForDetails(reg)}
                                            className="flex items-center gap-1 md:gap-2 cursor-pointer group/team text-left hover:opacity-80 transition-opacity"
                                            title={locale === 'th' ? "คลิกเพื่อดูข้อมูลทีมและรายชื่อนักกีฬา" : "Click to view team & roster"}
                                        >
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
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <span className="font-black tracking-tight text-xs text-foreground group-hover/team:text-primary group-hover/team:underline transition-colors truncate max-w-[150px]">
                                                {reg.team_name}
                                            </span>
                                        </button>
                                    </TableCell>
                                    <TableCell className="px-1 md:px-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs group-hover:text-primary transition-colors font-black tracking-tight">
                                                <User className="h-4 w-4 text-primary" />
                                                {reg.contact_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground tabular-nums tracking-widest">
                                                <Phone className="h-4 w-4" />
                                                {reg.contact_phone}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center px-1 md:px-2">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "transition-colors",
                                                reg.payment_status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                                                    reg.payment_status === 'REJECTED' ? "bg-destructive/10 text-destructive border-destructive/30" :
                                                        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                            )}
                                        >
                                            {reg.payment_status === 'PAID'
                                                ? (locale === 'th' ? "อนุมัติแล้ว" : "APPROVED")
                                                : reg.payment_status === 'REJECTED'
                                                    ? (locale === 'th' ? "ปฏิเสธ" : "REJECTED")
                                                    : (locale === 'th' ? "รอตรวจสอบ" : "PENDING")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {reg.slip_url ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(reg.slip_url!, "_blank")}
                                            >
                                                <ExternalLink className="h-4 w-4" />
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
                                        {reg.payment_status === 'PENDING' ? (
                                            <div className="flex items-center justify-end gap-1.5 transition-opacity">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20 transition-all shadow-sm flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                                    disabled={isActing !== null}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApprove(reg.id);
                                                    }}
                                                    title={locale === 'th' ? "ยืนยันทีม" : "Approve Team"}
                                                >
                                                    {isActing === reg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                    <span>{locale === 'th' ? "ยืนยันทีม" : "Approve"}</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon-sm"
                                                    variant="outline"
                                                    className="border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm shrink-0 cursor-pointer"
                                                    disabled={isActing !== null}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRegistrationToReject(reg.id);
                                                    }}
                                                    title={locale === 'th' ? "ปฏิเสธ" : "Reject"}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : reg.payment_status === 'PAID' ? (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs h-8 cursor-pointer"
                                                    disabled={isActing !== null}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setWithdrawingReg({ id: reg.id, name: reg.team_name });
                                                    }}
                                                >
                                                    {locale === 'th' ? "ถอนทีม" : "Withdraw"}
                                                </Button>
                                            </div>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <AlertDialog open={!!registrationToReject} onOpenChange={(open) => !open && setRegistrationToReject(null)}>
                <AlertDialogContent className="bg-card border-border/10 shadow-2xl max-w-md z-[9999]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <X className="h-4 w-4 text-destructive" />
                            {locale === 'th' ? "ปฏิเสธการสมัคร" : "Reject Registration"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {locale === 'th' ? "คุณแน่ใจหรือไม่ที่จะปฏิเสธการสมัครของทีมนี้?" : "Are you sure you want to reject this registration? This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all">
                            {locale === 'th' ? "ยกเลิก" : "Cancel"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmReject();
                            }}
                            className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all cursor-pointer"
                        >
                            {locale === 'th' ? "ยืนยันการปฏิเสธ" : "Reject"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!withdrawingReg} onOpenChange={(open) => {
                if (!open) {
                    setWithdrawingReg(null);
                    setWithdrawConfirmText("");
                }
            }}>
                <DialogContent showCloseButton={false} className="bg-card border rounded-sm shadow-2xl max-w-md p-0 z-[9999]">
                    <DialogHeader className="border-b p-2 md:p-4 relative pr-10">
                        <DialogTitle className="text-base font-bold">
                            {locale === 'th' ? "ถอนทีมออกจากการแข่งขัน" : "Withdraw Team from Tournament"}
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => {
                                setWithdrawingReg(null);
                                setWithdrawConfirmText("");
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>
                    <div className="p-2 md:p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">
                            {locale === 'th' 
                                ? "คุณแน่ใจหรือไม่ที่จะถอนทีมนี้ออกจากการแข่งขัน? การดำเนินการนี้ไม่สามารถย้อนกลับได้" 
                                : "Are you sure you want to withdraw this team from the tournament? This action cannot be undone."}
                        </p>
                        <div className="space-y-1">
                            <p className="text-xs font-bold">
                                {locale === 'th'
                                    ? `กรุณากรอกชื่อทีม "${withdrawingReg?.name}" เพื่อยืนยันการถอนทีม`
                                    : `Please type "${withdrawingReg?.name}" to confirm.`}
                            </p>
                            <Input
                                size="sm"
                                value={withdrawConfirmText}
                                onChange={(e) => setWithdrawConfirmText(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                    <div className="p-2 md:p-4 border-t flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setWithdrawingReg(null);
                                setWithdrawConfirmText("");
                            }}
                            disabled={isWithdrawing}
                        >
                            {locale === 'th' ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isWithdrawing || withdrawConfirmText !== withdrawingReg?.name}
                            onClick={handleWithdraw}
                        >
                            {isWithdrawing && <Loader2 className="h-4 w-4 animate-spin" />}
                            {locale === 'th' ? "ยืนยันการถอนทีม" : "Confirm Withdraw"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Team Details & Roster Dialog */}
            <TeamRosterDetailsDialog
                team={selectedTeamForDetails}
                open={!!selectedTeamForDetails}
                onOpenChange={(open) => !open && setSelectedTeamForDetails(null)}
            />
        </div>
    );
}
