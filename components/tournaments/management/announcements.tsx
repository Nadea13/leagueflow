"use client";

import { useState, useEffect, useCallback } from "react";
import { Announcement } from "@/types/index";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from "@/actions/organizer/tournaments/announcement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Megaphone, Pin, PinOff, MoreVertical, Check } from "lucide-react";
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

export function Announcements({ tournamentId, isEditable = true }: { tournamentId: string, isEditable: boolean }) {
    const { toast } = useToast();
    const t = useTranslations("Announcements");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        const timer = setTimeout(() => {
            fetchData();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchData]);

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

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                        <Megaphone className="h-5 w-5 text-secondary" />
                        {t("title")}
                    </h3>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{t("no_announcements_desc")}</p>
                </div>
                {isEditable && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="rounded-none font-black text-[10px] tracking-widest h-8 shadow-[0_4px_10px_rgba(0,196,154,0.1)] transition-all px-4"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                {t("news")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border/40 rounded-none sm:max-w-[500px] shadow-2xl p-0 overflow-hidden">
                            <DialogHeader className="p-4 md:p-6 pb-0 md:pb-0">
                                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3">
                                    <Megaphone className="h-6 w-6 text-secondary" />
                                    {t("news")}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAdd} className="p-4 md:p-6 space-y-2 md:space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black  tracking-widest text-muted-foreground/60 px-1">{t("title_placeholder")}</label>
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder={t("title_placeholder")}
                                        className="bg-background/50 border-border/20 rounded-none focus-visible:ring-secondary/30 h-11 font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black tracking-widest text-muted-foreground/60 px-1">{t("content_placeholder")}</label>
                                    <Textarea
                                        value={content}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                                        placeholder={t("content_placeholder")}
                                        rows={5}
                                        className="bg-background/50 border-border/20 rounded-none focus-visible:ring-secondary/30 font-medium text-sm min-h-[120px]"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 md:gap-3 border-t border-border/10">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] font-black tracking-widest rounded-none hover:bg-foreground/5 h-10 px-6"
                                        onClick={() => setIsDialogOpen(false)}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="text-[10px] font-black tracking-widest rounded-none bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_15px_rgba(0,196,154,0.2)] h-10 px-8"
                                        disabled={isSaving || !title.trim()}
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                        {t("post")}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Announcement List */}
            {announcements.length === 0 ? (
                <EmptyState
                    icon={Megaphone}
                    title={t("no_announcements")}
                    description={t("no_announcements_desc")}
                    className="py-12 border"
                />
            ) : (
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                    {announcements.map(ann => (
                        <div
                            key={ann.id}
                            className={cn(
                                "p-2 md:p-3 rounded-none border border-border/20 transition-all relative overflow-hidden group/item",
                                ann.is_pinned ? "bg-secondary/[0.03] border-secondary/20" : "bg-card hover:bg-foreground/[0.02] hover:border-border/40"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2 md:gap-3 relative z-10">
                                <div className="flex-1 space-y-2 md:space-y-3">
                                    <div className="flex items-center gap-3">
                                        {ann.is_pinned && (
                                            <div className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-none shadow-[0_0_10px_rgba(0,196,154,0.3)]">
                                                <Pin className="h-2.5 w-2.5" />
                                                <span className="text-[8px] font-black tracking-widest">{t("pinned")}</span>
                                            </div>
                                        )}
                                        <h4 className="font-black tracking-tighter text-sm md:text-base text-foreground group-hover/item:text-secondary transition-colors line-clamp-1">
                                            {ann.title}
                                        </h4>
                                    </div>

                                    {ann.content && (
                                        <p className="text-muted-foreground/80 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {ann.content}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 pt-2">
                                        <p className="text-[9px] font-black tracking-widest text-muted-foreground/40">
                                            {formatDate(ann.created_at, "MMM d, yyyy · HH:mm", locale)}
                                        </p>
                                    </div>
                                </div>

                                {isEditable && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Desktop Actions */}
                                        <div className="hidden md:flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none border border-border/20 hover:bg-secondary/10 hover:text-secondary hover:border-secondary/30 transition-all"
                                                onClick={() => handleTogglePin(ann.id, ann.is_pinned)}
                                                title={ann.is_pinned ? t("unpin") : t("pin")}
                                            >
                                                {ann.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none border border-border/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                                                onClick={() => setDeleteId(ann.id)}
                                                title={tCommon("delete")}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Mobile Actions (3 dots) */}
                                        <div className="md:hidden">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border border-border/20">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-none border-border/40">
                                                    <DropdownMenuItem
                                                        onClick={() => handleTogglePin(ann.id, ann.is_pinned)}
                                                        className="font-bold  text-[10px] tracking-widest"
                                                    >
                                                        {ann.is_pinned ? (
                                                            <>
                                                                <PinOff className="h-3.5 w-3.5 mr-2" />
                                                                {t("unpin")}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Pin className="h-3.5 w-3.5 mr-2" />
                                                                {t("pin")}
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteId(ann.id)}
                                                        className="font-bold text-[10px] tracking-widest text-destructive focus:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                        {tCommon("delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
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
                        <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
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
