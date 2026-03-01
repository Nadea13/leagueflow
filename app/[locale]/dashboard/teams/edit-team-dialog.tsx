"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Upload, Trash2, Loader2 } from "lucide-react";
import { updateTeamGlobal, deleteTeamGlobal } from "./actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
// Import Select components if not imported
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@/types/index";

interface TournamentOption {
    id: string;
    name: string;
}

export function EditTeamDialog({ team, tournaments }: { team: Team, tournaments: TournamentOption[] }) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [previewUrl, setPreviewUrl] = useState<string | null>(team.logo_url || null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleUpdate = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateTeamGlobal(team.id, formData, team.tournament_id || ""); // Pass current one as fallback for revalidation basics, but logic handles update
            if (result.success) {
                setOpen(false);
            } else {
                alert(result.error);
            }
        });
    };

    const handleDelete = async () => {
        startTransition(async () => {
            const result = await deleteTeamGlobal(team.id, team.tournament_id || "");
            if (result.success) {
                setOpen(false);
                setDeleteConfirmOpen(false);
            } else {
                alert(result.error);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="w-full">
                    {tCommon("edit")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!deleteConfirmOpen ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t("edit_team")}</DialogTitle>
                            <DialogDescription>
                                {t("team_name")}
                            </DialogDescription>
                        </DialogHeader>
                        <form action={handleUpdate} className="grid gap-4 pt-4">
                            <input type="hidden" name="existing_logo_url" value={team.logo_url || ""} />

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="tournament_id" className="text-right">
                                    {tCommon("tournament")}
                                </Label>
                                <Select name="tournament_id" defaultValue={team.tournament_id || undefined}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={tCommon("no_tournament_placeholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">{tCommon("no_tournament")}</SelectItem>
                                        {tournaments.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    {t("team_name")}
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={team.name}
                                    className="col-span-3"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="logo" className="text-right">
                                    {t("upload_logo")}
                                </Label>
                                <div className="col-span-3">
                                    <div className="flex items-center gap-4">
                                        {previewUrl && (
                                            <img
                                                src={previewUrl}
                                                alt={tCommon("preview")}
                                                className="h-10 w-10 object-contain rounded-none border bg-muted"
                                            />
                                        )}
                                        <Label
                                            htmlFor="edit-logo"
                                            className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {previewUrl ? t("click_to_upload") : t("upload_logo")}
                                        </Label>
                                        <Input
                                            id="edit-logo"
                                            name="logo"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => setDeleteConfirmOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {tCommon("save")}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>{tCommon("delete")}</DialogTitle>
                            <DialogDescription>
                                {tCommon("delete")} {team.name}?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isPending}>
                                {tCommon("cancel")}
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                                {isPending ? tCommon("loading") : tCommon("delete")}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
