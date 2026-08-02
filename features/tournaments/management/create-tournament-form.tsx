"use client";

import { useActionState, useState, useEffect, useRef, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
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
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [viewDate, setViewDate] = useState<Date>(new Date());
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

    // Close dialog on success and reset previews & dates
    useEffect(() => {
        if (state.success && open) {
            const timer = setTimeout(() => {
                setLogoPreviewUrl(null);
                setCoverPreviewUrl(null);
                setStartDate("");
                setEndDate("");
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

                        {/* Date Range Picker Component */}
                        <div className="space-y-1">
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

                                        {/* Range Indicator & Direct manual fallback inputs */}
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
