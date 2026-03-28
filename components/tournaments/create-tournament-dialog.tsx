"use client";

import { useActionState, useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";

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
    const [format, setFormat] = useState("league");
    const [state, formAction, isPending] = useActionState(createTournament, initialState);

    // Close dialog on success
    useEffect(() => {
        if (state.success && open) {
            setOpen(false);
        }
    }, [state.success, open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("create_button")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("create_title")}</DialogTitle>
                    <DialogDescription>
                        {t("create_desc")}
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t("name")}</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t("name_placeholder")}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="format">{t("format")}</Label>
                        <Select
                            name="format"
                            defaultValue="league"
                            onValueChange={(v) => setFormat(v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("select_format")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="league">{tFormat("league")}</SelectItem>
                                <SelectItem value="league_ha">{tFormat("league_ha")}</SelectItem>
                                <SelectItem value="knockout">{tFormat("knockout")}</SelectItem>
                                <SelectItem value="group_knockout" disabled={!isPro}>
                                    {tFormat("group_knockout")} {!isPro && "(PRO)"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="number_of_pitches">{t("pitches")}</Label>
                            <Input
                                id="number_of_pitches"
                                name="number_of_pitches"
                                type="number"
                                defaultValue={1}
                                min={1}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="max_teams" className="flex items-center justify-between">
                                {t("max_teams")}
                                {!isPro && (
                                    <span className="text-[10px] text-primary font-bold uppercase tracking-tighter bg-primary/10 px-1 rounded">
                                        Max 8
                                    </span>
                                )}
                            </Label>
                            <Input
                                id="max_teams"
                                name="max_teams"
                                type="number"
                                defaultValue={8}
                                min={2}
                                max={isPro ? 128 : 8}
                                required
                            />
                        </div>
                    </div>

                    {format === "group_knockout" && (
                        <div className="grid gap-2">
                            <Label htmlFor="advancing_teams">{t("advancing_teams")}</Label>
                            <Select name="advancing_teams" defaultValue="2">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start_date">{t("start_date")}</Label>
                            <Input id="start_date" name="start_date" type="date" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end_date">{t("end_date")}</Label>
                            <Input id="end_date" name="end_date" type="date" required />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="document_deadline">{t("document_deadline")}</Label>
                        <Input id="document_deadline" name="document_deadline" type="date" required />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">{t("description")}</Label>
                        <Textarea 
                            id="description" 
                            name="description" 
                            placeholder={t("description_placeholder")}
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    {state.error && (
                        <p className="text-sm font-medium text-destructive">{state.error}</p>
                    )}

                    <DialogFooter className="pt-4">
                        <SubmitButton className="w-full">
                            {isPending ? t("creating") : t("create_button")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
