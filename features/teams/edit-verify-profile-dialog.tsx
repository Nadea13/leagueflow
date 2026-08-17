"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { updateGlobalPlayerInfo, updateGlobalPlayerPhoto } from "@/actions/tournaments/master-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { AlertCircle, Loader2, Mars, Venus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, setYear } from "date-fns";
import { formatDate } from "@/lib/date";

import { getSports } from "@/actions/manager/team";
import { Sport } from "@/types/index";
import { getSportIcon } from "@/components/shared/sport-icons";
import { cn } from "@/lib/utils";

export interface PlayerData {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    first_name_th?: string | null;
    middle_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    middle_name_en?: string | null;
    last_name_en?: string | null;
    gender?: 'male' | 'female' | string | null;
    birthday?: string | null;
    tel?: string | null;
    profile_img?: string | null;
    verified?: boolean;
    favorite_sport_id?: string | null;
    preferred_hand?: string | null;
    preferred_foot?: string | null;
}

interface EditVerifyProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    masterPlayer: PlayerData | null;
    onSave: (updatedPlayer: PlayerData) => void;
}

export function EditVerifyProfileDialog({
    open,
    onOpenChange,
    masterPlayer,
    onSave
}: EditVerifyProfileDialogProps) {
    const router = useRouter();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const [editFirstNameTh, setEditFirstNameTh] = useState(masterPlayer?.first_name_th || "");
    const [editMiddleNameTh, setEditMiddleNameTh] = useState(masterPlayer?.middle_name_th || "");
    const [editLastNameTh, setEditLastNameTh] = useState(masterPlayer?.last_name_th || "");
    const [editFirstNameEn, setEditFirstNameEn] = useState(masterPlayer?.first_name_en || "");
    const [editMiddleNameEn, setEditMiddleNameEn] = useState(masterPlayer?.middle_name_en || "");
    const [editLastNameEn, setEditLastNameEn] = useState(masterPlayer?.last_name_en || "");
    const [editGender, setEditGender] = useState(masterPlayer?.gender || "male");
    const [editBirthday, setEditBirthday] = useState(masterPlayer?.birthday ? masterPlayer.birthday.substring(0, 10) : "");
    const [dobViewDate, setDobViewDate] = useState<Date>(() => masterPlayer?.birthday ? new Date(masterPlayer.birthday) : new Date(2000, 0, 1));

    const dobCalendarDays = useMemo(() => {
        const monthStart = startOfMonth(dobViewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [dobViewDate]);

    const birthYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const list = [];
        for (let y = currentYear; y >= 1940; y--) list.push(y);
        return list;
    }, []);
    const [editTel, setEditTel] = useState(masterPlayer?.tel || "");
    const [editFavoriteSportId, setEditFavoriteSportId] = useState(masterPlayer?.favorite_sport_id || "");
    const [editPreferredHand, setEditPreferredHand] = useState(masterPlayer?.preferred_hand || "right");
    const [editPreferredFoot, setEditPreferredFoot] = useState(masterPlayer?.preferred_foot || "right");
    const isHandRightSelected = editPreferredHand === "right" || editPreferredHand === "both";
    const isHandLeftSelected = editPreferredHand === "left" || editPreferredHand === "both";

    const toggleHand = (side: "right" | "left") => {
        if (side === "right") {
            if (isHandRightSelected) {
                setEditPreferredHand(isHandLeftSelected ? "left" : "");
            } else {
                setEditPreferredHand(isHandLeftSelected ? "both" : "right");
            }
        } else {
            if (isHandLeftSelected) {
                setEditPreferredHand(isHandRightSelected ? "right" : "");
            } else {
                setEditPreferredHand(isHandRightSelected ? "both" : "left");
            }
        }
    };

    const isFootRightSelected = editPreferredFoot === "right" || editPreferredFoot === "both";
    const isFootLeftSelected = editPreferredFoot === "left" || editPreferredFoot === "both";

    const toggleFoot = (side: "right" | "left") => {
        if (side === "right") {
            if (isFootRightSelected) {
                setEditPreferredFoot(isFootLeftSelected ? "left" : "");
            } else {
                setEditPreferredFoot(isFootLeftSelected ? "both" : "right");
            }
        } else {
            if (isFootLeftSelected) {
                setEditPreferredFoot(isFootRightSelected ? "right" : "");
            } else {
                setEditPreferredFoot(isFootRightSelected ? "both" : "left");
            }
        }
    };
    const [sportsList, setSportsList] = useState<Sport[]>([]);

    const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(masterPlayer?.profile_img || null);
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const [editError, setEditError] = useState<string | null>(null);

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

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditError(null);

        if (!masterPlayer) return;
        const currentPlayer = masterPlayer;

        const isThai = locale === 'th';
        const hasRequiredName = isThai
            ? (editFirstNameTh && editLastNameTh)
            : (editFirstNameEn && editLastNameEn);

        if (!hasRequiredName || !editGender || !editBirthday) {
            setEditError(isThai ? "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" : "Please fill in all required fields.");
            return;
        }

        startTransition(async () => {
            // 1. Update text info and possible photo deletion
            const res = await updateGlobalPlayerInfo(currentPlayer.id, {
                first_name_th: editFirstNameTh || undefined,
                middle_name_th: editMiddleNameTh || undefined,
                last_name_th: editLastNameTh || undefined,
                first_name_en: editFirstNameEn || undefined,
                middle_name_en: editMiddleNameEn || undefined,
                last_name_en: editLastNameEn || undefined,
                gender: editGender,
                date_of_birth: editBirthday,
                tel: editTel || null,
                favorite_sport_id: editFavoriteSportId || null,
                preferred_hand: editPreferredHand || null,
                preferred_foot: editPreferredFoot || null,
                profile_img: editPreviewUrl === null ? null : undefined
            });

            if (!res.success) {
                setEditError(res.error || (isThai ? "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" : "An error occurred while saving."));
                return;
            }

            let updatedPhotoUrl = editPreviewUrl === null ? null : currentPlayer.profile_img;

            // 2. Upload photo if selected
            if (editPhotoFile) {
                const photoData = new FormData();
                photoData.append("photo", editPhotoFile);
                const photoRes = await updateGlobalPlayerPhoto(currentPlayer.id, photoData);
                if (!photoRes.success) {
                    setEditError(photoRes.error || (isThai ? "แก้ไขข้อมูลสำเร็จ แต่ไม่สามารถอัปโหลดรูปภาพได้" : "Information saved, but profile image upload failed."));
                    onSave({
                        ...currentPlayer,
                        first_name_th: editFirstNameTh,
                        middle_name_th: editMiddleNameTh,
                        last_name_th: editLastNameTh,
                        first_name_en: editFirstNameEn,
                        middle_name_en: editMiddleNameEn,
                        last_name_en: editLastNameEn,
                        gender: editGender,
                        birthday: editBirthday,
                        tel: editTel,
                        favorite_sport_id: editFavoriteSportId,
                        preferred_hand: editPreferredHand,
                        preferred_foot: editPreferredFoot
                    });
                    return;
                }

                updatedPhotoUrl = editPreviewUrl;
            }

            onSave({
                ...currentPlayer,
                first_name_th: editFirstNameTh,
                middle_name_th: editMiddleNameTh,
                last_name_th: editLastNameTh,
                first_name_en: editFirstNameEn,
                middle_name_en: editMiddleNameEn,
                last_name_en: editLastNameEn,
                gender: editGender,
                birthday: editBirthday,
                tel: editTel,
                favorite_sport_id: editFavoriteSportId,
                preferred_hand: editPreferredHand,
                preferred_foot: editPreferredFoot,
                profile_img: updatedPhotoUrl
            });

            onOpenChange(false);
            router.refresh();
        });
    };

    const isThai = locale === 'th';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 shadow-2xl">
                <form key={open ? `open-${masterPlayer?.id}` : 'closed'} onSubmit={handleSaveEdit} className="flex flex-col h-full max-h-[100vh] sm:max-h-[90vh] overflow-hidden">
                    <DialogHeader className="relative pr-10">
                        <DialogTitle>
                            {isThai ? "แก้ไขข้อมูลทะเบียนนักกีฬา" : "Edit Athlete Registration Profile"}
                        </DialogTitle>
                        <DialogDescription>
                            {isThai ? "แก้ไขรายละเอียดโปรไฟล์นักกีฬาของคุณ" : "Modify your athlete profile details."}
                        </DialogDescription>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 md:p-4 md:space-y-4">
                        {editError && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-shake">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{editError}</span>
                            </div>
                        )}

                        <div className="flex flex-col items-center justify-center space-y-1">
                            <LogoUploader
                                id="edit-profile-photo"
                                initialUrl={editPreviewUrl}
                                onFileChange={(file) => {
                                    setEditPhotoFile(file);
                                    if (file) {
                                        setEditPreviewUrl(URL.createObjectURL(file));
                                    } else {
                                        setEditPreviewUrl(null);
                                    }
                                }}
                                onRemove={() => {
                                    setEditPhotoFile(null);
                                    setEditPreviewUrl(null);
                                }}
                                uploadLabel={isThai ? "อัปโหลดรูปภาพ" : "Upload Picture"}
                                clickToUploadLabel={isThai ? "เปลี่ยนรูปภาพ" : "Change Picture"}
                                previewLabel={isThai ? "รูปตัวอย่าง" : "Preview"}
                                imageFit="cover"
                            />
                        </div>

                        {/* Thai Name */}
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                            <div className="space-y-1">
                                <Label>{isThai ? "ชื่อจริง" : "First Name (TH)"} {isThai && <span className="text-destructive">*</span>}</Label>
                                <Input
                                    id="editFirstNameTh"
                                    type="text"
                                    value={editFirstNameTh}
                                    onChange={(e) => setEditFirstNameTh(e.target.value)}
                                    placeholder={isThai ? "เช่น สมชาย" : "e.g. Somchai"}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{isThai ? "ชื่อกลาง" : "Middle Name (TH)"}</Label>
                                <Input
                                    id="editMiddleNameTh"
                                    type="text"
                                    value={editMiddleNameTh}
                                    onChange={(e) => setEditMiddleNameTh(e.target.value)}
                                    placeholder={isThai ? "ชื่อกลาง (ถ้ามี)" : "Middle name (optional)"}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{isThai ? "นามสกุล" : "Last Name (TH)"} {isThai && <span className="text-destructive">*</span>}</Label>
                                <Input
                                    id="editLastNameTh"
                                    type="text"
                                    value={editLastNameTh}
                                    onChange={(e) => setEditLastNameTh(e.target.value)}
                                    placeholder={isThai ? "เช่น ใจดี" : "e.g. Jaidee"}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        {/* English Name */}
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                            <div className="space-y-1">
                                <Label>{isThai ? "ชื่อจริง (EN)" : "First Name"} {!isThai && <span className="text-destructive">*</span>}</Label>
                                <Input
                                    id="editFirstNameEn"
                                    type="text"
                                    value={editFirstNameEn}
                                    onChange={(e) => setEditFirstNameEn(e.target.value)}
                                    placeholder={isThai ? "เช่น Somchai" : "e.g. Somchai"}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{isThai ? "ชื่อกลาง (EN)" : "Middle Name"}</Label>
                                <Input
                                    id="editMiddleNameEn"
                                    type="text"
                                    value={editMiddleNameEn}
                                    onChange={(e) => setEditMiddleNameEn(e.target.value)}
                                    placeholder={isThai ? "Middle name (optional)" : "Middle name (optional)"}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{isThai ? "นามสกุล (EN)" : "Last Name"} {!isThai && <span className="text-destructive">*</span>}</Label>
                                <Input
                                    id="editLastNameEn"
                                    type="text"
                                    value={editLastNameEn}
                                    onChange={(e) => setEditLastNameEn(e.target.value)}
                                    placeholder={isThai ? "เช่น Jaidee" : "e.g. Jaidee"}
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{isThai ? "เบอร์โทรศัพท์ติดต่อ" : "Phone Number"}</Label>
                            <Input
                                id="editTel"
                                type="tel"
                                value={editTel}
                                onChange={(e) => setEditTel(e.target.value)}
                                placeholder={isThai ? "เช่น 081-234-5678" : "e.g. 081-234-5678"}
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{isThai ? "เพศ" : "Gender"} <span className="text-destructive">*</span></Label>
                            <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setEditGender("male")}
                                    className={cn(
                                        "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                        editGender === "male"
                                            ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
                                            : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                        editGender === "male" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                    )}>
                                        <Mars className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ชาย" : "Male"}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setEditGender("female")}
                                    className={cn(
                                        "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                        editGender === "female"
                                            ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
                                            : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                        editGender === "female" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                    )}>
                                        <Venus className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "หญิง" : "Female"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{isThai ? "วัน/เดือน/ปีเกิด" : "Date of Birth"} <span className="text-destructive">*</span></Label>
                            <div className="p-1 lg:p-2 border rounded-sm">
                                <div className="space-y-1 lg:space-y-2 select-none">
                                    <div className="flex items-center justify-between gap-1">
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setDobViewDate(subMonths(dobViewDate, 1))}
                                            className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold tracking-tight">
                                                {dobViewDate.toLocaleString(isThai ? 'th-TH' : 'en-US', { month: 'long' })}
                                            </span>
                                            <select
                                                value={dobViewDate.getFullYear()}
                                                disabled={isPending}
                                                onChange={(e) => setDobViewDate(setYear(dobViewDate, parseInt(e.target.value)))}
                                                className="text-xs font-bold bg-transparent border-none focus:outline-none cursor-pointer"
                                            >
                                                {birthYears.map((y) => (
                                                    <option key={y} value={y} className="bg-card text-foreground">
                                                        {isThai ? y + 543 : y}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setDobViewDate(addMonths(dobViewDate, 1))}
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
                                        {dobCalendarDays.map((day, idx) => {
                                            if (!day) return <div key={`empty-${idx}`} />;
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const isSelected = editBirthday === dateStr;
                                            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                            return (
                                                <button
                                                    key={dateStr}
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => setEditBirthday(dateStr)}
                                                    className={cn(
                                                        "h-8 w-full flex items-center justify-center text-xs rounded-sm transition-all relative",
                                                        isSelected && "bg-primary/10 text-primary border border-primary/50 font-bold z-10",
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
                                            {editBirthday
                                                ? (isThai ? `วันที่เลือก: ${formatDate(editBirthday, "d MMM yyyy", locale)}` : `Selected: ${formatDate(editBirthday, "d MMM yyyy", locale)}`)
                                                : (isThai ? "คลิกเพื่อเลือกวันเกิด" : "Click date to select")}
                                        </span>
                                        {editBirthday && (
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => setEditBirthday("")}
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
                            <Label>{isThai ? "กีฬาที่ชอบ" : "Favorite Sport"}</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 lg:gap-2">
                                {sportsList.map((sport) => {
                                    const isSelected = editFavoriteSportId === sport.id;
                                    return (
                                        <button
                                            key={sport.id}
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setEditFavoriteSportId(isSelected ? "" : sport.id)}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
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

                        <div className="grid grid-cols-2 gap-1 lg:gap-2">
                            <div className="space-y-1">
                                <Label>{isThai ? "มือที่ถนัด" : "Preferred Hand"}</Label>
                                <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => toggleHand("left")}
                                        className={cn(
                                            "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                            isHandLeftSelected
                                                ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                            isHandLeftSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <span className="text-sm">✋</span>
                                        </div>
                                        <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างซ้าย" : "Left"}</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => toggleHand("right")}
                                        className={cn(
                                            "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                            isHandRightSelected
                                                ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                            isHandRightSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <span className="text-sm">✋</span>
                                        </div>
                                        <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างขวา" : "Right"}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>{isThai ? "เท้าที่ถนัด" : "Preferred Foot"}</Label>
                                <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => toggleFoot("left")}
                                        className={cn(
                                            "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                            isFootLeftSelected
                                                ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                            isFootLeftSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <span className="text-sm">🦶</span>
                                        </div>
                                        <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างซ้าย" : "Left"}</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => toggleFoot("right")}
                                        className={cn(
                                            "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                            isFootRightSelected
                                                ? "border-primary/50 bg-primary/10 text-primary font-bold ring-1 ring-primary/50"
                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                            isFootRightSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            <span className="text-sm">🦶</span>
                                        </div>
                                        <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างขวา" : "Right"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4 mt-auto">
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="w-full"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isThai ? "กำลังบันทึก..." : "Saving..."}
                                </>
                            ) : (
                                isThai ? "บันทึกการเปลี่ยนแปลง" : "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
