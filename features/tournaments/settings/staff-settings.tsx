"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, UserCheck, Clock, Check, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TournamentMember } from "@/types";
import {
    inviteStaff,
    getStaffs,
    removeStaff
} from "@/actions/tournaments/staff";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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

interface StaffSettingsProps {
    tournamentId: string;
    userPlan?: string;
    isPro?: boolean;
    togglePayment?: () => void;
}

export function StaffSettings({ tournamentId, togglePayment }: StaffSettingsProps) {
    const possessesStaffAccess = true;
    const t = useTranslations("StaffSettings");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [staffSettings, setStaffSettings] = useState<TournamentMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'co_organizer' | 'staff' | 'referee'>('staff');
    const [isInviting, setIsInviting] = useState(false);
    const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

    // Load staff
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const res = await getStaffs(tournamentId);
            if (res.success && res.data) {
                setStaffSettings(res.data);
            }
            setIsLoading(false);
        };
        load();
    }, [tournamentId]);

    const handleInvite = async () => {
        if (!possessesStaffAccess) return;
        if (!email.trim()) return;

        setIsInviting(true);
        const res = await inviteStaff(tournamentId, email.trim(), role);

        if (res.success && res.data) {
            setStaffSettings(prev => [...prev, res.data!]);
            setEmail("");
            setDialogOpen(false);
            toast({ title: t("invite_sent"), description: t("invite_sent_desc") });
        } else {
            toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
        }
        setIsInviting(false);
    };

    const confirmRemove = async () => {
        if (!removeMemberId || !possessesStaffAccess) return;
        const memberId = removeMemberId;
        setRemoveMemberId(null);

        startTransition(async () => {
            const res = await removeStaff(memberId, tournamentId);
            if (res.success) {
                setStaffSettings(prev => prev.filter(c => c.id !== memberId));
                toast({ title: t("removed"), description: t("removed_desc") });
            } else {
                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-1 md:space-y-2">
            <div className="flex justify-end gap-1 md:gap-2">
                <Dialog open={possessesStaffAccess && dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            disabled={!possessesStaffAccess}
                            onClick={() => {
                                if (!possessesStaffAccess) {
                                    toast({
                                        title: "ข้อจำกัดแพ็คเกจ",
                                        description: "แพ็คเกจ Match ไม่รองรับการเพิ่มทีมงานจัดแข่ง กรุณาอัปเกรดเป็นแพ็คเกจ Event หรือ Cup",
                                        variant: "destructive"
                                    });
                                    togglePayment?.();
                                }
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            {t("invite")}
                        </Button>
                    </DialogTrigger>
                    {possessesStaffAccess && (
                        <DialogContent showCloseButton={false} className="sm:max-w-[640px] bg-card overflow-hidden shadow-2xl rounded-sm">
                            <DialogHeader className="relative p-2 md:p-4 border-b pr-10">
                                <DialogTitle>{t("invite_title")}</DialogTitle>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="absolute right-2 top-2"
                                    onClick={() => setDialogOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </DialogHeader>
                            <div className="p-2 space-y-1 md:p-4 md:space-y-2">
                                <div className="space-y-1">
                                    <Label>{t("email_placeholder")}</Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t("role")}</Label>
                                    <Select value={role} onValueChange={(val: 'co_organizer' | 'staff' | 'referee') => setRole(val)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t("select_role")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="co_organizer">{t("role_co_organizer")}</SelectItem>
                                            <SelectItem value="staff">{t("role_staff")}</SelectItem>
                                            <SelectItem value="referee">{t("role_referee")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="border-t p-2 md:p-4">
                                <Button
                                    onClick={handleInvite}
                                    disabled={isInviting || !email.trim()}
                                    className="w-full"
                                >
                                    <span className="relative z-10 flex items-center gap-1 md:gap-2">
                                        {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        {t("send_invite")}
                                    </span>
                                </Button>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </div>

            <div className="relative overflow-hidden transition-colors">

                <div className="relative z-10 space-y-2 lg:space-y-4">

                    <div className={cn("space-y-2 md:space-y-4", !possessesStaffAccess && "opacity-40 grayscale pointer-events-none")}>
                        {isLoading ? (
                            null
                        ) : staffSettings.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title={t("no_staffSettings")}
                                description={t("no_staff_desc")}
                                className="py-12"
                            />
                        ) : (
                            <div className="space-y-1 md:space-y-2">
                                {staffSettings.map((collab) => (
                                    <div
                                        key={collab.id}
                                        className="flex items-center justify-between p-1 md:p-2 bg-card border rounded-sm hover:border-primary transition-colors group/item"
                                    >
                                        <div className="flex items-center gap-1 lg:gap-2">
                                            <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                <div className="w-full h-full bg-primary/5 rounded-full flex items-center justify-center">
                                                    {collab.status === 'accepted' ? (
                                                        <UserCheck className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 lg:gap-2">
                                                    <span className="text-sm font-black tracking-tight text-foreground">{collab.email}</span>
                                                </div>
                                                <div className="text-[10px] font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {collab.role === 'co_organizer' ? t("role_co_organizer") : collab.role === 'referee' ? t("role_referee") : t("role_staff")}
                                                    </Badge>
                                                    {collab.status === 'accepted' ? t("status_accepted") : t("status_pending")}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="h-8 w-8 transition-all"
                                            onClick={() => setRemoveMemberId(collab.id)}
                                            disabled={isPending}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <AlertDialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
                    <AlertDialogContent className="bg-card border lg:rounded-sm shadow-2xl max-w-md p-0">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="p-2 md:p-4 border-b">{t("remove_collaborator")}</AlertDialogTitle>
                            <AlertDialogDescription className="p-2 md:p-4">{t("confirm_remove")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                            <AlertDialogCancel className="mt-0">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmRemove();
                                }}
                                className="bg-destructive hover:bg-destructive/90 transition-all flex items-center justify-center"
                            >
                                {t("remove") || "Remove"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

