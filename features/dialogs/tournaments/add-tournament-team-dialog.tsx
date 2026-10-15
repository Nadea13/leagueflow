"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { addTeam } from "@/actions/tournaments/general";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ActionResponse } from "@/types/index";
import { Plus, Camera, Shield, User, Phone, Mail } from "lucide-react";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface AddTournamentTeamDialogProps {
    tournamentId: string;
    tournamentCategoryId?: string;
    isLimitReached?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function AddTournamentTeamDialog({
    tournamentId,
    tournamentCategoryId,
    isLimitReached = false,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    trigger,
}: AddTournamentTeamDialogProps) {
    const t = useTranslations("Team");
    const locale = useLocale();
    const isThai = locale === "th";

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

    const addTeamWithId = addTeam.bind(null, tournamentId);
    const [state, formAction] = useActionState(addTeamWithId, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [_logoFile, setLogoFile] = useState<File | null>(null);

    // Scroll to top when dialog opens
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [open]);

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            const timer = setTimeout(() => setLogoFile(null), 0);
            setOpen(false);
            onSuccess?.();
            return () => clearTimeout(timer);
        }
    }, [state.success, onSuccess]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== undefined ? (
                trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                        {t("add_team_button") || (isThai ? "เพิ่มทีม" : "Add Team")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[760px] sm:max-h-[88vh] p-0 flex flex-col overflow-hidden">
                <form
                    ref={formRef}
                    action={formAction}
                    className="flex flex-col h-full overflow-hidden"
                >
                    <DialogHeader className="p-4 border-b shrink-0 bg-card">
                        <DialogTitle asChild>
                            <Header level={4}>
                                {t("add_team") || (isThai ? "เพิ่มทีมใหม่" : "Add New Team")}
                            </Header>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            {isThai
                                ? "กรอกข้อมูลรายละเอียดของทีมที่ต้องการเพิ่มเข้าสู่การแข่งขัน"
                                : "Enter the team details to add to this tournament."}
                        </DialogDescription>
                    </DialogHeader>

                    {tournamentCategoryId && (
                        <input type="hidden" name="tournament_category_id" value={tournamentCategoryId} />
                    )}

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 min-h-0 overflow-y-auto p-4"
                    >
                        {/* 1. Team Logo */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <Camera className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("upload_logo") || (isThai ? "รูปตราสัญลักษณ์" : "Team Crest / Logo")}
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "รูปภาพตราสัญลักษณ์ประจำทีมของคุณ" : "Official crest or logo image for your team"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 flex flex-col items-start gap-1">
                                <LogoUploader
                                    id="tournament-team-logo-upload"
                                    name="logo"
                                    disabled={isLimitReached}
                                    onFileChange={(file) => setLogoFile(file)}
                                />
                            </div>
                        </div>

                        {/* 2. Team Name */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <Shield className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("team_name")} <span className="text-destructive">*</span>
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "ชื่อที่จะแสดงผลในตารางแข่งขันและสถิติต่างๆ" : "Display name in fixtures, brackets, and standings"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    type="text"
                                    name="name"
                                    size="sm"
                                    placeholder={t("team_name_placeholder")}
                                    required
                                    disabled={isLimitReached}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 3. Contact Name */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <User className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("contact_name") || (isThai ? "ชื่อผู้ติดต่อ" : "Contact Name")}
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "ชื่อผู้จัดการทีมหรือตัวแทนผู้ประสานงาน" : "Team manager or coordinator name"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    type="text"
                                    name="contact_name"
                                    size="sm"
                                    placeholder={t("contact_name_placeholder")}
                                    disabled={isLimitReached}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 4. Contact Phone */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <Phone className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("contact_phone") || (isThai ? "เบอร์โทรศัพท์" : "Phone Number")}
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "เบอร์โทรศัพท์สำหรับติดต่อประสานงาน" : "Primary contact phone number"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    type="text"
                                    name="contact_phone"
                                    size="sm"
                                    placeholder={t("contact_phone_placeholder")}
                                    disabled={isLimitReached}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 5. Contact Email */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <Mail className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {t("contact_email") || (isThai ? "อีเมล" : "Email Address")}
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "อีเมลสำหรับรับเอกสารและการแจ้งเตือน" : "Contact email for notifications and documents"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    type="email"
                                    name="contact_email"
                                    size="sm"
                                    placeholder={t("contact_email_placeholder")}
                                    disabled={isLimitReached}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {state.error && (
                            <div className="mx-4 text-xs font-medium text-destructive bg-destructive/10 rounded-sm border border-destructive/20 p-2.5">
                                {state.error}
                            </div>
                        )}

                        {isLimitReached && (
                            <div className="mx-4 p-3 bg-destructive/10 border border-destructive/20 rounded-sm">
                                <p className="text-xs font-semibold text-destructive">
                                    {t("limit_reached_desc")}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <SubmitButton disabled={isLimitReached} className="h-8 px-3 text-xs">
                            {t("add_team_button") || (isThai ? "เพิ่มทีม" : "Add Team")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
