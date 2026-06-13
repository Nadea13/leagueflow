"use client";

import { useActionState, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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
                <Button className={iconOnlyMobile ? "h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 sm:py-2 gap-2" : ""}>
                    <Plus className="h-4 w-4" />
                    <span className={iconOnlyMobile ? "hidden sm:inline" : ""}>{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                <form action={formAction}>
                    <div className="relative p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">
                                {t("add_team")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                {t("no_teams_desc")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-2 space-y-1 md:p-4 md:space-y-2">
                        <div className="space-y-1">
                            <Label htmlFor="logo" className="text-xs font-black tracking-widest text-primary">
                                {t("upload_logo")}
                            </Label>
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
                            <Label htmlFor="name" className="text-xs font-black tracking-widest text-primary">
                                {t("team_name")}
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder={t("team_name_placeholder")}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="sport_id" className="text-xs font-black tracking-widest text-primary">
                                {tCommon("sport") || "Sport"}
                            </Label>
                            <Select name="sport_id" value={selectedSport} onValueChange={setSelectedSport}>
                                <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                    <SelectValue placeholder={t("select_sport") || "Select Sport"} />
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
                            <Label htmlFor="description" className="text-xs font-black tracking-widest text-primary">
                                {t("team_description")}
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder={t("team_description_placeholder")}
                                className="bg-transparent w-full text-foreground focus-visible:ring-0 resize-none min-h-[80px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="contact_name" className="text-xs font-black tracking-widest text-primary">
                                    {t("contact_name") || "Contact Name"} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contact_name"
                                    name="contact_name"
                                    placeholder={t("contact_name_placeholder") || "Manager Name"}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="contact_phone" className="text-xs font-black tracking-widest text-primary">
                                    {t("contact_phone") || "Phone Number"} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contact_phone"
                                    name="contact_phone"
                                    placeholder={t("contact_phone_placeholder") || "08x-xxx-xxxx"}
                                    className="bg-transparent text-foreground focus-visible:ring-0"
                                    required
                                />
                            </div>
                        </div>

                        {state?.error && (
                            <div className="text-xs font-bold text-red-500 bg-red-500/10 p-3 border-l-4 border-red-500">
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
