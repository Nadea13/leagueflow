"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Upload, X } from "lucide-react";
import Image from "next/image";
import { createTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

interface TournamentCreateProps {
    iconOnlyMobile?: boolean;
    isDisabled?: boolean;
}

export function TournamentCreate({ iconOnlyMobile = false, isDisabled = false }: TournamentCreateProps) {
    const t = useTranslations("Dialog");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();
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

    const handleButtonClick = (e: React.MouseEvent) => {
        if (isDisabled) {
            e.preventDefault();
            e.stopPropagation();
            toast({
                title: "Error",
                description: locale === 'th'
                    ? "ผู้ใช้ทั่วไปสามารถสร้างการแข่งขันได้สูงสุด 1 รายการเท่านั้น กรุณาอัพเกรดเป็นแพ็คเกจ Pro"
                    : "Starter plan users can create only 1 tournament. Please upgrade to a Pro plan.",
                variant: "destructive"
            });
            return;
        }
        setOpen(true);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className={iconOnlyMobile ? "h-8 w-8 p-0 lg:h-10 lg:w-auto lg:px-4 lg:py-2 gap-2" : ""}
                    onClick={handleButtonClick}
                >
                    <Plus className="h-4 w-4" />
                    <span className={iconOnlyMobile ? "hidden lg:inline" : ""}>{t("create_button")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 rounded-sm shadow-2xl">
                <form action={formAction} className="flex flex-col h-full max-h-[96vh] overflow-hidden">
                    {/* Premium Header */}
                    <DialogHeader className="relative pr-10">
                        <DialogTitle>{t("create_title")}</DialogTitle>
                        <DialogDescription>{t("create_desc")}</DialogDescription>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 md:p-4 space-y-1 md:space-y-2">
                        <div className="space-y-1 md:space-y-2">
                            <div className="space-y-1">
                                <Label>
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
                                <Label>
                                    {isThai ? "ภาพหน้าปก (แนะนำอัตราส่วน 2:1)" : "Cover Image (Recommended 2:1)"}
                                </Label>
                                <div
                                    onClick={() => coverInputRef.current?.click()}
                                    className="relative aspect-[2/1] w-full border border-dashed border-2 hover:border-primary/50 transition-all rounded-sm overflow-hidden flex flex-col items-center justify-center cursor-pointer group"
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
                                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                                            <div className="p-4 bg-primary/10 rounded-sm text-primary transition-transform">
                                                <Upload className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-bold text-foreground">
                                                {isThai ? "คลิกเพื่ออัปโหลดภาพหน้าปก" : "Click to upload cover banner"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                (1440x720)
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
                            <Label>{t("name")}  <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")}  <span className="text-destructive">*</span></Label>
                            <Select name="sport_id" value={selectedSport} onValueChange={setSelectedSport}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("select_sport")} />
                                </SelectTrigger>
                                <SelectContent>
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

                    <DialogFooter>
                        <SubmitButton className="w-full">
                            {isPending ? t("creating") : t("create_button")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
