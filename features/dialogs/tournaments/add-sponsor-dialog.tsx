"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { addSponsor, updateSponsor, Sponsor } from "@/actions/tournaments/sponsor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUploader } from "@/components/shared/logo-uploader";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ImageIcon } from "lucide-react";

interface AddSponsorDialogProps {
    tournamentId: string;
    sponsorToEdit?: Sponsor | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function AddSponsorDialog({
    tournamentId,
    sponsorToEdit,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    trigger,
}: AddSponsorDialogProps) {
    const { toast } = useToast();
    const tSponsors = useTranslations("Sponsors");
    const locale = useLocale();
    const isThai = locale === "th";
    const isEditing = !!sponsorToEdit;

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = (val: boolean) => {
        if (isControlled) {
            controlledOnOpenChange?.(val);
        } else {
            setUncontrolledOpen(val);
        }
    };

    const [sponsorName, setSponsorName] = useState("");
    const [sponsorLink, setSponsorLink] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Initialize or reset form state
    useEffect(() => {
        if (open) {
            if (sponsorToEdit) {
                setSponsorName(sponsorToEdit.sponsor_name || "");
                setSponsorLink(sponsorToEdit.link_url || "");
                setLogoUrl(sponsorToEdit.logo_img || null);
                setLogoFile(null);
                setCoverUrl(sponsorToEdit.cover_url || null);
                setCoverFile(null);
            } else {
                setSponsorName("");
                setSponsorLink("");
                setLogoFile(null);
                setLogoUrl(null);
                setCoverFile(null);
                setCoverUrl(null);
            }

            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = 0;
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [open, sponsorToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = sponsorName.trim();
        if (!trimmedName) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("sponsorName", trimmedName);
            if (sponsorLink) formData.append("linkUrl", sponsorLink.trim());

            if (isEditing && sponsorToEdit) {
                if (logoFile) {
                    formData.append("logoFile", logoFile);
                } else if (logoUrl) {
                    formData.append("logoUrl", logoUrl);
                }
                if (coverFile) {
                    formData.append("coverFile", coverFile);
                } else if (coverUrl) {
                    formData.append("coverUrl", coverUrl);
                }

                const res = await updateSponsor(sponsorToEdit.id, tournamentId, trimmedName, formData, sponsorLink.trim());
                if (res.success) {
                    toast({
                        title: isThai ? "แก้ไขผู้สนับสนุนสำเร็จ" : "Sponsor updated",
                        description: isThai ? "บันทึกการแก้ไขข้อมูลผู้สนับสนุนเรียบร้อยแล้ว" : "The sponsor has been updated successfully."
                    });
                    setOpen(false);
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("reload-sponsors"));
                    }
                    if (onSuccess) onSuccess();
                } else {
                    toast({
                        title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                        description: res.error || (isThai ? "ไม่สามารถแก้ไขข้อมูลผู้สนับสนุนได้" : "Failed to update sponsor"),
                        variant: "destructive"
                    });
                }
            } else {
                if (logoFile) formData.append("logoFile", logoFile);
                if (coverFile) formData.append("coverFile", coverFile);
                else if (coverUrl) formData.append("coverUrl", coverUrl);

                const res = await addSponsor(tournamentId, trimmedName, formData, sponsorLink.trim());
                if (res.success) {
                    toast({
                        title: isThai ? "เพิ่มผู้สนับสนุนสำเร็จ" : "Sponsor added",
                        description: isThai ? "เพิ่มผู้สนับสนุนเข้าสู่การแข่งขันเรียบร้อยแล้ว" : "The sponsor has been added successfully."
                    });
                    setOpen(false);
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("reload-sponsors"));
                    }
                    if (onSuccess) onSuccess();
                } else {
                    toast({
                        title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                        description: res.error || (isThai ? "ไม่สามารถเพิ่มผู้สนับสนุนได้" : "Failed to add sponsor"),
                        variant: "destructive"
                    });
                }
            }
        } catch (error: unknown) {
            toast({
                title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                description: error instanceof Error ? error.message : "Failed to process sponsor",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== undefined ? (
                trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null
            ) : (
                <DialogTrigger asChild>
                    <Button
                        variant="default"
                        size="sm"
                        className="bg-red-500 text-white hover:bg-red-600 h-8 text-xs px-2.5 gap-1 shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        {isThai ? "เพิ่มผู้สนับสนุนใหม่" : "New Sponsor"}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing
                                ? (tSponsors("edit_title") || (isThai ? "แก้ไขผู้สนับสนุน" : "Edit Sponsor"))
                                : (isThai ? "เพิ่มผู้สนับสนุนใหม่" : "New Sponsor")}
                        </DialogTitle>
                        <DialogDescription>
                            {isThai
                                ? "กำหนดรูปโลโก้ ภาพหน้าปก แบนเนอร์ และลิงก์สำหรับผู้สนับสนุนการแข่งขัน"
                                : "Configure sponsor logo, banner image, and external link."}
                        </DialogDescription>
                    </DialogHeader>

                    <div ref={scrollRef} className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                        {/* Cover & Logo Section */}
                        <div className="space-y-1">
                            <div className="relative pb-10">
                                <div
                                    onClick={() => coverInputRef.current?.click()}
                                    className="relative aspect-[2/1] w-full border border-dashed border-border hover:border-primary/50 transition-all rounded-sm overflow-hidden flex flex-col items-center justify-center cursor-pointer group bg-transparent"
                                >
                                    {coverUrl ? (
                                        <>
                                            <Image
                                                src={coverUrl}
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
                                                        setCoverFile(null);
                                                        setCoverUrl(null);
                                                        if (coverInputRef.current) coverInputRef.current.value = "";
                                                    }}
                                                >
                                                    {isThai ? "ลบรูป" : "Remove"}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 pb-12">
                                            <div className="group p-3 bg-transparent rounded-full text-muted-foreground border border-border transition-transform group-hover:border-primary/50 group-hover:text-primary">
                                                <ImageIcon className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-muted-foreground">
                                                    {isThai ? "คลิกเพื่ออัปโหลดภาพหน้าปก" : "Click to upload cover banner"}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground/60">
                                                    (1440x720)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 rounded-full">
                                    <LogoUploader
                                        id={isEditing ? "edit-sponsor-logo-upload" : "sponsor-logo-upload"}
                                        initialUrl={logoUrl}
                                        onFileChange={(file: File | null) => {
                                            setLogoFile(file);
                                            if (file) {
                                                setLogoUrl(URL.createObjectURL(file));
                                            } else {
                                                setLogoUrl(null);
                                            }
                                        }}
                                        onRemove={() => {
                                            setLogoFile(null);
                                            setLogoUrl(null);
                                        }}
                                        disabled={isSubmitting}
                                        uploadLabel={isThai ? "อัปโหลดโลโก้" : "Upload Logo"}
                                        clickToUploadLabel={isThai ? "คลิกเพื่อเปลี่ยน" : "Click to Change"}
                                        previewLabel={isThai ? "ตัวอย่าง" : "Preview"}
                                        imageFit="contain"
                                    />
                                </div>

                                <input
                                    ref={coverInputRef}
                                    id={isEditing ? "edit-sponsor-cover-upload" : "sponsor-cover-upload"}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setCoverFile(file);
                                            setCoverUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="sponsor-name-input">
                                {tSponsors("name_label") || (isThai ? "ชื่อผู้สนับสนุน" : "Sponsor Name")} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="sponsor-name-input"
                                size="sm"
                                value={sponsorName}
                                onChange={(e) => setSponsorName(e.target.value)}
                                placeholder={tSponsors("name_placeholder") || (isThai ? "ระบุชื่อผู้สนับสนุน..." : "Enter sponsor name...")}
                                required
                                className="bg-transparent"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="sponsor-link-input">
                                {tSponsors("link_label") || (isThai ? "ลิงก์เว็บไซต์" : "Website URL")}
                            </Label>
                            <Input
                                id="sponsor-link-input"
                                size="sm"
                                value={sponsorLink}
                                onChange={(e) => setSponsorLink(e.target.value)}
                                placeholder={tSponsors("link_placeholder") || "https://example.com"}
                                type="url"
                                className="bg-transparent"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button
                            size="sm"
                            type="submit"
                            disabled={isSubmitting || !sponsorName.trim()}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isEditing
                                ? (tSponsors("edit_button") || (isThai ? "บันทึก" : "Save Changes"))
                                : (tSponsors("add_button") || (isThai ? "เพิ่มผู้สนับสนุน" : "Add Sponsor"))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
