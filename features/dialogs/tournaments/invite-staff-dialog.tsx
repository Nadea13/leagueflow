"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { inviteStaff } from "@/actions/tournaments/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/ui/header";
import { RadioBtn } from "@/components/ui/radio-btn";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TournamentMember } from "@/types";
import { Plus, Mail, ShieldCheck, UserCog, Award, Loader2 } from "lucide-react";

interface InviteStaffDialogProps {
    tournamentId: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: (newMember?: TournamentMember) => void;
    trigger?: React.ReactNode;
    disabled?: boolean;
    onUpgrade?: () => void;
}

export function InviteStaffDialog({
    tournamentId,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    trigger,
    disabled = false,
    onUpgrade,
}: InviteStaffDialogProps) {
    const t = useTranslations("StaffSettings");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = (val: boolean) => {
        if (isControlled) {
            controlledOnOpenChange?.(val);
        } else {
            setUncontrolledOpen(val);
        }
    };

    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'co_organizer' | 'staff' | 'referee'>('staff');
    const [isInviting, setIsInviting] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setEmail("");
            setRole("staff");
        }
    }, [open]);

    const handleTriggerClick = (e: React.MouseEvent) => {
        if (disabled) {
            e.preventDefault();
            toast({
                title: isThai ? "ข้อจำกัดแพ็คเกจ" : "Plan Limitation",
                description: isThai
                    ? "แพ็คเกจปัจจุบันไม่รองรับการเพิ่มทีมงานจัดแข่ง กรุณาอัปเกรดแพ็คเกจ"
                    : "Your current plan does not support adding tournament staff. Please upgrade your plan.",
                variant: "destructive",
            });
            onUpgrade?.();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        if (!trimmedEmail) return;

        setIsInviting(true);
        try {
            const res = await inviteStaff(tournamentId, trimmedEmail, role);
            if (res.success && res.data) {
                toast({
                    title: t("invite_sent"),
                    description: t("invite_sent_desc"),
                });
                setEmail("");
                setRole("staff");
                setOpen(false);
                onSuccess?.(res.data);
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error || (isThai ? "ไม่สามารถส่งคำเชิญได้" : "Failed to send invitation"),
                    variant: "destructive",
                });
            }
        } catch (error: unknown) {
            toast({
                title: tCommon("error"),
                description: error instanceof Error ? error.message : "Unexpected error",
                variant: "destructive",
            });
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== undefined ? (
                trigger ? (
                    <DialogTrigger asChild onClick={handleTriggerClick}>
                        {trigger}
                    </DialogTrigger>
                ) : null
            ) : (
                <DialogTrigger asChild onClick={handleTriggerClick}>
                    <Button size="sm" disabled={disabled}>
                        <Plus className="h-4 w-4" />
                        {t("invite")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[760px] sm:max-h-[88vh] p-0 flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="p-4 border-b shrink-0 bg-card">
                        <DialogTitle asChild>
                            <Header level={4}>
                                {t("invite_title")}
                            </Header>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            {isThai
                                ? "ส่งคำเชิญเพื่อเพิ่มผู้ร่วมจัด ผู้ตัดสิน หรือทีมงานเข้ามาช่วยจัดการแข่งขันนี้"
                                : "Invite co-organizers, referees, or staff to help manage this tournament."}
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 min-h-0 overflow-y-auto p-4"
                    >
                        {/* 1. Email Address */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <Mail className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("email_address")} <span className="text-destructive">*</span>
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "อีเมลของผู้ใช้ที่ต้องการเชิญมาร่วมจัดการแข่งขัน" : "Email of the person you want to invite"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    id="staff-email"
                                    type="email"
                                    size="sm"
                                    value={email}
                                    disabled={isInviting}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("email_input_placeholder")}
                                    required
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 2. Role Selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("role")} <span className="text-destructive">*</span>
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "กำหนดสิทธิ์และความรับผิดชอบของทีมงาน" : "Permission level and role responsibilities"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <RadioBtn
                                    value={role}
                                    onChange={(val) => setRole(val as 'co_organizer' | 'staff' | 'referee')}
                                    options={[
                                        { id: 'co_organizer', label: t("role_co_organizer"), icon: <ShieldCheck className="h-4 w-4" /> },
                                        { id: 'staff', label: t("role_staff"), icon: <UserCog className="h-4 w-4" /> },
                                        { id: 'referee', label: t("role_referee"), icon: <Award className="h-4 w-4" /> },
                                    ]}
                                    disabled={isInviting}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                            disabled={isInviting}
                        >
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isInviting || !email.trim()}
                        >
                            {isInviting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    {isThai ? "กำลังส่งคำเชิญ..." : "Sending..."}
                                </>
                            ) : (
                                t("send_invite")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
