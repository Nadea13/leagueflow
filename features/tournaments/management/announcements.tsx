"use client";

import { useState, useEffect, useCallback } from "react";
import { Announcement } from "@/types/index";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from "@/actions/tournaments/announcement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Megaphone, Pin, PinOff, MoreVertical, Check, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/date";
import { EmptyState } from "@/components/shared/empty-state";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";

export function Announcements({
    tournamentId,
    isEditable = true,
    isCompact = false,
    defaultAddOpen = false,
    mode = 'both',
    onSuccess
}: {
    tournamentId: string,
    isEditable: boolean,
    isCompact?: boolean,
    defaultAddOpen?: boolean,
    mode?: 'both' | 'list' | 'form',
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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const result = await getAnnouncements(tournamentId);
        if (result.success && result.data) {
            setAnnouncements(result.data);
        }
        setIsLoading(false);
    }, [tournamentId]);

    useEffect(() => {
        if (mode === 'form') return;
        const timer = setTimeout(() => {
            fetchData();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchData, mode]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSaving(true);
        const result = await addAnnouncement(tournamentId, title, content);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("posted_success") });
            setTitle("");
            setContent("");
            setIsDialogOpen(false);
            if (onSuccess) onSuccess();
            fetchData();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        setDeleteId(null);

        const result = await deleteAnnouncement(id, tournamentId);
        if (result.success) {
            fetchData();
        }
    };

    const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
        await toggleAnnouncementPin(id, !currentlyPinned, tournamentId);
        fetchData();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isEditable && announcements.length === 0) return null;

    if (mode === 'form') {
        return (
            <div className="bg-card flex flex-col h-full overflow-hidden">
                <form onSubmit={handleAdd} className="flex flex-col h-full overflow-hidden">
                    <div className="p-2 md:p-4 space-y-3 md:space-y-4 flex-1 overflow-y-auto">
                        <div className="space-y-1">
                            <Label htmlFor="announcement-title-mode">{t("title_placeholder")}</Label>
                            <Input
                                id="announcement-title-mode"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder={t("title_placeholder")}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="announcement-content-mode">{t("content_placeholder")}</Label>
                            <Textarea
                                id="announcement-content-mode"
                                value={content}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                                placeholder={t("content_placeholder")}
                                className="resize-none min-h-[160px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="border-t p-2 md:p-4 shrink-0">
                        <Button
                            type="submit"
                            className="bg-node-4 w-full"
                            disabled={isSaving || !title.trim()}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t("post")}
                        </Button>
                    </DialogFooter>
                </form>
            </div>
        );
    }

    if (isCompact && mode === 'list') {
        return (
            <div className="space-y-2">
                {announcements.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-center text-muted-foreground">
                            {t("no_announcements")}
                        </p>
                    </div>
                ) : (
                    announcements.map(ann => (
                        <div
                            key={ann.id}
                            className={cn(
                                "p-2 transition-all relative overflow-hidden group/item rounded-sm",
                                ann.is_pinned ? "bg-node-4/5 border-node-4/20 border border-node-4/60" : "border hover:border-node-4/60"
                            )}
                        >
                            <div className="space-y-1 pr-6">
                                <div className="flex items-center gap-2">
                                    {ann.is_pinned && <Pin className="h-3 w-3 text-node-4 shrink-0" />}
                                    <h4 className="font-bold text-[11px] leading-tight text-foreground truncate">
                                        {ann.title}
                                    </h4>
                                </div>
                                {ann.content && (
                                    <p className="text-muted-foreground text-[10px] leading-relaxed font-medium">
                                        {ann.content}
                                    </p>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[8px] font-black tracking-widest text-muted-foreground/30">
                                        {formatDate(ann.created_at, "MMM d, HH:mm", locale)}
                                    </span>
                                </div>
                            </div>
                            {isEditable && (
                                <div className="absolute top-1.5 right-1.5 z-10">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-muted"
                                            >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-36 bg-card border shadow-xl p-1">
                                            <DropdownMenuItem
                                                onClick={() => handleTogglePin(ann.id, ann.is_pinned)}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-1.5"
                                            >
                                                {ann.is_pinned ? (
                                                    <>
                                                        <PinOff className="h-3.5 w-3.5" />
                                                        <span>{t("unpin")}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pin className="h-3.5 w-3.5" />
                                                        <span>{t("pin")}</span>
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setDeleteId(ann.id)}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-1.5 text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>{tCommon("delete")}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                    ))
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
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="default"
                                    size={isCompact ? "sm" : "default"}
                                    className={cn("bg-node-4 text-background hover:bg-node-4/90", isCompact && "h-7 text-xs px-2.5")}
                                >
                                    <Plus className="h-4 w-4" />
                                    {t("news")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent showCloseButton={false} className="w-full h-full sm:h-auto sm:max-w-[640px] max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 shadow-2xl rounded-none sm:rounded-sm">
                                <DialogHeader className="p-2 md:p-4 border-b relative pr-10 shrink-0">
                                    <DialogTitle className="text-lg font-black tracking-tighter">{t("news")}</DialogTitle>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="absolute right-2 top-2"
                                        onClick={() => setIsDialogOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </DialogHeader>
                                <form onSubmit={handleAdd} className="flex flex-col h-full overflow-hidden">
                                    <div className="p-2 md:p-4 space-y-3 md:space-y-4 flex-1 overflow-y-auto">
                                        <div className="space-y-1">
                                            <Label htmlFor="announcement-title">{t("title_placeholder")}</Label>
                                            <Input
                                                id="announcement-title"
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                placeholder={t("title_placeholder")}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="announcement-content">{t("content_placeholder")}</Label>
                                            <Textarea
                                                id="announcement-content"
                                                value={content}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                                                placeholder={t("content_placeholder")}
                                                rows={5}
                                                className="resize-none min-h-[120px]"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="border-t p-2 md:p-4 shrink-0">
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={isSaving || !title.trim()}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                            {t("post")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
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
                <div className="grid grid-cols-1 gap-1 lg:gap-2">
                    {announcements.map(ann => (
                        <div
                            key={ann.id}
                            className={cn(
                                "p-1 lg:p-2 border transition-all relative overflow-hidden group/item rounded-sm",
                                ann.is_pinned ? "border-node-4/50" : "bg-card"
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
                                        <p className="text-muted-foreground/80 text-xs lg:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {ann.content}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-black tracking-widest text-muted-foreground/40">
                                            {formatDate(ann.created_at, "MMM d, yyyy · HH:mm", locale)}
                                        </p>
                                    </div>
                                </div>

                                {isEditable && (
                                    <div className="shrink-0">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
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
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setDeleteId(ann.id)}
                                                    className="font-bold text-[10px] tracking-widest text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {tCommon("delete")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
                            <Trash2 className="h-5 w-5 text-destructive" />
                            {t("delete_announcement")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("delete_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            className="border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {tCommon("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
