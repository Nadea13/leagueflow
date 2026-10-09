"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, ShieldCheck, UserCog, Award, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TournamentMember } from "@/types";
import {
    inviteStaff,
    getStaffs,
    updateStaffRole,
    removeStaff
} from "@/actions/tournaments/staff";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    ActionMenu,
    ActionMenuContent,
    ActionMenuItem,
    ActionMenuTrigger,
} from "@/components/ui/action-menu";
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

    // Edit Role State
    const [editingMember, setEditingMember] = useState<TournamentMember | null>(null);
    const [editRole, setEditRole] = useState<'co_organizer' | 'staff' | 'referee'>('staff');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const inviteScrollRef = useRef<HTMLDivElement>(null);
    const editRoleScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (dialogOpen && inviteScrollRef.current) {
            inviteScrollRef.current.scrollTop = 0;
        }
    }, [dialogOpen]);

    useEffect(() => {
        if (editingMember && editRoleScrollRef.current) {
            editRoleScrollRef.current.scrollTop = 0;
        }
    }, [editingMember]);

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

    const handleEditRoleClick = (member: TournamentMember) => {
        setEditingMember(member);
        setEditRole((member.role as 'co_organizer' | 'staff' | 'referee') || 'staff');
    };

    const handleUpdateRoleSubmit = async () => {
        if (!editingMember || !possessesStaffAccess) return;
        setIsUpdatingRole(true);
        const res = await updateStaffRole(editingMember.id, tournamentId, editRole);
        if (res.success) {
            setStaffSettings(prev => prev.map(m => m.id === editingMember.id ? { ...m, role: editRole } : m));
            setEditingMember(null);
            toast({ title: t("role_updated"), description: t("role_updated_desc") });
        } else {
            toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
        }
        setIsUpdatingRole(false);
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
                            size="sm"
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
                        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
                            <DialogHeader className="p-4 border-b shrink-0">
                                <DialogTitle>{t("invite_title")}</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleInvite();
                                }}
                                className="flex flex-col flex-1 min-h-0"
                            >
                                <div ref={inviteScrollRef} className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">{t("email_address")} <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder={t("email_input_placeholder")}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>{t("role")}</Label>
                                        <div className="grid grid-cols-3 border bg-card rounded-sm divide-x overflow-hidden">
                                            {[
                                                { id: 'co_organizer', label: t("role_co_organizer"), icon: <ShieldCheck className="h-4 w-4" /> },
                                                { id: 'staff', label: t("role_staff"), icon: <UserCog className="h-4 w-4" /> },
                                                { id: 'referee', label: t("role_referee"), icon: <Award className="h-4 w-4" /> },
                                            ].map((item) => {
                                                const isSelected = role === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setRole(item.id as 'co_organizer' | 'staff' | 'referee')}
                                                        className={cn(
                                                            "group flex flex-col items-center justify-center p-2.5 text-center transition-all cursor-pointer gap-1.5",
                                                            isSelected
                                                                ? "bg-primary/10 text-primary font-bold"
                                                                : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "p-1.5 rounded-full transition-colors",
                                                            isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                        )}>
                                                            {item.icon}
                                                        </div>
                                                        <span className="text-xs font-bold truncate w-full transition-colors">
                                                            {item.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="border-t p-4 shrink-0 flex items-center justify-end gap-2 bg-muted/20">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        disabled={isInviting}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isInviting || !email.trim()}
                                    >
                                        {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {t("send_invite")}
                                    </Button>
                                </DialogFooter>
                            </form>
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
                            <div className="border bg-card rounded-sm divide-y divide-border overflow-hidden">
                                {staffSettings.map((collab) => {
                                    const isOwner = collab.role === 'owner';
                                    const displayName = collab.full_name || collab.email || "User";
                                    const fallbackInitials = (collab.full_name?.slice(0, 2) || collab.email?.slice(0, 2) || "U").toUpperCase();

                                    return (
                                        <div
                                            key={collab.id}
                                            className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group/item"
                                        >
                                            <div className="flex items-center gap-1 lg:gap-2">
                                                <div className="h-10 w-10 border rounded-full group-hover/item:border-primary/30 transition-all shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                                    <Avatar className="h-full w-full rounded-full overflow-hidden">
                                                        {collab.avatar_url ? (
                                                            <AvatarImage src={collab.avatar_url} alt={displayName} className="object-cover" />
                                                        ) : null}
                                                        <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary">
                                                            {fallbackInitials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold tracking-tight text-foreground">
                                                            {collab.full_name ? `${collab.full_name}` : collab.email}
                                                        </span>
                                                        {collab.full_name && collab.email && (
                                                            <span className="text-xs text-muted-foreground">
                                                                ({collab.email})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        <Badge
                                                            variant="outline"
                                                        >
                                                            {isOwner
                                                                ? (t("role_owner") || "เจ้าของ")
                                                                : collab.role === 'co_organizer'
                                                                    ? t("role_co_organizer")
                                                                    : collab.role === 'referee'
                                                                        ? t("role_referee")
                                                                        : t("role_staff")}
                                                        </Badge>
                                                        <span>
                                                            {isOwner
                                                                ? t("status_accepted")
                                                                : collab.status === 'accepted'
                                                                    ? t("status_accepted")
                                                                    : t("status_pending")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {!isOwner && (
                                                <ActionMenu>
                                                    <ActionMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="text-muted-foreground hover:text-foreground shrink-0"
                                                            disabled={isPending}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </ActionMenuTrigger>
                                                    <ActionMenuContent align="end" className="w-36 bg-card shadow-xl">
                                                        <ActionMenuItem
                                                            className="cursor-pointer text-xs flex items-center gap-2"
                                                            onClick={() => handleEditRoleClick(collab)}
                                                        >
                                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                                            <span>{t("edit_role")}</span>
                                                        </ActionMenuItem>
                                                        <ActionMenuItem
                                                            className="cursor-pointer text-xs flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                                            onClick={() => setRemoveMemberId(collab.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span>{tCommon("delete")}</span>
                                                        </ActionMenuItem>
                                                    </ActionMenuContent>
                                                </ActionMenu>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Role Dialog */}
                <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
                    <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
                        <DialogHeader className="p-4 border-b shrink-0">
                            <DialogTitle>{t("edit_role_title")}</DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleUpdateRoleSubmit();
                            }}
                            className="flex flex-col flex-1 min-h-0"
                        >
                            <div ref={editRoleScrollRef} className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                                <div className="flex items-center gap-3 p-3 border rounded-sm bg-muted/20">
                                    <div className="h-10 w-10 border rounded-full shrink-0 p-1 bg-muted/30 flex items-center justify-center">
                                        <Avatar className="h-full w-full rounded-full overflow-hidden">
                                            {editingMember?.avatar_url ? (
                                                <AvatarImage src={editingMember.avatar_url} alt={editingMember.full_name || editingMember.email || "Staff"} className="object-cover" />
                                            ) : null}
                                            <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary">
                                                {(editingMember?.full_name?.slice(0, 2) || editingMember?.email?.slice(0, 2) || "U").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate text-foreground">
                                            {editingMember?.full_name || editingMember?.email}
                                        </p>
                                        {editingMember?.full_name && editingMember?.email && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {editingMember.email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>{t("role")}</Label>
                                    <div className="grid grid-cols-3 border bg-card rounded-sm divide-x overflow-hidden">
                                        {[
                                            { id: 'co_organizer', label: t("role_co_organizer"), icon: <ShieldCheck className="h-4 w-4" /> },
                                            { id: 'staff', label: t("role_staff"), icon: <UserCog className="h-4 w-4" /> },
                                            { id: 'referee', label: t("role_referee"), icon: <Award className="h-4 w-4" /> },
                                        ].map((item) => {
                                            const isSelected = editRole === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setEditRole(item.id as 'co_organizer' | 'staff' | 'referee')}
                                                    className={cn(
                                                        "group flex flex-col items-center justify-center p-2.5 text-center transition-all cursor-pointer gap-1.5",
                                                        isSelected
                                                            ? "bg-primary/10 text-primary font-bold"
                                                            : "hover:bg-muted/30 text-muted-foreground hover:text-primary"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "p-1.5 rounded-full transition-colors",
                                                        isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                    )}>
                                                        {item.icon}
                                                    </div>
                                                    <span className="text-xs font-bold truncate w-full transition-colors">
                                                        {item.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="border-t p-4 shrink-0 flex items-center justify-end gap-2 bg-muted/20">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingMember(null)}
                                    disabled={isUpdatingRole}
                                >
                                    {tCommon("cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isUpdatingRole}
                                >
                                    {isUpdatingRole && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t("save_role")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
                    <AlertDialogContent className="bg-card border lg:rounded-sm shadow-2xl max-w-md p-0">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="p-2 md:p-4 border-b">{t("remove_collaborator")}</AlertDialogTitle>
                            <AlertDialogDescription className="p-2 md:p-4">{t("confirm_remove")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                            <AlertDialogCancel className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-0")}>
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmRemove();
                                }}
                                className={cn(buttonVariants({ size: "sm", variant: "destructive" }), "flex items-center justify-center")}
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


