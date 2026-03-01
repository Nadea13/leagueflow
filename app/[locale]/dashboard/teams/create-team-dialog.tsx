"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Upload } from "lucide-react";
import { createTeamGlobal } from "./actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { ActionResponse } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface TournamentOption {
    id: string;
    name: string;
}

export function CreateTeamDialog({ tournaments, defaultTournamentId }: { tournaments: TournamentOption[], defaultTournamentId?: string }) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(createTeamGlobal, initialState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Close dialog on success
    if (state?.success && open) {
        setOpen(false);
        setPreviewUrl(null);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("add_team")}</DialogTitle>
                    <DialogDescription>
                        {t("no_teams_desc")}
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="grid gap-4 pt-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tournament_id" className="text-right">
                            {tCommon("tournament")}
                        </Label>
                        <Select name="tournament_id" defaultValue={defaultTournamentId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={tCommon("no_tournament_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
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
                            placeholder={t("team_name_placeholder")}
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
                                    htmlFor="logo"
                                    className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {previewUrl ? t("click_to_upload") : t("upload_logo")}
                                </Label>
                                <Input
                                    id="logo"
                                    name="logo"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-sm text-red-500 text-center">
                            {state.error}
                        </div>
                    )}

                    <DialogFooter>
                        <SubmitButton>{tCommon("create_btn")}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
