"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { addAnnouncement } from "@/actions/tournaments/announcement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/ui/header";
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
import { Loader2, Plus, Megaphone, FileText } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface AddAnnouncementDialogProps {
    tournamentId: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function AddAnnouncementDialog({
    tournamentId,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    trigger,
}: AddAnnouncementDialogProps) {
    const { toast } = useToast();
    const t = useTranslations("Announcements");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";

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

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setTitle("");
            setContent("");
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const savedTitle = title.trim();
        const savedContent = content.trim();
        if (!savedTitle) return;

        setIsSaving(true);
        try {
            const result = await addAnnouncement(tournamentId, savedTitle, savedContent);
            if (result.success) {
                toast({
                    title: tCommon("success"),
                    description: t("posted_success") || (isThai ? "โพสต์ประกาศเรียบร้อยแล้ว" : "Announcement posted successfully"),
                });
                setTitle("");
                setContent("");
                setOpen(false);

                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("announcement-updated", { detail: tournamentId }));
                }

                if (onSuccess) onSuccess();
            } else {
                toast({
                    title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                    description: result.error || (isThai ? "ไม่สามารถโพสต์ประกาศได้" : "Failed to post announcement"),
                    variant: "destructive",
                });
            }
        } catch (error: unknown) {
            toast({
                title: isThai ? "เกิดข้อผิดพลาด" : "Error",
                description: error instanceof Error ? error.message : "Unexpected error",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
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
                        className="bg-node-4 text-background hover:bg-node-4/90 h-8 text-xs px-2.5 gap-1 shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                        {isThai ? "เพิ่มประกาศใหม่" : "New Announcement"}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[760px] sm:max-h-[88vh] p-0 flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="p-4 border-b shrink-0 bg-card">
                        <DialogTitle asChild>
                            <Header level={4}>
                                {isThai ? "เพิ่มประกาศใหม่" : "New Announcement"}
                            </Header>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            {isThai
                                ? "สร้างและเผยแพร่ข่าวสารหรือประกาศสำคัญสำหรับการแข่งขันนี้"
                                : "Create and publish announcements or updates for this tournament."}
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 min-h-0 overflow-y-auto p-4"
                    >
                        {/* 1. Announcement Title */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <Megaphone className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {isThai ? "หัวข้อประกาศ" : "Announcement Title"} <span className="text-destructive">*</span>
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "หัวข้อหลักของข่าวสารหรือการแจ้งเตือน" : "Title or headline of your announcement"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <Input
                                    id="announcement-title"
                                    size="sm"
                                    value={title}
                                    disabled={isSaving}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t("title_placeholder") || (isThai ? "ระบุหัวข้อประกาศ..." : "Enter announcement title...")}
                                    required
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 2. Announcement Content */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between px-4 py-2">
                            <div className="flex items-start gap-3 sm:gap-4 sm:w-1/2">
                                <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                                    <FileText className="size-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <Header level={6}>
                                        {isThai ? "รายละเอียดประกาศ" : "Announcement Content"}
                                    </Header>
                                    <p className="text-xs text-muted-foreground">
                                        {isThai ? "ข้อความและรายละเอียดของประกาศอย่างละเอียด" : "Detailed message and formatting for your announcement"}
                                    </p>
                                </div>
                            </div>
                            <div className="sm:w-1/2 w-full">
                                <div className="pro-editor-wrapper relative w-full border border-border rounded-sm overflow-hidden bg-transparent">
                                    <ReactQuill
                                        theme="snow"
                                        value={content}
                                        onChange={setContent}
                                        readOnly={isSaving}
                                        className="pro-editor h-auto text-foreground"
                                        placeholder={t("content_placeholder") || (isThai ? "เขียนรายละเอียดประกาศที่นี่..." : "Write announcement details here...")}
                                        modules={{
                                            toolbar: [
                                                [{ header: [1, 2, false] }],
                                                ["bold", "underline"],
                                                [{ list: "ordered" }, { list: "bullet" }],
                                                ["clean"],
                                            ],
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t bg-card shrink-0 flex flex-row items-center justify-end gap-2">
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            disabled={isSaving}
                            onClick={() => setOpen(false)}
                        >
                            {isThai ? "ยกเลิก" : "Cancel"}
                        </Button>
                        <Button
                            size="sm"
                            type="submit"
                            disabled={isSaving || !title.trim()}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    {isThai ? "กำลังโพสต์..." : "Posting..."}
                                </>
                            ) : (
                                isThai ? "โพสต์ประกาศ" : "Post Announcement"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
