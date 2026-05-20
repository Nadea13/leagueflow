"use client";

import { useActionState, useState, useEffect } from "react";
import { updateTournament } from "@/actions/organizer/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, ClipboardEdit } from "lucide-react";
import { ActionResponse, Tournament } from "@/types/index";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface GeneralInfoProps {
    tournament: Tournament;
}

export function GeneralInfo({ tournament }: GeneralInfoProps) {
    const t = useTranslations("Settings");
    const tCommon = useTranslations("Common");
    const tDialog = useTranslations("Dialog");
    const { toast } = useToast();

    const updateTournamentWithId = updateTournament.bind(null, tournament.id);
    const [state, formAction, isPending] = useActionState(updateTournamentWithId, initialState);
    const [description, setDescription] = useState(tournament.description || "");

    useEffect(() => {
        if (state.success) {
            toast({
                title: tCommon("success"),
                description: t("update_success_desc") || "Tournament updated successfully",
            });
        } else if (state.error) {
            toast({
                title: tCommon("error"),
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, tCommon, t, toast]);

    return (
        <div className="space-y-2 md:space-y-3">
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2 md:gap-3">
                    <ClipboardEdit className="h-5 w-5 text-primary" />
                    {t("general_info")}
                </h3>
            </div>

            <div className="relative overflow-hidden">
                <div className="relative z-10">
                    <form action={formAction} className="space-y-2 md:space-y-3">
                        <input type="hidden" name="form_type" value="general" />
                        <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="name" className="text-xs font-black tracking-widest text-primary">{tDialog("name")}</Label>
                                <Input
                                    type="text"
                                    id="name"
                                    name="name"
                                    defaultValue={tournament.name}
                                    placeholder={tDialog("name")}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="status" className="text-xs font-black tracking-widest text-primary">{t("status")}</Label>
                                <Select name="status" defaultValue={tournament.status || "draft"}>
                                    <SelectTrigger className="w-full bg-transparent text-foreground focus-visible:ring-0">
                                        <SelectValue placeholder={t("select_status")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        <SelectItem value="draft" className="focus:bg-foreground/10 focus:text-primary">{t("draft")}</SelectItem>
                                        <SelectItem value="upcoming" className="focus:bg-foreground/10 focus:text-primary">{t("upcoming")}</SelectItem>
                                        <SelectItem value="ongoing" className="focus:bg-foreground/10 focus:text-primary">{t("ongoing")}</SelectItem>
                                        <SelectItem value="finished" className="focus:bg-foreground/10 focus:text-primary">{t("finished")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="format" className="text-xs font-black tracking-widest text-primary">{t("format")}</Label>
                                <Select name="format" defaultValue={tournament.format || "league"}>
                                    <SelectTrigger className="w-full bg-transparent text-foreground focus-visible:ring-0">
                                        <SelectValue placeholder={t("select_format")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card">
                                        <SelectItem value="league" className="focus:bg-foreground/10 focus:text-primary">{t("format_league")}</SelectItem>
                                        <SelectItem value="league_ha" className="focus:bg-foreground/10 focus:text-primary">{t("format_league_ha")}</SelectItem>
                                        <SelectItem value="knockout" className="focus:bg-foreground/10 focus:text-primary">{t("format_knockout")}</SelectItem>
                                        <SelectItem value="group_knockout" className="focus:bg-foreground/10 focus:text-primary">
                                            {t("format_group_knockout")}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="max_teams" className="text-xs font-black tracking-widest text-primary flex items-center justify-between">
                                    {tDialog("max_teams")}
                                </Label>
                                <Input
                                    type="number"
                                    id="max_teams"
                                    name="max_teams"
                                    defaultValue={tournament.max_teams || 8}
                                    min="2"
                                    max={128}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                />
                            </div>

                            <div className="col-span-2 grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="start_date" className="text-xs font-black tracking-widest text-primary">{tDialog("start_date")}</Label>
                                    <Input
                                        type="date"
                                        id="start_date"
                                        name="start_date"
                                        defaultValue={tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ""}
                                        className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="end_date" className="text-xs font-black tracking-widest text-primary">{tDialog("end_date")}</Label>
                                    <Input
                                        type="date"
                                        id="end_date"
                                        name="end_date"
                                        defaultValue={tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ""}
                                        className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="document_deadline" className="text-xs font-black tracking-widest text-primary">{t("document_deadline")}</Label>
                                    <Input
                                        type="date"
                                        id="document_deadline"
                                        name="document_deadline"
                                        defaultValue={tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""}
                                        className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {tournament.format === "group_knockout" && (
                                <div className="space-y-1 col-span-2">
                                    <Label htmlFor="advancing_teams" className="text-xs font-black tracking-widest text-primary">
                                        {t("advancing_teams_per_group", { defaultValue: "Advancing Teams Per Group" })}
                                    </Label>
                                    <Select name="advancing_teams" defaultValue={tournament.advancing_teams?.toString() || "2"} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-foreground/10">
                                            {[1, 2, 3, 4].map((num) => (
                                                <SelectItem key={num} value={num.toString()} className="focus:bg-foreground/10 focus:text-primary">
                                                    {num}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="col-span-2">
                                <Label htmlFor="description" className="text-xs font-black tracking-widest text-primary">{tDialog("description")}</Label>
                                <div className="pro-editor-wrapper relative">
                                    <ReactQuill
                                        theme="snow"
                                        value={description}
                                        onChange={setDescription}
                                        placeholder={tDialog("description_placeholder")}
                                        className="pro-editor h-auto text-foreground"
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, false] }],
                                                ['bold', 'underline'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['clean']
                                            ]
                                        }}
                                    />
                                </div>
                                <input type="hidden" name="description" value={description} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="md:w-fit w-full"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    {tCommon("save")}
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
