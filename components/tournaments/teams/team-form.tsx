"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Upload, Check, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { addTeam } from "@/actions/organizer/tournaments/general";
import { Link } from "@/i18n/routing";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ActionResponse } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function TeamForm({ tournamentId, isLimitReached = false, onSuccess }: { tournamentId: string; isLimitReached?: boolean; onSuccess?: () => void }) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const tDialog = useTranslations("Dialog");
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
                className="space-y-2 md:space-y-3"
            >
                {/* Logo Upload */}
                <div className="space-y-1">
                    <Label htmlFor="add-logo-upload" className="text-xs font-black tracking-widest text-primary">
                        {t("team_logo")}
                    </Label>
                    <div className={`flex items-start gap-2 md:gap-3 p-2 md:p-3 border ${isLimitReached ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="relative group">
                            <div className="h-20 w-20 flex items-center justify-center border-2 border-dashed border-border overflow-hidden bg-muted/5">
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        width={80}
                                        height={80}
                                        className="h-full w-full object-contain p-1"
                                    />
                                ) : (
                                    <Upload className="h-8 w-8 text-muted-foreground/30" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex gap-2">
                                <Label
                                    htmlFor="add-logo-upload"
                                    className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 bg-muted/20 hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
                                >
                                    {preview ? t("click_to_upload") : t("upload_logo")}
                                </Label>
                                {preview && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 rounded-none border"
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
                            <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-tighter">PNG, JPG up to 2MB</p>
                        </div>
                    </div>
                </div>

                {/* Team Details */}
                <div className="space-y-2 md:space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs font-black tracking-widest text-primary">
                            {t("team_name")}
                        </Label>
                        <Input
                            type="text"
                            name="name"
                            placeholder={isLimitReached ? t("limit_reached") : t("team_name_placeholder")}
                            required
                            disabled={isLimitReached}
                            className="bg-transparent"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs font-black tracking-widest text-primary">
                            {tCommon("sport")}
                        </Label>
                        <Select name="sport" defaultValue="football">
                            <SelectTrigger className="bg-transparent w-full">
                                <SelectValue placeholder={tDialog("select_sport")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-border">
                                {['football'].map((sportKey) => (
                                    <SelectItem key={sportKey} value={sportKey} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {tSports(sportKey)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs font-black tracking-widest text-primary">
                            {t("team_description") || "Team Description"}
                        </Label>
                        <Textarea
                            name="description"
                            placeholder={t("team_description_placeholder")}
                            disabled={isLimitReached}
                            className="bg-transparent resize-none min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-black tracking-widest text-primary">
                                {t("contact_name") || "Contact Name"}
                            </Label>
                            <Input
                                type="text"
                                name="contact_name"
                                placeholder={t("contact_name_placeholder") || "Manager Name"}
                                disabled={isLimitReached}
                                className="bg-transparent"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-black tracking-widest text-primary">
                                {t("contact_phone") || "Phone Number"}
                            </Label>
                            <Input
                                type="text"
                                name="contact_phone"
                                placeholder={t("contact_phone_placeholder") || "08x-xxx-xxxx"}
                                disabled={isLimitReached}
                                className="bg-transparent"
                            />
                        </div>
                    </div>

                    {state.error && <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">{state.error}</p>}

                    <div className="flex justify-end">
                        <SubmitButton
                            disabled={isLimitReached}
                            className="w-full"
                        >
                            <Check className="h-4 w-4" />
                            {t("add_team_button")}
                        </SubmitButton>
                    </div>
                </div>
            </form>

            {isLimitReached && (
                <div className="mt-6 p-3 bg-destructive/10 border-l-2 border-destructive">
                    <p className="text-[10px] font-bold text-destructive leading-tight uppercase tracking-widest">
                        {t.rich("limit_reached_desc", {
                            link: (chunks) => <Link href="/dashboard/billing" className="underline font-black">{chunks}</Link>
                        })}
                    </p>
                </div>
            )}
        </div>
    );
}
