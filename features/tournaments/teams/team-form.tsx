"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { addTeam } from "@/actions/tournaments/general";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState("");

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            const timer = setTimeout(() => setPreview(""), 0);
            onSuccess?.();
            return () => clearTimeout(timer);
        }
    }, [state.success, onSuccess]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        } else {
            setPreview("");
        }
    };

    const handleRemoveLogo = () => {
        setPreview("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div>
            <form
                ref={formRef}
                action={formAction}
            >
                {tournamentCategoryId && (
                    <input type="hidden" name="tournament_category_id" value={tournamentCategoryId} />
                )}
                <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                    {/* Logo Upload */}
                    <div className="space-y-1">
                        <Label>
                            {t("team_logo")}
                        </Label>
                        <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg border">
                            <div className="relative group">
                                <div className="h-20 w-20 flex items-center justify-center rounded-sm border-2 border-dashed border-border overflow-hidden">
                                    {preview ? (
                                        <Image
                                            src={preview}
                                            alt="Preview"
                                            width={80}
                                            height={80}
                                            className="h-full w-full object-cover p-1 rounded-sm"
                                        />
                                    ) : (
                                        <Upload className="h-8 w-8 text-primary" />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex gap-2">
                                    <Label
                                        htmlFor="add-logo-upload"
                                        className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 rounded-sm hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
                                    >
                                        {preview ? t("click_to_upload") : t("upload_logo")}
                                    </Label>
                                    {preview && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                                            onClick={handleRemoveLogo}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    id="add-logo-upload"
                                    type="file"
                                    name="logo"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={isLimitReached}
                                />
                                <p className="text-[10px] text-muted-foreground/50 mt-1">PNG, JPG, max 2MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Team Details */}
                    <div className="space-y-2 md:space-y-3">
                        <div className="space-y-1">
                            <Label>{t("team_name")}</Label>
                            <Input
                                type="text"
                                name="name"
                                required
                                disabled={isLimitReached}
                                className="bg-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>
                                    {t("contact_name") || "Contact Name"}
                                </Label>
                                <Input
                                    type="text"
                                    name="contact_name"
                                    disabled={isLimitReached}
                                    className="bg-transparent"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("contact_phone") || "Phone Number"}</Label>
                                <Input
                                    type="text"
                                    name="contact_phone"
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
                                disabled={isLimitReached}
                                className="bg-transparent"
                            />
                        </div>

                        {state.error && <p className="text-[10px] font-bold text-destructive tracking-widest">{state.error}</p>}

                    </div>
                </div>
                <DialogFooter className="border-t p-2 md:p-4">
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
