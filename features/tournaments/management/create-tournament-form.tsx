"use client";

import { useActionState, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trophy } from "lucide-react";
import { createTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
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
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse, SportType, Sport } from "@/types/index";

import { getSports } from "@/actions/manager/team";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function TournamentCreate() {
    const t = useTranslations("Dialog");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(createTournament, initialState);
    const [sportsList, setSportsList] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>("");

    // Load sports dynamically from database
    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data) {
                setSportsList(res.data);
                if (res.data.length > 0) {
                    setSelectedSport(res.data[0].id);
                }
            }
        }
        if (open) {
            loadSports();
        }
    }, [open]);

    // Close dialog on success
    useEffect(() => {
        if (state.success && open) {
            const timer = setTimeout(() => setOpen(false), 0);
            return () => clearTimeout(timer);
        }
    }, [state.success, open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4" />
                    <span>{t("create_button")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col bg-background p-0 rounded-xl shadow-2xl">
                <form action={formAction}>
                    {/* Premium Header */}
                    <div className="p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">
                                {t("create_title")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                {t("create_desc")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4 no-scrollbar">
                        <div className="space-y-1">
                            <Label>{t("name")}</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder={t("name_placeholder")}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")}</Label>
                            <Select name="sport_id" value={selectedSport} onValueChange={setSelectedSport}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("select_sport")} />
                                </SelectTrigger>
                                <SelectContent className="border-border">
                                    {sportsList.map((sport) => (
                                        <SelectItem key={sport.id} value={sport.id} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                            {sport.sport_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("document_deadline")}</Label>
                            <Input
                                id="document_deadline"
                                name="document_deadline"
                                type="date" required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:gap-4">
                            <div className="space-y-1">
                                <Label>{t("start_date")}</Label>
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    type="date"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("end_date")}</Label>
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    type="date"
                                    required
                                />
                            </div>
                        </div>

                        {state.error && (
                            <div className="text-xs font-bold text-red-500 bg-red-500/10 p-4 border-l-4 border-red-500">
                                {state.error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4">
                        <SubmitButton className="w-full">
                            {isPending ? t("creating") : t("create_button")}
                        </SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
