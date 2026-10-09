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
import { DateRangePicker, DatePicker } from "@/components/ui/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/dropdown";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
const MapPicker = dynamic(() => import("./map-picker"), {
    ssr: false,
    loading: () => (
        <div className="w-full aspect-[2/1] rounded-sm bg-muted/20 animate-pulse flex items-center justify-center border border-foreground/10">
            <span className="text-xs text-muted-foreground">Loading interactive map...</span>
        </div>
    )
});

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
    const [locationName, setLocationName] = useState(tournament.location_name || "");
    const [googleMapUrl, setGoogleMapUrl] = useState(tournament.google_map_url || "");
    const [description, setDescription] = useState(tournament.description || "");

    const [startDate, setStartDate] = useState<string>(
        tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ""
    );
    const [endDate, setEndDate] = useState<string>(
        tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ""
    );

    const [docDeadline, setDocDeadline] = useState<string>(
        tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""
    );

    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(tournament.logo_img || (tournament as any).logo_url || null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(tournament.cover_img || (tournament as any).banner_url || null);
    const [logoRemoved, setLogoRemoved] = useState(false);
    const [coverRemoved, setCoverRemoved] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const prevLogoRef = useRef(tournament.logo_img || (tournament as any).logo_url);
    const prevCoverRef = useRef(tournament.cover_img || (tournament as any).banner_url);
    useEffect(() => {
        const currentLogo = tournament.logo_img || (tournament as any).logo_url;
        const currentCover = tournament.cover_img || (tournament as any).banner_url;
        if (prevLogoRef.current !== currentLogo) {
            setLogoPreviewUrl(currentLogo || null);
            prevLogoRef.current = currentLogo;
        }
        if (prevCoverRef.current !== currentCover) {
            setCoverPreviewUrl(currentCover || null);
            prevCoverRef.current = currentCover;
        }
    }, [tournament.logo_img, (tournament as any).logo_url, tournament.cover_img, (tournament as any).banner_url]);

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
                                <div className="relative pb-10">
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
                                                    className="object-cover p-1 rounded-sm transition-transform group-hover:scale-105"
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
                                            <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 pb-12">
                                                <div className="group p-4 bg-muted rounded-full text-muted-foreground transition-transform group-hover:bg-primary/10 group-hover:text-primary">
                                                    <Upload className="h-4 w-4" />
                                                </div>
                                                <p className="text-xs font-bold text-muted-foreground">
                                                    {isThai ? "คลิกเพื่ออัปโหลดภาพหน้าปก" : "Click to upload cover banner"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    (1440x720)
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 bg-card rounded-full">
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
                        </div>

                        <div className="space-y-1">
                            <Label>{tDialog("name")} <span className="text-destructive">*</span></Label>
                            <Input
                                type="text"
                                size="sm"
                                id="name"
                                name="name"
                                defaultValue={tournament.name}
                                placeholder={isThai ? "เช่น ฟุตบอลเยาวชน ชิงถ้วยนายก ครั้งที่ 1" : "e.g. Youth Champions League 2026"}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{isThai ? "สถานะการแข่งขัน" : "Tournament Status"}</Label>
                            <Select
                                name="status"
                                defaultValue={tournament.status || "draft"}
                            >
                                <SelectTrigger size="sm" className="w-full bg-transparent text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card">
                                    <SelectItem value="draft" className="text-muted-foreground font-black text-xs cursor-pointer">
                                        {isThai ? "แบบร่าง (Draft)" : "Draft"}
                                    </SelectItem>
                                    <SelectItem value="published" className="text-sky-500 font-black text-xs cursor-pointer">
                                        {isThai ? "เผยแพร่แล้ว (Published)" : "Published"}
                                    </SelectItem>
                                    <SelectItem value="registration_open" className="text-emerald-500 font-black text-xs cursor-pointer">
                                        {isThai ? "เปิดรับสมัคร (Registration Open)" : "Registration Open"}
                                    </SelectItem>
                                    <SelectItem value="registration_closed" className="text-amber-500 font-black text-xs cursor-pointer">
                                        {isThai ? "ปิดรับสมัคร (Registration Closed)" : "Registration Closed"}
                                    </SelectItem>
                                    <SelectItem value="upcoming" className="text-blue-500 font-black text-xs cursor-pointer">
                                        {isThai ? "เร็วๆ นี้ (Upcoming)" : "Upcoming"}
                                    </SelectItem>
                                    <SelectItem value="ongoing" className="text-emerald-600 font-black text-xs cursor-pointer">
                                        {isThai ? "กำลังแข่งขัน (Ongoing)" : "Ongoing"}
                                    </SelectItem>
                                    <SelectItem value="completed" className="text-primary font-black text-xs cursor-pointer">
                                        {isThai ? "เสร็จสิ้นการแข่งขัน (Completed)" : "Completed"}
                                    </SelectItem>
                                    <SelectItem value="finished" className="text-primary font-black text-xs cursor-pointer">
                                        {isThai ? "สิ้นสุด (Finished)" : "Finished"}
                                    </SelectItem>
                                    <SelectItem value="cancelled" className="text-destructive font-black text-xs cursor-pointer">
                                        {isThai ? "ยกเลิก (Cancelled)" : "Cancelled"}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                            {/* Tournament Period: Date Range */}
                            <div className="space-y-1">
                                <Label>
                                    {isThai ? "ระยะเวลาการแข่งขัน (เริ่ม - สิ้นสุด)" : "Tournament Period (Start - End)"} <span className="text-destructive">*</span>
                                </Label>

                                {/* Hidden inputs to pass data seamlessly to server action */}
                                <input type="hidden" name="start_date" value={startDate} required />
                                <input type="hidden" name="end_date" value={endDate} required />

                                <DateRangePicker
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={({ startDate: s, endDate: e }) => {
                                        setStartDate(s);
                                        setEndDate(e);
                                    }}
                                    size="sm"
                                    minYear={new Date().getFullYear() - 5}
                                    maxYear={new Date().getFullYear() + 5}
                                    defaultViewYear={startDate ? new Date(startDate).getFullYear() : new Date().getFullYear()}
                                    placeholder={isThai ? "เลือกวันเริ่มต้น - สิ้นสุดการแข่งขัน" : "Select start - end date"}
                                    disabled={isPending}
                                />
                            </div>

                            {/* Document Deadline */}
                            <div className="space-y-1">
                                <Label>{t("document_deadline") || (isThai ? "วันปิดรับเอกสาร" : "Document Deadline")}</Label>
                                <input type="hidden" name="document_deadline" value={docDeadline} />
                                <DatePicker
                                    value={docDeadline}
                                    onChange={setDocDeadline}
                                    size="sm"
                                    clearable
                                    minYear={new Date().getFullYear() - 5}
                                    maxYear={new Date().getFullYear() + 5}
                                    defaultViewYear={docDeadline ? new Date(docDeadline).getFullYear() : new Date().getFullYear()}
                                    placeholder={isThai ? "เลือกวันปิดรับเอกสาร (ถ้ามี)" : "Select document deadline (optional)"}
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{isThai ? "รายละเอียดเพิ่มเติม" : "Description / Details"}</Label>
                            <div className="pro-editor-wrapper relative">
                                <ReactQuill
                                    theme="snow"
                                    value={description}
                                    onChange={setDescription}
                                    className="pro-editor h-auto text-foreground"
                                    placeholder={isThai ? "เช่น กติกาการแข่งขัน เงินรางวัล และช่องทางการติดต่อผู้จัด..." : "e.g. Tournament rules, prize pool, and contact details..."}
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

                        <div className="space-y-1">
                            <Label htmlFor="location_name">{isThai ? "สถานที่จัดการแข่งขัน" : "Location / Venue Name"}</Label>
                            <Input
                                id="location_name"
                                name="location_name"
                                size="sm"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder={isThai ? "เช่น สนามกีฬาเฉลิมพระเกียรติ 80 พรรษา" : "e.g. National Stadium Bangkok"}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                            />
                        </div>

                        <div className="space-y-1">
                            <MapPicker
                                value={googleMapUrl}
                                onChange={(url) => setGoogleMapUrl(url)}
                                onLocationNameSelect={(name) => setLocationName(name)}
                            />
                            <input type="hidden" name="google_map_url" value={googleMapUrl} />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                size="sm"
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

