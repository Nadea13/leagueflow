"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Camera, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { addTeam } from "@/actions/organizer/tournaments/general";
import { Link } from "@/i18n/routing";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function AddTeamForm({ tournamentId, isLimitReached = false }: { tournamentId: string; isLimitReached?: boolean }) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const tDialog = useTranslations("Dialog");
    const addTeamWithId = addTeam.bind(null, tournamentId);
    const [state, formAction] = useActionState(addTeamWithId, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const [preview, setPreview] = useState("");

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            // Wrap in a timeout to avoid synchronous cascading renders warning
            const timer = setTimeout(() => setPreview(""), 0);
            return () => clearTimeout(timer);
        }
    }, [state.success]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        } else {
            setPreview("");
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <form
                ref={formRef}
                action={formAction}
                className="flex flex-col gap-2 md:gap-3"
            >
                <div className="flex flex-col gap-2 md:gap-3">
                    {/* Circular Logo Upload */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <label htmlFor="add-logo-upload" className={`cursor-pointer group relative shrink-0 ${isLimitReached ? 'pointer-events-none opacity-50' : ''}`}>
                            <div className="h-16 w-16 rounded-none border border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-foreground/5 hover:bg-foreground/10 transition-colors relative">
                                {preview ? (
                                    <Image src={preview} alt="Preview" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 opacity-40">
                                        <Camera className="h-5 w-5" />
                                        <span className="text-[8px] font-bold uppercase tracking-tighter">Logo</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="h-4 w-4 text-primary" />
                                </div>
                            </div>
                            <Input
                                id="add-logo-upload"
                                type="file"
                                name="logo"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isLimitReached}
                            />
                        </label>
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("team_logo")}</Label>
                            <p className="text-[9px] text-muted-foreground">PNG, JPG up to 2MB</p>
                        </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("team_name")}</Label>
                            <Input
                                type="text"
                                name="name"
                                placeholder={isLimitReached ? t("limit_reached") : t("team_name_placeholder")}
                                required
                                className="h-12 bg-foreground/5 border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-bold uppercase tracking-tighter"
                                disabled={isLimitReached}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{tCommon("sport")}</Label>
                            <Select name="sport" defaultValue="football">
                                <SelectTrigger className="h-12 bg-foreground/5 border-none rounded-none focus:ring-0 px-3 font-bold uppercase tracking-tighter text-left">
                                    <SelectValue placeholder={tDialog("select_sport")} />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-border">
                                    {['football'].map((sportKey) => (
                                        <SelectItem key={sportKey} value={sportKey} className="focus:bg-secondary/10 focus:text-secondary uppercase font-bold text-xs tracking-tighter">
                                            {tSports(sportKey)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("team_description") || "Team Description"}</Label>
                            <Textarea
                                name="description"
                                placeholder={t("no_description") || "No description"}
                                className="min-h-[80px] bg-foreground/5 border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium text-sm"
                                disabled={isLimitReached}
                            />
                        </div>

                        <SubmitButton disabled={isLimitReached} className="w-full h-12 rounded-none bg-secondary text-secondary-foreground font-black uppercase tracking-tighter hover:bg-secondary/90 transition-all">
                            <Plus className="h-4 w-4 mr-2" />
                            {t("add_team_button")}
                        </SubmitButton>
                    </div>
                </div>
                {state.error && <p className="text-[10px] font-bold uppercase text-red-500">{state.error}</p>}
                {isLimitReached && (
                    <div className="p-3 bg-amber-500/10 border-l-2 border-amber-500">
                        <p className="text-[10px] font-bold uppercase text-amber-500 leading-tight">
                            {t.rich("limit_reached_desc", {
                                link: (chunks) => <Link href="/dashboard/billing" className="underline font-black">{chunks}</Link>
                            })}
                        </p>
                    </div>
                )}
            </form>
        </div>
    );
}
