"use client";

import { useState, useEffect } from "react";
import { Announcement } from "@/types/index";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from "@/app/[locale]/dashboard/tournaments/[id]/announcement-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Megaphone, Pin, PinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface AnnouncementsCardProps {
    tournamentId: string;
    isEditable?: boolean;
}

export function AnnouncementsCard({ tournamentId, isEditable = true }: AnnouncementsCardProps) {
    const { toast } = useToast();
    const t = useTranslations("Announcements");
    const tCommon = useTranslations("Common");
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        const result = await getAnnouncements(tournamentId);
        if (result.success && result.data) {
            setAnnouncements(result.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [tournamentId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSaving(true);
        const result = await addAnnouncement(tournamentId, title, content);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("posted_success") });
            setTitle("");
            setContent("");
            setShowForm(false);
            fetchData();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("delete_confirm"))) return;
        const result = await deleteAnnouncement(id, tournamentId);
        if (result.success) {
            fetchData();
        }
    };

    const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
        await toggleAnnouncementPin(id, !currentlyPinned, tournamentId);
        fetchData();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
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
        <div className="space-y-4 border rounded-none p-6 bg-background shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    {t("title")}
                </h3>
                {isEditable && (
                    <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t("new")}
                    </Button>
                )}
            </div>

            {/* Add Form */}
            {showForm && isEditable && (
                <form onSubmit={handleAdd} className="p-4 border rounded-none bg-muted/20 space-y-3">
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder={t("title_placeholder")}
                        required
                    />
                    <Textarea
                        value={content}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                        placeholder={t("content_placeholder")}
                        rows={3}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>{tCommon("cancel")}</Button>
                        <Button type="submit" size="sm" disabled={isSaving || !title.trim()}>
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            {t("post")}
                        </Button>
                    </div>
                </form>
            )}

            {/* Announcement List */}
            {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                    <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                        <Megaphone className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t("title")}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        {t("no_announcements")}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {announcements.map(ann => (
                        <div
                            key={ann.id}
                            className={cn(
                                "p-3 rounded-none border text-sm",
                                ann.is_pinned && "border-primary/30 bg-primary/5"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {ann.is_pinned && (
                                            <Badge variant="outline" className="text-[10px] h-4">
                                                <Pin className="h-2 w-2 mr-0.5" />
                                                {t("pinned")}
                                            </Badge>
                                        )}
                                        <h4 className="font-medium">{ann.title}</h4>
                                    </div>
                                    {ann.content && (
                                        <p className="text-muted-foreground text-xs whitespace-pre-wrap">{ann.content}</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(ann.created_at)}</p>
                                </div>
                                {isEditable && (
                                    <div className="flex gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleTogglePin(ann.id, ann.is_pinned)}
                                        >
                                            {ann.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleDelete(ann.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
