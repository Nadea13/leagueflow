"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Plus, Upload } from "lucide-react";
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

export function CreateTeamDialog() {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(createTeam, initialState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-3 w-8 h-8 md:w-auto md:h-auto shadow-[0_0_20px_rgba(0,196,154,0.2)] hover:shadow-[0_0_30px_rgba(0,196,154,0.4)] transition-all">
                    <Plus className="h-5 w-5" />
                    <span className="hidden sm:inline">{t("add_team")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-background border-border rounded-none p-0 overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-secondary/20 to-background p-6 border-b border-border relative">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">{t("add_team")}</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            {t("no_teams_desc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                
                <form action={formAction} className="p-6 space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="name" className="text-[10px] font-black tracking-widest text-secondary">
                            {t("team_name")}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t("team_name_placeholder")}
                            className="bg-transparent border-t-0 border-x-0 border-border/40 rounded-none text-foreground h-12 focus-visible:ring-0"
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="sport" className="text-[10px] font-black tracking-widest text-secondary">
                            {tCommon("sport") || "Sport"}
                        </Label>
                        <Select name="sport" defaultValue="football">
                            <SelectTrigger className="bg-transparent border-t-0 border-x-0 border-border/40 rounded-none text-foreground h-12 focus:ring-0 px-0 font-bold tracking-tighter">
                                <SelectValue placeholder={t("select_sport") || "Select Sport"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-border">
                                {(['football'] as SportType[]).map((sportKey) => (
                                    <SelectItem key={sportKey} value={sportKey} className="focus:bg-secondary/10 focus:text-secondary font-bold text-xs tracking-tighter">
                                        {tSports(sportKey)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                        <Label htmlFor="logo" className="text-[10px] font-black tracking-widest text-secondary">
                            {t("upload_logo")}
                        </Label>
                        <div className="flex items-center gap-6 p-4 bg-muted/10 border border-border">
                            <div className="relative group">
                                <div className="h-20 w-20 flex items-center justify-center border-2 border-dashed border-border group-hover:border-secondary transition-colors overflow-hidden bg-muted/30">
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
                                        <Upload className="h-8 w-8 text-muted-foreground/30 group-hover:text-secondary transition-colors" />
                                    )}
                                </div>
                                {previewUrl && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-none border-2 border-background" />
                                )}
                            </div>
                            
                            <div className="flex-1">
                                <Label
                                    htmlFor="logo"
                                    className="cursor-pointer inline-flex items-center justify-center h-10 px-6 w-full bg-muted/20 hover:bg-muted/30 border border-border text-[10px] font-black tracking-widest text-foreground transition-all active:scale-95"
                                >
                                    {previewUrl ? t("click_to_upload") : t("upload_logo")}
                                </Label>
                                <Input
                                    id="logo"
                                    name="logo"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <p className="text-[9px] text-muted-foreground/50 mt-2 font-bold tracking-tighter">PNG, JPG, max 2MB</p>
                            </div>
                        </div>
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
