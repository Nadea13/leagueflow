"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGlobalPlayerInfo, updateGlobalPlayerPhoto } from "@/actions/tournaments/master-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { AlertCircle, Loader2 } from "lucide-react";

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

        if ((!editFirstNameTh && !editFirstNameEn) || (!editLastNameTh && !editLastNameEn) || !editGender || !editBirthday) {
            setEditError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
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
                setEditError(res.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
                return;
            }

            let updatedPhotoUrl = editPreviewUrl === null ? null : currentPlayer.profile_img;

            // 2. Upload photo if selected
            if (editPhotoFile) {
                const photoData = new FormData();
                photoData.append("photo", editPhotoFile);
                const photoRes = await updateGlobalPlayerPhoto(currentPlayer.id, photoData);
                if (!photoRes.success) {
                    setEditError(photoRes.error || "แก้ไขข้อมูลสำเร็จ แต่ไม่สามารถอัปโหลดรูปภาพได้");
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                <form key={open ? `open-${masterPlayer?.id}` : 'closed'} onSubmit={handleSaveEdit}>
                    <div className="relative p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">
                                แก้ไขข้อมูลทะเบียนนักกีฬา
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                แก้ไขรายละเอียดโปรไฟล์นักกีฬาของคุณ
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-2 space-y-2 md:p-4 md:space-y-4">
                        {editError && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-shake">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{editError}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <Label>รูปโปรไฟล์</Label>
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
                                uploadLabel="อัปโหลดรูปภาพ"
                                clickToUploadLabel="เปลี่ยนรูปภาพ"
                                previewLabel="รูปตัวอย่าง"
                                imageFit="cover"
                            />
                        </div>

                        {/* Thai Name */}
                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                            <div className="space-y-1">
                                <Label>ชื่อจริง <span className="text-destructive">*</span></Label>
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
                                <Label>ชื่อกลาง</Label>
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
                                <Label>นามสกุล <span className="text-destructive">*</span></Label>
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
                                <Label>First Name <span className="text-destructive">*</span></Label>
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
                                <Label>Middle Name</Label>
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
                                <Label>Last Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="editLastNameEn"
                                    type="text"
                                    value={editLastNameEn}
                                    onChange={(e) => setEditLastNameEn(e.target.value)}
                                    disabled={isPending}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 flex flex-col justify-end">
                                <Label>เพศ <span className="text-destructive">*</span></Label>
                                <Select value={editGender} onValueChange={setEditGender} disabled={isPending}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="เลือกเพศ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male" className="font-bold text-xs tracking-tighter">ชาย (Male)</SelectItem>
                                        <SelectItem value="female" className="font-bold text-xs tracking-tighter">หญิง (Female)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>วัน/เดือน/ปีเกิด <span className="text-destructive">*</span></Label>
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
                            <Label>เบอร์โทรศัพท์ติดต่อ</Label>
                            <Input
                                id="editTel"
                                type="tel"
                                value={editTel}
                                onChange={(e) => setEditTel(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4 gap-2">
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="w-full"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                "บันทึกการเปลี่ยนแปลง"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
