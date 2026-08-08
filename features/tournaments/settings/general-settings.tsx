"use client";

import { useActionState, useState, useEffect, useRef, useMemo } from "react";
import { updateTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ActionResponse, Tournament } from "@/types/index";
import dynamic from "next/dynamic";
import Image from "next/image";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
const MapPicker = dynamic(() => import("./map-picker"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-80 rounded-sm bg-muted/20 animate-pulse flex items-center justify-center border border-foreground/10">
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
    const [viewDate, setViewDate] = useState<Date>(
        tournament.start_date ? new Date(tournament.start_date) : new Date()
    );

    // Compute calendar grid days for current month view
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const start = startOfWeek(monthStart);
        const end = endOfWeek(monthEnd);

        const days = eachDayOfInterval({ start, end });
        return days.map(day => day.getMonth() === viewDate.getMonth() ? day : null);
    }, [viewDate]);

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
                                                        setCoverRemoved(true);
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

                            <div className="col-span-2 space-y-1">
                                <Label>{t("document_deadline")}</Label>
                                <Input
                                    type="date"
                                    id="document_deadline"
                                    name="document_deadline"
                                    defaultValue={tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""}
                                />
                            </div>

                            {/* Date Range Picker Component */}
                            <div className="col-span-2 space-y-1">
                                <Label>{isThai ? "ระยะเวลาการแข่งขัน" : "Tournament Period (Start - End)"} <span className="text-destructive">*</span></Label>

                                {/* Hidden inputs to pass data seamlessly to server action */}
                                <input type="hidden" name="start_date" value={startDate} required />
                                <input type="hidden" name="end_date" value={endDate} required />

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start border px-3",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            {startDate && endDate ? (
                                                <span className="font-semibold text-sm">
                                                    {formatDate(startDate, "d MMM yyyy", locale)} – {formatDate(endDate, "d MMM yyyy", locale)}
                                                </span>
                                            ) : startDate ? (
                                                <span className="font-semibold text-sm">
                                                    {formatDate(startDate, "d MMM yyyy", locale)} – {isThai ? "เลือกวันสิ้นสุด..." : "Select end date..."}
                                                </span>
                                            ) : (
                                                <span className="text-sm lg:text-base text-muted-foreground">
                                                    {isThai ? "เลือกช่วงวันที่แข่งขัน" : "Select date range"}
                                                </span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-1 lg:p-2 bg-card border shadow-2xl rounded-sm" align="start">
                                        <div className="space-y-1 lg:space-y-2 select-none">
                                            {/* Calendar Header: Month & Navigation */}
                                            <div className="flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewDate(subMonths(viewDate, 1))}
                                                    className="flex items-center justify-center h-6 w-6 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <span className="text-xs font-bold tracking-tight">
                                                    {viewDate.toLocaleString(isThai ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                                                    className="flex items-center justify-center h-6 w-6 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Days of week header */}
                                            <div className="grid grid-cols-7 text-center">
                                                {(isThai ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => (
                                                    <div key={i} className="text-[10px] font-bold text-muted-foreground/60">{d}</div>
                                                ))}
                                            </div>

                                            {/* Month Days Grid */}
                                            <div className="grid grid-cols-7">
                                                {calendarDays.map((day, idx) => {
                                                    if (!day) return <div key={`empty-${idx}`} />;
                                                    const dateStr = format(day, 'yyyy-MM-dd');
                                                    const isStart = startDate === dateStr;
                                                    const isEnd = endDate === dateStr;
                                                    const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;
                                                    const isSelected = isStart || isEnd;
                                                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                                    return (
                                                        <button
                                                            key={dateStr}
                                                            type="button"
                                                            onClick={() => {
                                                                if (!startDate || (startDate && endDate)) {
                                                                    setStartDate(dateStr);
                                                                    setEndDate("");
                                                                } else if (startDate && !endDate) {
                                                                    if (dateStr < startDate) {
                                                                        setStartDate(dateStr);
                                                                    } else {
                                                                        setEndDate(dateStr);
                                                                    }
                                                                }
                                                            }}
                                                            className={cn(
                                                                "h-8 w-full flex items-center justify-center text-xs rounded transition-all relative font-medium",
                                                                isSelected && "bg-primary text-primary-foreground font-black z-10",
                                                                isInRange && "bg-primary/20 text-primary font-bold rounded-none",
                                                                !isSelected && !isInRange && "hover:bg-muted text-foreground",
                                                                isToday && !isSelected && "border border-primary text-primary font-bold"
                                                            )}
                                                        >
                                                            {format(day, 'd')}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Instruction & Clear button */}
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">{isThai ? "คำแนะนำ: คลิกวันเริ่มและวันสิ้นสุด" : "Click start and end dates"}</span>
                                                {(startDate || endDate) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setStartDate(""); setEndDate(""); }}
                                                        className="text-destructive text-[10px] font-bold hover:underline"
                                                    >
                                                        {isThai ? "ล้างค่า" : "Clear"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Location Section */}
                            <div className="col-span-2 space-y-1">
                                <Label htmlFor="location_name">{isThai ? "สถานที่แข่งขัน" : "Venue Name"}</Label>
                                <Input
                                    type="text"
                                    id="location_name"
                                    name="location_name"
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                />
                            </div>

                            <div className="col-span-2 space-y-1">
                                <Label>{isThai ? "ตำแหน่งแผนที่" : "Location Map"}</Label>
                                <MapPicker
                                    value={googleMapUrl}
                                    onChange={(url) => setGoogleMapUrl(url)}
                                    onLocationNameSelect={(name) => setLocationName(name)}
                                />
                                <input type="hidden" name="google_map_url" value={googleMapUrl} />
                            </div>                        </div>

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
