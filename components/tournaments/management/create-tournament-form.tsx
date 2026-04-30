"use client";

import { useActionState, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trophy } from "lucide-react";
import { createTournament } from "@/actions/organizer/dashboard";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse, SportType } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function TournamentCreate({ isPro = false }: { isPro?: boolean }) {
    const t = useTranslations("Dialog");
    const tFormat = useTranslations("Format");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const [open, setOpen] = useState(false);
    const [format, setFormat] = useState("league");
    const [state, formAction, isPending] = useActionState(createTournament, initialState);

    // Close dialog on success
    useEffect(() => {
        if (state.success && open) {
            const timer = setTimeout(() => setOpen(false), 0);
            return () => clearTimeout(timer);
        }
    }, [state.success, open]);

    const labelStyle = "text-[10px] font-black tracking-widest text-primary";
    const inputStyle = "bg-transparent border-t-0 border-x-0 border-border/40 rounded-none text-foreground h-12 focus-visible:ring-0 px-0 placeholder:text-muted-foreground/30 font-bold tracking-tighter";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="sm:gap-2 h-8 w-8 md:h-full md:w-full shadow-[0_0_20px_rgba(0,196,154,0.2)] hover:shadow-[0_0_30px_rgba(0,196,154,0.4)] transition-all">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("create_button")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col bg-background border-border rounded-none p-0 shadow-2xl">
                {/* Premium Header */}
                <div className="bg-gradient-to-r from-primary/20 to-background p-6 border-b border-border relative shrink-0">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <Trophy className="h-5 w-5 text-primary" />
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">
                                {t("create_title")}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-muted-foreground font-medium text-xs">
                            {t("create_desc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form action={formAction} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    <div className="space-y-3">
                        <Label htmlFor="name" className={labelStyle}>
                            {t("name")}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t("name_placeholder")}
                            className={inputStyle}
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="sport" className={labelStyle}>
                            {tCommon("sport")}
                        </Label>
                        <Select name="sport" defaultValue="football">
                            <SelectTrigger className="bg-transparent border-t-0 border-x-0 border-border/40 rounded-none text-foreground h-12 focus:ring-0 px-0 font-bold tracking-tighter">
                                <SelectValue placeholder={t("select_sport")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-border">
                                {(['football'] as SportType[]).map((sportKey) => (
                                    <SelectItem key={sportKey} value={sportKey} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {tSports(sportKey)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="format" className={labelStyle}>{t("format")}</Label>
                        <Select
                            name="format"
                            defaultValue="league"
                            onValueChange={(v) => setFormat(v)}
                        >
                            <SelectTrigger className="bg-transparent border-t-0 border-x-0 border-border/40 rounded-none text-foreground h-12 focus:ring-0 px-0 font-bold tracking-tighter">
                                <SelectValue placeholder={t("select_format")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-border">
                                <SelectItem value="league" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">{tFormat("league")}</SelectItem>
                                <SelectItem value="league_ha" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">{tFormat("league_ha")}</SelectItem>
                                <SelectItem value="knockout" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">{tFormat("knockout")}</SelectItem>
                                <SelectItem value="group_knockout" className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                    {tFormat("group_knockout")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label htmlFor="number_of_pitches" className={labelStyle}>{t("pitches")}</Label>
                            <Input
                                id="number_of_pitches"
                                name="number_of_pitches"
                                type="number"
                                defaultValue={1}
                                min={1}
                                className={inputStyle}
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="max_teams" className={`flex items-center justify-between ${labelStyle}`}>
                                {t("max_teams")}
                            </Label>
                            <Input
                                id="max_teams"
                                name="max_teams"
                                type="number"
                                defaultValue={8}
                                min={2}
                                max={128}
                                className={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    {format === "group_knockout" && (
                        <div className="space-y-3">
                            <Label htmlFor="advancing_teams" className={labelStyle}>{t("advancing_teams")}</Label>
                            <Select name="advancing_teams" defaultValue="2">
                                <SelectTrigger className="bg-transparent border-t-0 border-x-0 border-border/40 rounded-none text-foreground h-12 focus:ring-0 px-0 font-bold tracking-tighter">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-border">
                                    <SelectItem value="1" className="focus:bg-primary/10 focus:text-primary font-bold text-xs">1</SelectItem>
                                    <SelectItem value="2" className="focus:bg-primary/10 focus:text-primary font-bold text-xs">2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label htmlFor="start_date" className={labelStyle}>{t("start_date")}</Label>
                            <Input id="start_date" name="start_date" type="date" className={inputStyle} required />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="end_date" className={labelStyle}>{t("end_date")}</Label>
                            <Input id="end_date" name="end_date" type="date" className={inputStyle} required />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="document_deadline" className={labelStyle}>{t("document_deadline")}</Label>
                        <Input id="document_deadline" name="document_deadline" type="date" className={inputStyle} required />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="description" className={labelStyle}>{t("description")}</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder={t("description_placeholder")}
                            className="min-h-[100px] bg-foreground/5 border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium text-sm p-4 w-full"
                        />
                    </div>

                    {state.error && (
                        <div className="text-xs font-bold text-red-500 bg-red-500/10 p-4 border-l-4 border-red-500">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <SubmitButton className="w-full h-12 shadow-[0_0_20px_rgba(0,196,154,0.2)] hover:bg-primary/90 transition-all rounded-none bg-primary text-primary-foreground font-black tracking-tighter">
                            {isPending ? t("creating") : t("create_button")}
                        </SubmitButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
