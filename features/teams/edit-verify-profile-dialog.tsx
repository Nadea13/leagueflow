"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { updateGlobalPlayerInfo, updateGlobalPlayerPhoto } from "@/actions/tournaments/master-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { AlertCircle, Loader2, X } from "lucide-react";

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
    const [editTel, setEditTel] = useState(masterPlayer?.tel || "");
    const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(masterPlayer?.profile_img || null);
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const [editError, setEditError] = useState<string | null>(null);

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
                        tel: editTel
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
                profile_img: updatedPhotoUrl
            });

            onOpenChange(false);
            router.refresh();
        });
    };

    const isThai = locale === 'th';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] bg-card p-0 overflow-hidden shadow-2xl rounded-sm">
                <form key={open ? `open-${masterPlayer?.id}` : 'closed'} onSubmit={handleSaveEdit}>
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

                    <div className="p-2 space-y-2 md:p-4 md:space-y-4">
                        {editError && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-shake">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{editError}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <Label>{isThai ? "รูปโปรไฟล์" : "Profile Picture"}</Label>
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
                                    className="bg-transparent text-foreground focus-visible:ring-0 text-xs"
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 flex flex-col justify-end">
                                <Label>{isThai ? "เพศ" : "Gender"} <span className="text-destructive">*</span></Label>
                                <Select value={editGender} onValueChange={setEditGender} disabled={isPending}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={isThai ? "เลือกเพศ" : "Select Gender"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male" className="font-bold text-xs tracking-tighter">{isThai ? "ชาย (Male)" : "Male"}</SelectItem>
                                        <SelectItem value="female" className="font-bold text-xs tracking-tighter">{isThai ? "หญิง (Female)" : "Female"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>{isThai ? "วัน/เดือน/ปีเกิด" : "Date of Birth"} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="editBirthday"
                                    type="date"
                                    required
                                    value={editBirthday}
                                    onChange={(e) => setEditBirthday(e.target.value)}
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
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <DialogFooter>
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
