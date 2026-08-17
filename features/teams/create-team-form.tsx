"use client";

import { useActionState, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { createTeam, getSports } from "@/actions/manager/team";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse, Sport } from "@/types/index";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { cn } from "@/lib/utils";
import { getSportIcon } from "@/components/shared/sport-icons";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

interface CreateTeamFormProps {
    iconOnlyMobile?: boolean;
}

export function CreateTeamForm({ iconOnlyMobile = false }: CreateTeamFormProps) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(createTeam, initialState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [sportsList, setSportsList] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>("");

    // Load sports dynamically from database
    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data) {
                setSportsList(res.data);
            }
        }
        if (open) {
            loadSports();
        }
    }, [open]);

    // Close dialog on success
    if (state?.success && open) {
        setOpen(false);
        setPreviewUrl(null);
        setSelectedSport("");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={iconOnlyMobile ? "h-8 w-8 p-0 sm:w-auto gap-1" : ""}>
                    <Plus className="h-4 w-4" />
                    <span className={iconOnlyMobile ? "hidden sm:inline" : ""}>{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-card p-0 shadow-2xl">
                <form action={formAction} className="flex flex-col h-full max-h-[100vh] sm:max-h-[90vh] overflow-hidden">
                    <DialogHeader className="relative pr-10">
                        <DialogTitle>
                            {t("add_team")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("no_teams_desc")}
                        </DialogDescription>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
                        <div className="flex flex-col items-center justify-center space-y-1">
                            <LogoUploader
                                id="logo"
                                name="logo"
                                initialUrl={previewUrl}
                                onFileChange={(file) => {
                                    if (file) {
                                        setPreviewUrl(URL.createObjectURL(file));
                                    } else {
                                        setPreviewUrl(null);
                                    }
                                }}
                                onRemove={() => setPreviewUrl(null)}
                                uploadLabel={t("upload_logo")}
                                clickToUploadLabel={t("click_to_upload")}
                                previewLabel={tCommon("preview")}
                                imageFit="cover"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{t("team_name")} <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder={t("team_name_placeholder")}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")} <span className="text-destructive">*</span></Label>
                            <input type="hidden" name="sport_id" value={selectedSport} required />
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 lg:gap-2">
                                {sportsList.map((sport) => {
                                    const isSelected = selectedSport === sport.id;
                                    return (
                                        <button
                                            key={sport.id}
                                            type="button"
                                            onClick={() => setSelectedSport(sport.id)}
                                            className={cn(
                                                "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                isSelected
                                                    ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-full transition-colors",
                                                isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {getSportIcon(sport.sport_name, "h-4 w-4")}
                                            </div>
                                            <span className="text-xs font-bold truncate w-full transition-colors">{sport.sport_name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("team_description")}</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder={t("team_description_placeholder")}
                                className="bg-transparent w-full text-foreground focus-visible:ring-0 resize-none min-h-[80px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-1 lg:gap-2">
                            <div className="space-y-1">
                                <Label>{t("contact_name")} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_name"
                                    name="contact_name"
                                    placeholder={t("contact_name_placeholder")}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("contact_phone")} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    placeholder={t("contact_phone_placeholder")}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                    required
                                />
                            </div>
                        </div>

                        {state?.error && (
                            <div className="text-xs font-bold text-destructive bg-destructive/10 rounded-sm border border-destructive p-2">
                                {state.error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t p-2 md:p-4 mt-auto">
                        <SubmitButton className="w-full">{tCommon("create_btn")}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
