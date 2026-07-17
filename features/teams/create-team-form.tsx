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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionResponse, Sport } from "@/types/index";
import { LogoUploader } from "@/components/shared/logo-uploader";

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
    if (state?.success && open) {
        setOpen(false);
        setPreviewUrl(null);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={iconOnlyMobile ? "h-8 w-8 p-0 sm:w-auto gap-1" : ""}>
                    <Plus className="h-4 w-4" />
                    <span className={iconOnlyMobile ? "hidden sm:inline" : ""}>{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[640px] bg-card border-border p-0 overflow-hidden shadow-2xl rounded-sm">
                <form action={formAction}>
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

                    <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                        <div className="space-y-1">
                            <Label>{t("upload_logo")}</Label>
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
                                className="bg-transparent text-foreground focus-visible:ring-0"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>{tCommon("sport")}</Label>
                            <Select name="sport_id" value={selectedSport} onValueChange={setSelectedSport}>
                                <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                    <SelectValue placeholder={t("select_sport")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sportsList.map((sport) => (
                                        <SelectItem key={sport.id} value={sport.id} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                            {sport.sport_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>{t("team_description")}</Label>
                            <Textarea
                                id="description"
                                name="description"
                                className="bg-transparent w-full text-foreground focus-visible:ring-0 resize-none min-h-[80px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>{t("contact_name")} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_name"
                                    name="contact_name"
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t("contact_phone")} <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
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

                    <DialogFooter className="border-t p-2 md:p-4">
                        <SubmitButton className="w-full">{tCommon("create_btn")}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
