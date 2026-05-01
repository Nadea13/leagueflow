"use client";

import { useActionState, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Plus, Upload, Trash2 } from "lucide-react";
import { createTeam } from "@/actions/manager/team";
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

export function CreateTeamDialog() {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(createTeam, initialState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                <Button className="gap-3 w-8 h-8 md:w-auto md:h-10">
                    <Plus className="h-5 w-5" />
                    <span className="hidden sm:inline">{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-background border-border rounded-none p-0 overflow-hidden shadow-2xl">
                <div className="relative bg-primary/10 p-4 md:p-6 border-b border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-none">
                            {t("add_team")}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium pt-2 text-base leading-relaxed">
                            {t("no_teams_desc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form action={formAction} className="p-4 space-y-2 md:p-6 md:space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="logo" className="text-xs font-black tracking-widest text-primary">
                            {t("upload_logo")}
                        </Label>
                        <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-muted/10 border">
                            <div className="relative group">
                                <div className="h-20 w-20 flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                                    {previewUrl ? (
                                        <Image
                                            src={previewUrl}
                                            alt={tCommon("preview")}
                                            width={80}
                                            height={80}
                                            className="h-full w-full object-cover p-1"
                                            unoptimized
                                        />
                                    ) : (
                                        <Upload className="h-8 w-8 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex gap-2">
                                    <Label
                                        htmlFor="logo"
                                        className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 bg-muted/20 hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
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
                        <Label htmlFor="sport" className="text-xs font-black tracking-widest text-primary">
                            {tCommon("sport") || "Sport"}
                        </Label>
                        <Select name="sport" defaultValue="football">
                            <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                <SelectValue placeholder={t("select_sport") || "Select Sport"} />
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

                    {state?.error && (
                        <div className="text-xs font-bold text-red-500 bg-red-500/10 p-3 border-l-4 border-red-500">
                            {state.error}
                        </div>
                    )}

                    <DialogFooter>
                        <SubmitButton className="w-full h-12 shadow-[0_0_20px_rgba(0,196,154,0.2)]">{tCommon("create_btn")}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
