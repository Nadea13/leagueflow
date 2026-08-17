"use client";

import { useActionState, useState, useEffect, useRef, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
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
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";

import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse, Sport } from "@/types/index";
import { getSports } from "@/actions/manager/team";
import { LogoUploader } from "@/components/shared/logo-uploader";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
const MapPicker = dynamic(() => import("../settings/map-picker"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-80 rounded-sm bg-muted/20 animate-pulse flex items-center justify-center border border-foreground/10">
            <span className="text-xs text-muted-foreground">Loading interactive map...</span>
        </div>
    )
});

import { getSportIcon } from "@/components/shared/sport-icons";

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
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [docDeadline, setDocDeadline] = useState<string>("");
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [docViewDate, setDocViewDate] = useState<Date>(new Date());
    const [state, formAction, isPending] = useActionState(createTournament, initialState);

    // Compute calendar grid days for current month view
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map(day => day.getMonth() === viewDate.getMonth() ? day : null);
    }, [viewDate]);

    const docCalendarDays = useMemo(() => {
        const monthStart = startOfMonth(docViewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map(day => day.getMonth() === docViewDate.getMonth() ? day : null);
    }, [docViewDate]);

    const [sportsList, setSportsList] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>("");
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
    const [description, setDescription] = useState<string>("");
    const [locationName, setLocationName] = useState<string>("");
    const [googleMapUrl, setGoogleMapUrl] = useState<string>("");
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Load sports dynamically from database
    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data) {
                setSportsList(res.data);
            }
        }
        if (open) {
            loadSports();
        }
    }, [open]);

    // Close dialog on success and reset previews & dates
    useEffect(() => {
        if (state.success && open) {
            const timer = setTimeout(() => {
                setLogoPreviewUrl(null);
                setCoverPreviewUrl(null);
                setStartDate("");
                setEndDate("");
                setDocDeadline("");
                setDescription("");
                setLocationName("");
                setGoogleMapUrl("");
                setSelectedSport("");
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
                    ? "คุณถึงขีดจำกัดการสร้างทัวร์นาเมนต์สำหรับแพ็คเกจของคุณแล้ว กรุณาอัพเกรดแพ็คเกจ"
                    : "You have reached the tournament creation limit for your plan. Please upgrade your plan.",
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
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 shadow-2xl">
                <form action={formAction} className="flex flex-col h-full max-h-[100vh] sm:max-h-[90vh] overflow-hidden">
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
                                                <ImageIcon className="h-4 w-4" />
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
                                        onFileChange={(file: File | null) => {
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
                                placeholder={isThai ? "เช่น ฟุตบอลเยาวชน ชิงถ้วยนายก ครั้งที่ 1" : "e.g. Youth Champions League 2026"}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")}  <span className="text-destructive">*</span></Label>
                            <input type="hidden" name="sport_id" value={selectedSport} required />
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 lg:gap-2">
                                {sportsList.map((sport) => {
                                    const isSelected = selectedSport === sport.id;
                                    return (
                                        <button
                                            key={sport.id}
                                            type="button"
                                            onClick={() => setSelectedSport(sport.id)}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-full transition-colors",
                                                isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {getSportIcon(sport.sport_name, "h-4 w-4")}
                                            </div>
                                            <span className="text-xs font-bold truncate w-full transition-colors">{sport.sport_name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Date Range Picker Component */}
                        <div className="space-y-1">
                            <Label>{isThai ? "ระยะเวลาการแข่งขัน" : "Tournament Period (Start - End)"} <span className="text-destructive">*</span></Label>

                            {/* Hidden inputs to pass data seamlessly to server action */}
                            <input type="hidden" name="start_date" value={startDate} required />
                            <input type="hidden" name="end_date" value={endDate} required />

                            <div className="p-1 lg:p-2 border rounded-sm">
                                <div className="space-y-1 lg:space-y-2 select-none">
                                    {/* Calendar Header: Month & Navigation */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                                            className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-xs font-bold tracking-tight">
                                            {viewDate.toLocaleString(isThai ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                                            className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Days of week header */}
                                    <div className="grid grid-cols-7 text-center">
                                        {(isThai ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => (
                                            <div key={i} className="text-xs font-bold text-muted-foreground">{d}</div>
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
                                                        "h-8 w-full flex items-center justify-center text-xs rounded-sm transition-all relative font-medium",
                                                        isSelected && "bg-primary/10 text-primary border border-primary/50 z-10 font-bold",
                                                        isInRange && "text-primary font-bold",
                                                        !isSelected && !isInRange && "hover:bg-muted text-foreground",
                                                        isToday && !isSelected && !isInRange && "border text-muted-foreground"
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Range Indicator */}
                                    <div className="flex items-center justify-between text-xs pt-1 lg:pt-2 border-t">
                                        <span className="text-muted-foreground font-medium">
                                            {startDate && endDate ? (
                                                `${formatDate(startDate, "d MMM yyyy", locale)} – ${formatDate(endDate, "d MMM yyyy", locale)}`
                                            ) : startDate ? (
                                                isThai ? `เริ่มต้น: ${formatDate(startDate, "d MMM yyyy", locale)} (เลือกวันสิ้นสุด...)` : `Start: ${formatDate(startDate, "d MMM yyyy", locale)} (select end date...)`
                                            ) : (
                                                isThai ? "คลิกวันเริ่มและวันสิ้นสุด" : "Click start and end dates"
                                            )}
                                        </span>
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
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("document_deadline")}</Label>
                            <input type="hidden" name="document_deadline" value={docDeadline} />
                            <div className="p-1 lg:p-2 border rounded-sm">
                                <div className="space-y-1 lg:space-y-2 select-none">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setDocViewDate(subMonths(docViewDate, 1))}
                                            className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-xs font-bold tracking-tight">
                                            {docViewDate.toLocaleString(isThai ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setDocViewDate(addMonths(docViewDate, 1))}
                                            className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 text-center">
                                        {(isThai ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => (
                                            <div key={i} className="text-xs font-bold text-muted-foreground">{d}</div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7">
                                        {docCalendarDays.map((day, idx) => {
                                            if (!day) return <div key={`empty-${idx}`} />;
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const isSelected = docDeadline === dateStr;
                                            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                            return (
                                                <button
                                                    key={dateStr}
                                                    type="button"
                                                    onClick={() => setDocDeadline(dateStr)}
                                                    className={cn(
                                                        "h-8 w-full flex items-center justify-center text-xs rounded-sm transition-all relative",
                                                        isSelected && "bg-primary/10 text-primary border border-primary/50 z-10",
                                                        !isSelected && "hover:bg-muted text-foreground",
                                                        isToday && !isSelected && "border text-muted-foreground"
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1 lg:pt-2 border-t">
                                        <span className="text-muted-foreground font-medium">
                                            {docDeadline
                                                ? (isThai ? `วันที่เลือก: ${formatDate(docDeadline, "d MMM yyyy", locale)}` : `Selected: ${formatDate(docDeadline, "d MMM yyyy", locale)}`)
                                                : (isThai ? "คลิกเพื่อเลือกวัน" : "Click date to select")}
                                        </span>
                                        {docDeadline && (
                                            <button
                                                type="button"
                                                onClick={() => setDocDeadline("")}
                                                className="text-destructive text-[10px] font-bold hover:underline"
                                            >
                                                {isThai ? "ล้างค่า" : "Clear"}
                                            </button>
                                        )}
                                    </div>
                                </div>
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
                            <Label>{isThai ? "สถานที่จัดการแข่งขัน" : "Location / Venue Name"}</Label>
                            <Input
                                id="location_name"
                                name="location_name"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder={isThai ? "เช่น สนามกีฬาเฉลิมพระเกียรติ 80 พรรษา" : "e.g. National Stadium Bangkok"}
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

                        {state.error && (
                            <div className="text-xs font-bold text-red-500 bg-red-500/10 p-4 border-l-4 border-red-500">
                                {state.error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4 mt-auto">
                        <SubmitButton className="w-full">
                            {isPending ? t("creating") : t("create_button")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
