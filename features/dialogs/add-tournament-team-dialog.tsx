"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { addTeam } from "@/actions/tournaments/general";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus } from "lucide-react";

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
            <DialogContent className="sm:max-w-[540px]">
                <form
                    ref={formRef}
                    action={formAction}
                    className="flex flex-col h-full overflow-hidden"
                >
                    <DialogHeader>
                        <DialogTitle>
                            {t("add_team") || (isThai ? "เพิ่มทีมใหม่" : "Add New Team")}
                        </DialogTitle>
                        <DialogDescription>
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
                        className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0"
                    >
                        {/* Logo Upload */}
                        <div className="flex flex-col items-center justify-center">
                            <LogoUploader
                                id="tournament-team-logo-upload"
                                name="logo"
                                disabled={isLimitReached}
                                onFileChange={(file) => setLogoFile(file)}
                            />
                        </div>

                        {/* Team Details */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label>
                                    {t("team_name")} <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    name="name"
                                    size="sm"
                                    placeholder={t("team_name_placeholder")}
                                    required
                                    disabled={isLimitReached}
                                    className="bg-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>
                                        {t("contact_name") || (isThai ? "ชื่อผู้ติดต่อ" : "Contact Name")}
                                    </Label>
                                    <Input
                                        type="text"
                                        name="contact_name"
                                        size="sm"
                                        placeholder={t("contact_name_placeholder")}
                                        disabled={isLimitReached}
                                        className="bg-transparent"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>
                                        {t("contact_phone") || (isThai ? "เบอร์โทรศัพท์" : "Phone Number")}
                                    </Label>
                                    <Input
                                        type="text"
                                        name="contact_phone"
                                        size="sm"
                                        placeholder={t("contact_phone_placeholder")}
                                        disabled={isLimitReached}
                                        className="bg-transparent"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>
                                    {t("contact_email") || (isThai ? "อีเมล" : "Email Address")}
                                </Label>
                                <Input
                                    type="email"
                                    name="contact_email"
                                    size="sm"
                                    placeholder={t("contact_email_placeholder")}
                                    disabled={isLimitReached}
                                    className="bg-transparent"
                                />
                            </div>

                            {state.error && (
                                <p className="text-xs font-bold text-destructive">
                                    {state.error}
                                </p>
                            )}

                            {isLimitReached && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm">
                                    <p className="text-xs font-semibold text-destructive">
                                        {t("limit_reached_desc")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <SubmitButton disabled={isLimitReached}>
                            {t("add_team_button") || (isThai ? "เพิ่มทีม" : "Add Team")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
