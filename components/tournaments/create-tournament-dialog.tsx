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

export function CreateTournamentDialog() {
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
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> {t("create_tournament")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("create_tournament")}</DialogTitle>
                    <DialogDescription>
                        {t("create_desc")}
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            {t("name")}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Premier League"
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="format" className="text-right">
                            {t("format")}
                        </Label>
                        <Select name="format" defaultValue="league" required>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t("select_format")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="league">{tFormat("league")}</SelectItem>
                                <SelectItem value="league_ha">{tFormat("league")} (Home & Away)</SelectItem>
                                <SelectItem value="group_knockout">{tFormat("group_knockout")}</SelectItem>
                                <SelectItem value="knockout">{tFormat("knockout")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="number_of_pitches" className="text-right">{t("pitches")}</Label>
                        <Input
                            id="number_of_pitches"
                            name="number_of_pitches"
                            type="number"
                            min="1"
                            defaultValue="1"
                            className="col-span-3"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start_date" className="text-right">{t("start_date")}</Label>
                        <Input
                            id="start_date"
                            name="start_date"
                            type="date"
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end_date" className="text-right">{t("end_date")}</Label>
                        <Input
                            id="end_date"
                            name="end_date"
                            type="date"
                            className="col-span-3"
                        />
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
