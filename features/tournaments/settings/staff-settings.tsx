"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/ui/header";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, ShieldCheck, UserCog, Award, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TournamentMember } from "@/types";
import {
    getStaffs,
    updateStaffRole,
    removeStaff
} from "@/actions/tournaments/staff";
import { InviteStaffDialog } from "@/features/dialogs";
import { RadioBtn } from "@/components/ui/radio-btn";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    className?: string;
}

export function StaffSettings({ tournamentId, togglePayment, className }: StaffSettingsProps) {
    const possessesStaffAccess = true;
    const t = useTranslations("StaffSettings");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const [staffSettings, setStaffSettings] = useState<TournamentMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

    // Edit Role State
    const [editingMember, setEditingMember] = useState<TournamentMember | null>(null);
    const [editRole, setEditRole] = useState<'co_organizer' | 'staff' | 'referee'>('staff');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const editRoleScrollRef = useRef<HTMLDivElement>(null);

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
        <div className={cn("space-y-4", className)}>
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Header level={4}>
                        {isThai ? "ทีมงานจัดการแข่งขัน" : (t("title") || "Tournament Staff")}
                    </Header>
                    <p className="text-xs text-muted-foreground">
                        {isThai
                            ? "จัดการทีมงาน สิทธิ์การเข้าถึง และบทบาทในการช่วยบริหารจัดการทัวร์นาเมนต์"
                            : "Manage tournament staff members, permissions, and roles."}
                    </p>
                </div>
                <InviteStaffDialog
                    tournamentId={tournamentId}
                    disabled={!possessesStaffAccess}
                    onUpgrade={togglePayment}
                    onSuccess={(newMember) => {
                        if (newMember) {
                            setStaffSettings(prev => [...prev, newMember]);
                        }
                    }}
                />
            </div>

            <div className={cn("space-y-2 md:space-y-4", !possessesStaffAccess && "opacity-40 grayscale pointer-events-none")}>
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
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
                                    <RadioBtn
                                        value={editRole}
                                        onChange={(val) => setEditRole(val as 'co_organizer' | 'staff' | 'referee')}
                                        options={[
                                            { id: 'co_organizer', label: t("role_co_organizer"), icon: <ShieldCheck className="h-4 w-4" /> },
                                            { id: 'staff', label: t("role_staff"), icon: <UserCog className="h-4 w-4" /> },
                                            { id: 'referee', label: t("role_referee"), icon: <Award className="h-4 w-4" /> },
                                        ]}
                                        disabled={isUpdatingRole}
                                        className="w-full"
                                    />
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
                    <AlertDialogContent className="sm:max-w-[760px] h-auto sm:h-auto max-h-[88vh] overflow-hidden flex flex-col bg-card border rounded-none sm:rounded-sm shadow-2xl p-0">
                        <AlertDialogHeader className="p-4 sm:px-6 sm:py-4 border-b shrink-0 bg-card">
                            <AlertDialogTitle asChild>
                                <Header level={4} className="text-destructive">
                                    {t("remove_collaborator")}
                                </Header>
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {t("confirm_remove")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                            <AlertDialogCancel className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-0")}>
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmRemove();
                                }}
                                className={cn(buttonVariants({ size: "sm", variant: "destructive" }))}
                            >
                                {t("remove") || "Remove"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
        </div>
    );
}


