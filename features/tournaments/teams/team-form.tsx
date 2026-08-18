"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { addTeam } from "@/actions/tournaments/general";

import { LogoUploader } from "@/components/shared/logo-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { DialogFooter } from "@/components/ui/dialog";
import { ActionResponse } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function TeamForm({
    tournamentId,
    tournamentCategoryId,
    isLimitReached = false,
    onSuccess,
}: {
    tournamentId: string;
    tournamentCategoryId?: string;
    isLimitReached?: boolean;
    onSuccess?: () => void;
}) {
    const t = useTranslations("Team");
    const addTeamWithId = addTeam.bind(null, tournamentId);
    const [state, formAction] = useActionState(addTeamWithId, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const [_logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            const timer = setTimeout(() => setLogoFile(null), 0);
            onSuccess?.();
            return () => clearTimeout(timer);
        }
    }, [state.success, onSuccess]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <form
                ref={formRef}
                action={formAction}
                className="flex flex-col h-full overflow-hidden"
            >
                {tournamentCategoryId && (
                    <input type="hidden" name="tournament_category_id" value={tournamentCategoryId} />
                )}
                <div className="p-2 md:p-4 space-y-2 md:space-y-4 flex-1 overflow-y-auto">
                    {/* Logo Upload */}
                    <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="w-full flex justify-center py-1">
                            <LogoUploader
                                id="team-logo-upload"
                                name="logo"
                                disabled={isLimitReached}
                                onFileChange={(file) => setLogoFile(file)}
                            />
                        </div>
                    </div>

                    {/* Team Details */}
                    <div className="space-y-1 md:space-y-2">
                        <div className="space-y-1">
                            <Label>{t("team_name")}</Label>
                            <Input
                                type="text"
                                name="name"
                                placeholder={t("team_name_placeholder")}
                                required
                                disabled={isLimitReached}
                                className="bg-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-1 lg:gap-2">
                            <div className="space-y-1">
                                <Label>
                                    {t("contact_name") || "Contact Name"}
                                </Label>
                                <Input
                                    type="text"
                                    name="contact_name"
                                    placeholder={t("contact_name_placeholder")}
                                    disabled={isLimitReached}
                                    className="bg-transparent"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("contact_phone") || "Phone Number"}</Label>
                                <Input
                                    type="text"
                                    name="contact_phone"
                                    placeholder={t("contact_phone_placeholder")}
                                    disabled={isLimitReached}
                                    className="bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("contact_email") || "Email Address"}</Label>
                            <Input
                                type="email"
                                name="contact_email"
                                placeholder={t("contact_email_placeholder")}
                                disabled={isLimitReached}
                                className="bg-transparent"
                            />
                        </div>

                        {state.error && <p className="text-[10px] font-bold text-destructive tracking-widest">{state.error}</p>}

                    </div>
                </div>
                <DialogFooter className="border-t p-2 md:p-4 shrink-0">
                    <SubmitButton disabled={isLimitReached} className="w-full">{t("add_team_button")}</SubmitButton>
                </DialogFooter>
            </form>

            {isLimitReached && (
                <div className="mt-6 p-2 bg-destructive/10 border-l-2 border-destructive">
                    <p className="text-[10px] font-bold text-destructive leading-tight tracking-widest">
                        {t("limit_reached_desc")}
                    </p>
                </div>
            )}
        </div>
    );
}
