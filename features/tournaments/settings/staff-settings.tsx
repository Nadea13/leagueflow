"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Mail, Loader2, UserCheck, Clock, Check } from "lucide-react";
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
    isPro?: boolean;
    togglePayment?: () => void;
}

export function StaffSettings({ tournamentId, togglePayment }: Omit<StaffSettingsProps, 'isPro'>) {
    const isPro = true; // Pro locks removed for all
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
        if (!isPro) return;
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
        if (!removeMemberId || !isPro) return;
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
        <div className="space-y-2 md:space-y-4">
            <div className="flex justify-end gap-2 md:gap-4">
                <Dialog open={isPro && dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            disabled={!isPro}
                            onClick={() => !isPro && togglePayment?.()}
                        >
                            <Plus className="h-4 w-4" />
                            {t("invite")}
                        </Button>
                    </DialogTrigger>
                    {isPro && (
                        <DialogContent className="sm:max-w-[500px] bg-card border shadow-2xl p-4 md:p-6 overflow-hidden space-y-4 md:space-y-6">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                                    <Mail className="h-6 w-6 text-primary" />
                                    {t("invite_title")}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 md:space-y-6">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black tracking-widest text-primary/70">{t("email_placeholder")}</Label>
                                    <Input
                                        type="email"
                                        placeholder="collaborator@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                        className="bg-foreground/5 border-foreground/10 focus:border-primary/50 focus:ring-0 transition-all h-12"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black tracking-widest text-primary/70">Role</Label>
                                    <Select value={role} onValueChange={(val: 'co_organizer' | 'staff' | 'referee') => setRole(val)}>
                                        <SelectTrigger className="w-full bg-foreground/5 border-foreground/10 focus:border-primary/50 transition-all h-12 text-left flex justify-between px-3">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border shadow-2xl">
                                            <SelectItem value="co_organizer">Co-Organizer</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="referee">Referee</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2 md:gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setDialogOpen(false)}
                                        className="h-12 border-foreground/10 font-black tracking-tighter px-4 md:px-6 hover:bg-foreground/5"
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        onClick={handleInvite}
                                        disabled={isInviting || !email.trim()}
                                        className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-black tracking-tighter transition-all relative group/save overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover/save:translate-y-0 transition-transform duration-300" />
                                        <span className="relative z-10 flex items-center gap-2">
                                            {isInviting ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Check className="h-4 w-4" />}
                                            {t("send_invite")}
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </div>

            <div className="relative overflow-hidden transition-colors">

                <div className="relative z-10 space-y-4 md:space-y-6">

                    {!isPro && (
                        <div className="p-2 md:p-3 bg-primary/[0.03] border border-primary/10 relative overflow-hidden group/upsell">
                            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black tracking-[0.2em] text-primary/80">{t("title")} (PRO)</h4>
                                    <p className="text-xs font-medium text-muted-foreground/60 max-w-sm">
                                        {t("upgrade_desc") || "Collaborate with your team to manage this tournament."}
                                    </p>
                                </div>
                                <Button
                                    onClick={togglePayment}
                                    className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-black tracking-tighter transition-all relative group/upbtn overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover/upbtn:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        {tCommon("upgrade_to_pro")}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className={cn("space-y-2 md:space-y-3", !isPro && "opacity-40 grayscale pointer-events-none")}>
                        {isLoading ? (
                            null
                        ) : staffSettings.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title={t("no_staffSettings")}
                                description="Invite team members to help manage the tournament"
                                className="py-12"
                            />
                        ) : (
                            <div className="space-y-2 md:space-y-4">
                                {staffSettings.map((collab) => (
                                    <div
                                        key={collab.id}
                                        className="flex items-center justify-between p-2 md:p-4 bg-card border rounded-lg hover:border-primary transition-colors group/item"
                                    >
                                        <div className="flex items-center gap-2 md:gap-4">
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
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black tracking-tight text-foreground">{collab.email}</span>
                                                    <Badge variant="outline" className="w-fit text-[10px] px-2 py-0.5 text-primary font-black shrink-0  border-primary/20 bg-primary/5 rounded">
                                                        {collab.role?.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/40">
                                                    {collab.status === 'accepted' ? t("status_accepted") : t("status_pending")}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-red-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            onClick={() => setRemoveMemberId(collab.id)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <AlertDialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
                    <AlertDialogContent className="bg-card shadow-2xl max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-destructive" />
                                {t("remove_collaborator") || "Remove Collaborator"}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                {t("confirm_remove")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmRemove();
                                }}
                                className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {t("remove") || "Remove"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

