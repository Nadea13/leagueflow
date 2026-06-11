"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Upload } from "lucide-react";
import Image from "next/image";
import { createTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse, Sport } from "@/types/index";

import { getSports } from "@/actions/manager/team";
import { LogoUploader } from "@/components/shared/logo-uploader";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function TournamentCreate() {
    const t = useTranslations("Dialog");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === 'th';
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(createTournament, initialState);
    const [sportsList, setSportsList] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>("");
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Load sports dynamically from database
    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data) {
                setSportsList(res.data);
                if (res.data.length > 0) {
                    setSelectedSport(res.data[0].id);
                }
            }
        }
        if (open) {
            loadSports();
        }
    }, [open]);

    // Close dialog on success and reset previews
    useEffect(() => {
        if (state.success && open) {
            const timer = setTimeout(() => {
                setLogoPreviewUrl(null);
                setCoverPreviewUrl(null);
                setOpen(false);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [state.success, open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4" />
                    <span>{t("create_button")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 rounded-xl shadow-2xl">
                <form action={formAction}>
                    {/* Premium Header */}
                    <div className="p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">
                                {t("create_title")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                {t("create_desc")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4 no-scrollbar">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-black tracking-widest text-primary">
                                    {isThai ? "โลโก้การแข่งขัน" : "Tournament Logo"}
                                </Label>
                                <LogoUploader
                                    id="logo_img"
                                    name="logo_img"
                                    initialUrl={logoPreviewUrl}
                                    onFileChange={(file) => {
                                        if (file) {
                                            setLogoPreviewUrl(URL.createObjectURL(file));
                                        } else {
                                            setLogoPreviewUrl(null);
                                        }
                                    }}
                                    onRemove={() => setLogoPreviewUrl(null)}
                                    uploadLabel={isThai ? "อัปโหลดโลโก้" : "Upload Logo"}
                                    clickToUploadLabel={isThai ? "คลิกเพื่อเปลี่ยน" : "Click to Change"}
                                    previewLabel={isThai ? "ตัวอย่าง" : "Preview"}
                                    imageFit="contain"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-black tracking-widest text-primary">
                                    {isThai ? "ภาพหน้าปก (แนะนำอัตราส่วน 3:1)" : "Cover Image (Recommended 3:1)"}
                                </Label>
                                <div 
                                    onClick={() => coverInputRef.current?.click()}
                                    className="relative h-28 w-full border border-dashed border-border hover:border-primary/50 transition-all rounded-lg overflow-hidden flex flex-col items-center justify-center cursor-pointer group bg-muted/5"
                                >
                                    {coverPreviewUrl ? (
                                        <>
                                            <Image 
                                                src={coverPreviewUrl} 
                                                alt="Cover Preview" 
                                                fill 
                                                className="object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="font-bold text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        coverInputRef.current?.click();
                                                    }}
                                                >
                                                    {isThai ? "เปลี่ยนรูป" : "Change Image"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="font-bold text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCoverPreviewUrl(null);
                                                        if (coverInputRef.current) coverInputRef.current.value = "";
                                                    }}
                                                >
                                                    {isThai ? "ลบรูป" : "Remove"}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-4 text-center">
                                            <div className="p-2 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform mb-2">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <p className="text-xs font-bold text-foreground">
                                                {isThai ? "คลิกเพื่ออัปโหลดภาพหน้าปก" : "Click to upload cover banner"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                (1200x400)
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    id="cover_img"
                                    name="cover_img"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={coverInputRef}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setCoverPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("name")}</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder={t("name_placeholder")}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")}</Label>
                            <Select name="sport_id" value={selectedSport} onValueChange={setSelectedSport}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("select_sport")} />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    {sportsList.map((sport) => (
                                        <SelectItem key={sport.id} value={sport.id} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                            {sport.sport_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("document_deadline")}</Label>
                            <Input
                                id="document_deadline"
                                name="document_deadline"
                                type="date" required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:gap-4">
                            <div className="space-y-1">
                                <Label>{t("start_date")}</Label>
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    type="date"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("end_date")}</Label>
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    type="date"
                                    required
                                />
                            </div>
                        </div>

                        {state.error && (
                            <div className="text-xs font-bold text-red-500 bg-red-500/10 p-4 border-l-4 border-red-500">
                                {state.error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4">
                        <SubmitButton className="w-full">
                            {isPending ? t("creating") : t("create_button")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
