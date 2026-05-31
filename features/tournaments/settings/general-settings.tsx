"use client";

import { useActionState, useState, useEffect } from "react";
import { updateTournament } from "@/actions/tournaments/general";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { ActionResponse, Tournament } from "@/types/index";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface GeneralSettingsProps {
    tournament: Tournament;
}

export function GeneralSettings({ tournament }: GeneralSettingsProps) {
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
        <div className="space-y-2 md:space-y-4">
            <div className="relative overflow-hidden">
                <div className="relative z-10">
                    <form action={formAction} className="space-y-2 md:space-y-3">
                        <input type="hidden" name="form_type" value="general" />
                        <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <Label>{tDialog("name")}</Label>
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
                                <Label>{t("document_deadline")}</Label>
                                <Input
                                    type="date"
                                    id="document_deadline"
                                    name="document_deadline"
                                    defaultValue={tournament.document_deadline ? new Date(tournament.document_deadline).toISOString().split('T')[0] : ""}
                                    className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>{tDialog("start_date")}</Label>
                                <Input
                                    type="date"
                                    id="start_date"
                                    name="start_date"
                                    defaultValue={tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ""}
                                    className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>{tDialog("end_date")}</Label>
                                <Input
                                    type="date"
                                    id="end_date"
                                    name="end_date"
                                    defaultValue={tournament.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ""}
                                    className="bg-transparent text-foreground focus-visible:ring-0 [color-scheme:dark]"
                                />
                            </div>

                            <div className="col-span-2 space-y-1">
                                <Label>{tDialog("description")}</Label>
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
