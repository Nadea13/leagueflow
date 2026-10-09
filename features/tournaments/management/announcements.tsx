"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Announcement } from "@/types/index";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from "@/actions/tournaments/announcement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import { Loader2, Plus, Trash2, Megaphone, Pin, PinOff, MoreVertical } from "lucide-react";
import {
    ActionMenu,
    ActionMenuContent,
    ActionMenuItem,
    ActionMenuTrigger,
} from "@/components/ui/action-menu";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/date";
import { EmptyState } from "@/components/shared/empty-state";

import { AddAnnouncementDialog } from "@/features/dialogs";
import { DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Announcements({
    tournamentId,
    isEditable = true,
    isCompact = false,
    defaultAddOpen = false,
    mode = 'both',
    refreshTrigger,
    onSuccess
}: {
    tournamentId: string,
    isEditable: boolean,
    isCompact?: boolean,
    defaultAddOpen?: boolean,
    mode?: 'both' | 'list' | 'form',
    refreshTrigger?: number,
    onSuccess?: () => void
}) {
    const { toast } = useToast();
    const t = useTranslations("Announcements");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(mode !== 'form');
    const [isDialogOpen, setIsDialogOpen] = useState(defaultAddOpen);
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const result = await getAnnouncements(tournamentId);
            if (result.success && result.data) {
                setAnnouncements(result.data);
            }
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        if (mode === 'form') return;
        let isMounted = true;
        (async () => {
            const result = await getAnnouncements(tournamentId);
            if (isMounted) {
                if (result.success && result.data) {
                    setAnnouncements(result.data);
                }
                setIsLoading(false);
            }
        })();
        return () => { isMounted = false; };
    }, [mode, tournamentId, refreshTrigger]);

    useEffect(() => {
        if (mode === 'form') return;
        const handleSync = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (!customEvent.detail || customEvent.detail === tournamentId) {
                fetchData(false);
            }
        };
        window.addEventListener('announcement-updated', handleSync);
        return () => window.removeEventListener('announcement-updated', handleSync);
    }, [fetchData, mode, tournamentId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSaving(true);
        const savedTitle = title.trim();
        const savedContent = content.trim();

        // Optimistic item
        const tempId = `temp-${Date.now()}`;
        const optimisticItem: Announcement = {
            id: tempId,
            tournament_id: tournamentId,
            title: savedTitle,
            content: savedContent,
            is_pinned: false,
            created_at: new Date().toISOString()
        };

        setAnnouncements(prev => [optimisticItem, ...prev]);

        const result = await addAnnouncement(tournamentId, savedTitle, savedContent);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("posted_success") });
            setTitle("");
            setContent("");
            setIsDialogOpen(false);

            if (result.data) {
                setAnnouncements(prev => [result.data!, ...prev.filter(a => a.id !== tempId && a.id !== result.data!.id)]);
            }

            // Dispatch event to sync all other Announcement components on screen
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('announcement-updated', { detail: tournamentId }));
            }

            if (onSuccess) onSuccess();
            fetchData(false);
        } else {
            // Revert optimistic item if failed
            setAnnouncements(prev => prev.filter(a => a.id !== tempId));
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        setDeleteId(null);

        // Optimistic delete
        setAnnouncements(prev => prev.filter(a => a.id !== id));

        const result = await deleteAnnouncement(id, tournamentId);
        if (result.success) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('announcement-updated', { detail: tournamentId }));
            }
            fetchData(false);
        } else {
            fetchData(false);
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_pinned: !currentlyPinned } : a));
        const res = await toggleAnnouncementPin(id, !currentlyPinned, tournamentId);
        if (res.success) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('announcement-updated', { detail: tournamentId }));
            }
            fetchData(false);
        } else {
            fetchData(false);
        }
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isDialogOpen) {
            const timer = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [isDialogOpen]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isEditable && announcements.length === 0) return null;

    if (mode === 'form') {
        return (
            <form onSubmit={handleAdd} className="flex flex-col h-full overflow-hidden">
                <div ref={scrollContainerRef} className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
                    <div className="space-y-1">
                        <Label htmlFor="announcement-title-mode" className="text-xs font-bold">
                            {locale === "th" ? "หัวข้อประกาศ" : "Announcement Title"} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            size="sm"
                            id="announcement-title-mode"
                            value={title}
                            disabled={isSaving}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t("title_placeholder")}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-bold">
                            {locale === "th" ? "รายละเอียดประกาศ" : "Announcement Content"}
                        </Label>
                        <div className="pro-editor-wrapper relative border rounded-sm overflow-hidden bg-background">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                readOnly={isSaving}
                                className="pro-editor h-auto text-foreground"
                                placeholder={t("content_placeholder")}
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
                    </div>
                </div>
                <DialogFooter className="p-3 sm:p-4 border-t bg-card shrink-0">
                    <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => {
                            if (onSuccess) onSuccess();
                        }}
                    >
                        {locale === "th" ? "ยกเลิก" : "Cancel"}
                    </Button>
                    <Button
                        size="sm"
                        type="submit"
                        disabled={isSaving || !title.trim()}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {locale === "th" ? "กำลังโพสต์..." : "Posting..."}
                            </>
                        ) : (
                            locale === "th" ? "โพสต์ประกาศ" : "Post Announcement"
                        )}
                    </Button>
                </DialogFooter>
            </form>
        );
    }

    if (isCompact && mode === 'list') {
        return (
            <div className="space-y-1 md:space-y-2">
                {announcements.length === 0 ? (
                    <EmptyState
                        icon={Megaphone}
                        title={locale === "th" ? "ยังไม่มีประกาศ" : "No announcements yet"}
                        description={locale === "th" ? "คลิก 'เพิ่มประกาศใหม่' เพื่อเพิ่มประกาศ" : "Click 'New Announcement' to add an announcement"}
                    />
                ) : (
                    <div className="border bg-card rounded-sm divide-y divide-border overflow-hidden">
                        {announcements.map(ann => (
                            <div
                                key={ann.id}
                                className={cn(
                                    "flex items-start justify-between p-4 hover:bg-muted/40 transition-colors gap-2",
                                    ann.is_pinned && "bg-node-4/5"
                                )}
                            >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <div className="h-8 w-8 rounded-full bg-muted/40 flex items-center justify-center shrink-0 border p-0.5 mt-0.5">
                                        <Megaphone className={cn("h-4 w-4", ann.is_pinned ? "text-node-4" : "text-muted-foreground/60")} />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {ann.is_pinned && <Pin className="h-4 w-4 text-node-4 shrink-0 fill-node-4" />}
                                            <span className="text-xs font-bold truncate leading-none mb-1 text-foreground">
                                                {ann.title}
                                            </span>
                                        </div>
                                        {ann.content && (
                                            <div
                                                className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none text-foreground"
                                                dangerouslySetInnerHTML={{ __html: ann.content }}
                                            />
                                        )}
                                        <span className="text-[9px] font-medium text-muted-foreground/50 mt-1">
                                            {formatDate(ann.created_at, "MMM d, HH:mm", locale)}
                                        </span>
                                    </div>
                                </div>
                                {isEditable && (
                                    <ActionMenu>
                                        <ActionMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-foreground shrink-0"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </ActionMenuTrigger>
                                        <ActionMenuContent align="end" className="w-32 bg-card shadow-xl">
                                            <ActionMenuItem
                                                onClick={() => handleTogglePin(ann.id, ann.is_pinned)}
                                                className="cursor-pointer text-xs flex items-center gap-2"
                                            >
                                                {ann.is_pinned ? (
                                                    <>
                                                        <PinOff className="h-4 w-4 text-muted-foreground" />
                                                        <span>{t("unpin")}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pin className="h-4 w-4 text-muted-foreground" />
                                                        <span>{t("pin")}</span>
                                                    </>
                                                )}
                                            </ActionMenuItem>
                                            <ActionMenuItem
                                                onClick={() => setDeleteId(ann.id)}
                                                className="cursor-pointer text-xs flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span>{tCommon("delete")}</span>
                                            </ActionMenuItem>
                                        </ActionMenuContent>
                                    </ActionMenu>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-card space-y-1 lg:space-y-2",
            !isCompact && mode === 'both' && "border p-1 lg:p-2"
        )}>
            {mode === 'both' && (
                <div className="flex items-center justify-end relative z-10">
                    {isEditable && (
                        <AddAnnouncementDialog
                            tournamentId={tournamentId}
                            open={isDialogOpen}
                            onOpenChange={setIsDialogOpen}
                            onSuccess={() => fetchData(false)}
                            trigger={
                                <Button
                                    variant="default"
                                    size={isCompact ? "sm" : "default"}
                                    className={cn("bg-node-4 text-background hover:bg-node-4/90 gap-1.5", isCompact && "h-8 text-xs px-2.5")}
                                >
                                    <Plus className="h-4 w-4" />
                                    {locale === "th" ? "เพิ่มประกาศใหม่" : "New Announcement"}
                                </Button>
                            }
                        />
                    )}
                </div>
            )}

            {/* Announcement List */}
            {announcements.length === 0 ? (
                <EmptyState
                    icon={Megaphone}
                    title={t("no_announcements")}
                    description={t("no_announcements_desc")}
                    className="py-12"
                />
            ) : (
                <div className="border bg-card rounded-sm divide-y divide-border overflow-hidden">
                    {announcements.map(ann => (
                        <div
                            key={ann.id}
                            className={cn(
                                "p-4 transition-all relative overflow-hidden group/item",
                                ann.is_pinned ? "bg-node-4/5" : "hover:bg-muted/30"
                            )}
                        >
                            <div className="flex items-start justify-between gap-1 lg:gap-2 relative z-10">
                                <div className="flex-1 space-y-1 lg:space-y-2">
                                    <div className="flex items-center gap-1 lg:gap-2">
                                        {ann.is_pinned && (
                                            <span className="rotate-315">
                                                <Pin className="h-4 w-4 text-node-4" />
                                            </span>
                                        )}
                                        <h4 className="font-black tracking-tighter text-sm lg:text-base text-foreground group-hover/item:text-node-4 transition-colors line-clamp-1">
                                            {ann.title}
                                        </h4>
                                    </div>

                                    {ann.content && (
                                        <div
                                            className="text-xs lg:text-sm leading-relaxed text-foreground prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: ann.content }}
                                        />
                                    )}

                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-black tracking-widest text-muted-foreground/40">
                                            {formatDate(ann.created_at, "MMM d, yyyy · HH:mm", locale)}
                                        </p>
                                    </div>
                                </div>

                                {isEditable && (
                                    <div className="shrink-0">
                                        <ActionMenu>
                                            <ActionMenuTrigger asChild>
                                                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </ActionMenuTrigger>
                                            <ActionMenuContent align="end">
                                                <ActionMenuItem
                                                    onClick={() => handleTogglePin(ann.id, ann.is_pinned)}
                                                    className="font-bold text-[10px] tracking-widest cursor-pointer"
                                                >
                                                    {ann.is_pinned ? (
                                                        <>
                                                            <PinOff className="h-4 w-4" />
                                                            {t("unpin")}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Pin className="h-4 w-4" />
                                                            {t("pin")}
                                                        </>
                                                    )}
                                                </ActionMenuItem>
                                                <ActionMenuItem
                                                    onClick={() => setDeleteId(ann.id)}
                                                    className="font-bold text-[10px] tracking-widest text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {tCommon("delete")}
                                                </ActionMenuItem>
                                            </ActionMenuContent>
                                        </ActionMenu>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-card border-border/10 shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            {t("delete_announcement")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("delete_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
                        >
                            {tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

