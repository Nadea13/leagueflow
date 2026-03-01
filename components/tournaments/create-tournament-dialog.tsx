"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { createTournament } from "@/app/[locale]/dashboard/actions";
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

export function CreateTournamentDialog({ isPro = false }: { isPro?: boolean }) {
    const t = useTranslations("Dialog");
    const tFormat = useTranslations("Format");
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(createTournament, initialState);

    // Close dialog on success
    if (state?.success && open) {
        setOpen(false);
        // Reset state ideally, but simpler to just let it re-mount or manual close
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("create_tournament")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("create_tournament")}</DialogTitle>
                    <DialogDescription>
                        {t("create_desc")}
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">
                            {t("name")}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t("name_placeholder")}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="format">
                            {t("format")}
                        </Label>
                        <Select name="format" defaultValue="league" required>
                            <SelectTrigger>
                                <SelectValue placeholder={t("select_format")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="league">{tFormat("league")}</SelectItem>
                                <SelectItem value="league_ha">{tFormat("league")} (Home & Away)</SelectItem>
                                <SelectItem value="group_knockout" disabled={!isPro}>
                                    {tFormat("group_knockout")} {!isPro && t("pro_only")}
                                </SelectItem>
                                <SelectItem value="knockout">{tFormat("knockout")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="number_of_pitches">{t("pitches")}</Label>
                        <Input
                            id="number_of_pitches"
                            name="number_of_pitches"
                            type="number"
                            min="1"
                            defaultValue="1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start_date">{t("start_date")}</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="date"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end_date">{t("end_date")}</Label>
                            <Input
                                id="end_date"
                                name="end_date"
                                type="date"
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-sm text-red-500 text-center">
                            {state.error}
                        </div>
                    )}

                    <DialogFooter>
                        <SubmitButton>{t("create")}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
