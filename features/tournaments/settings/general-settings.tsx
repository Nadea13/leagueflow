"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { updateTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { ActionResponse, Tournament } from "@/types/index";
import dynamic from "next/dynamic";
import Image from "next/image";
import { LogoUploader } from "@/components/shared/logo-uploader";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface GeneralSettingsProps {
    tournament: Tournament;
}

export function GeneralSettings({ tournament }: GeneralSettingsProps) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const tDialog = useTranslations("Dialog");
    const locale = useLocale();
    const isThai = locale === 'th';
    const { toast } = useToast();

    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction, isPending] = useActionState(updateTournamentWithId, initialState);
    const [description, setDescription] = useState(tournament.description || "");

    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(tournament.logo_img || null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(tournament.cover_img || null);
    const [logoRemoved, setLogoRemoved] = useState(false);
    const [coverRemoved, setCoverRemoved] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (state.success) {
            toast({
                title: tCommon("success"),
                description: t("update_success_desc") || "Tournament updated successfully",
            });
        } else if (state.error) {
            toast({
                title: tCommon("error"),
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, tCommon, t, toast]);

    return (
        <div className="space-y-1 md:space-y-2">
            <div className="relative overflow-hidden">
                <div className="relative z-10">
                    <form action={formAction} className="space-y-1 md:space-y-2">
                        <input type="hidden" name="form_type" value="general" />
                        <input type="hidden" name="logo_img_remove" value={String(logoRemoved)} />
                        <input type="hidden" name="cover_img_remove" value={String(coverRemoved)} />

                        <div className="space-y-1 md:space-y-2 col-span-2 mb-1 md:mb-2">
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
                                            setLogoRemoved(false);
                                        } else {
                                            setLogoPreviewUrl(null);
                                            setLogoRemoved(true);
                                        }
                                    }}
                                    onRemove={() => {
                                        setLogoPreviewUrl(null);
                                        setLogoRemoved(true);
                                    }}
                                    uploadLabel={isThai ? "อัปโหลดโลโก้" : "Upload Logo"}
                                    clickToUploadLabel={isThai ? "คลิกเพื่อเปลี่ยน" : "Click to Change"}
                                    previewLabel={isThai ? "ตัวอย่าง" : "Preview"}
                                    imageFit="contain"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>
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
                                                        setCoverRemoved(true);
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
                                            setCoverRemoved(false);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid gap-1 md:gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                                <Label>{tDialog("name")}</Label>
                                <Input
                                    type="text"
                                    id="name"
                                    name="name"
                                    defaultValue={tournament.name}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>{isThai ? "สถานะการแข่งขัน" : "Tournament Status"}</Label>
                                <Select
                                    name="status"
                                    defaultValue={tournament.status}
                                >
                                    <SelectTrigger className="w-full bg-transparent text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        <SelectItem value="draft" className="text-muted-foreground font-black text-xs cursor-pointer">
                                            {isThai ? "แบบร่าง" : "Draft"}
                                        </SelectItem>
                                        <SelectItem value="upcoming" className="text-amber-500 font-black text-xs cursor-pointer">
                                            {isThai ? "เร็วๆ นี้" : "Upcoming"}
                                        </SelectItem>
                                        <SelectItem value="ongoing" className="text-emerald-500 font-black text-xs cursor-pointer">
                                            {isThai ? "กำลังดำเนินการ" : "Ongoing"}
                                        </SelectItem>
                                        <SelectItem value="finished" className="text-primary font-black text-xs cursor-pointer">
                                            {isThai ? "เสร็จสิ้น" : "Finished"}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>{t("document_deadline")}</Label>
                                <Input
                                    type="date"
                                    id="document_deadline"
                                    name="document_deadline"
                                    defaultValue={tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>{tDialog("start_date")}</Label>
                                <Input
                                    type="date"
                                    id="start_date"
                                    name="start_date"
                                    defaultValue={tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ""}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>{tDialog("end_date")}</Label>
                                <Input
                                    type="date"
                                    id="end_date"
                                    name="end_date"
                                    defaultValue={tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ""}
                                    className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                />
                            </div>

                            <div className="col-span-2 space-y-1">
                                <Label>{tDialog("description")}</Label>
                                <div className="pro-editor-wrapper relative">
                                    <ReactQuill
                                        theme="snow"
                                        value={description}
                                        onChange={setDescription}
                                        className="pro-editor h-auto text-foreground"
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, false] }],
                                                ['bold', 'underline'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['clean']
                                            ]
                                        }}
                                    />
                                </div>
                                <input type="hidden" name="description" value={description} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="md:w-fit w-full"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {tCommon("save")}
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
