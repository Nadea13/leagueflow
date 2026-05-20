"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Plus, Upload, Trash2 } from "lucide-react";
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
import { ActionResponse, SportType } from "@/types/index";

const initialState: ActionResponse = {
    success: false,
    error: undefined,
};

export function CreateTeamForm() {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(createTeam, initialState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sportsList, setSportsList] = useState<any[]>([]);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleRemoveLogo = () => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4" />
                    <span>{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-background border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                <form action={formAction}>
                    <div className="relative bg-background p-2 md:p-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none">
                                {t("add_team")}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                {t("no_teams_desc")}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-2 space-y-2 md:p-4 md:space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="logo" className="text-xs font-black tracking-widest text-primary">
                                {t("upload_logo")}
                            </Label>
                            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg border">
                                <div className="relative group">
                                    <div className="h-20 w-20 flex items-center justify-center rounded-sm border-2 border-dashed border-border overflow-hidden">
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt={tCommon("preview")}
                                                width={80}
                                                height={80}
                                                className="h-full w-full object-cover p-1 rounded-sm"
                                            />
                                        ) : (
                                            <Upload className="h-8 w-8 text-primary" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex gap-2">
                                        <Label
                                            htmlFor="logo"
                                            className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 rounded-sm hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
                                        >
                                            {previewUrl ? t("click_to_upload") : t("upload_logo")}
                                        </Label>
                                        {previewUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                                                onClick={handleRemoveLogo}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <Input
                                        id="logo"
                                        name="logo"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                    />
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">PNG, JPG, max 2MB</p>
                                </div>
                            </div>
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
