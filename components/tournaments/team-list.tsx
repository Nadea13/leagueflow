"use client";

import { useState } from "react";
import { Team } from "@/types/index";
import { updateTeam, deleteTeam } from "@/app/[locale]/dashboard/tournaments/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Loader2, Users, Upload, ImageIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { RosterDialog } from "./roster-dialog";

interface TeamListProps {
    teams: Team[];
    tournamentId: string;
    isPro?: boolean;
}

export function TeamList({ teams, tournamentId, isPro = false }: TeamListProps) {
    const t = useTranslations("Team");

    if (!teams || teams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg bg-muted/10">
                <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">{t("no_teams")}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {t("no_teams_desc")}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teams.map((team) => (
                <TeamItem key={team.id} team={team} tournamentId={tournamentId} isPro={isPro} />
            ))}
        </div>
    );
}

function TeamItem({ team, tournamentId, isPro }: { team: Team; tournamentId: string; isPro: boolean }) {
    const t = useTranslations("Team");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(team.name);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [existingLogoUrl, setExistingLogoUrl] = useState(team.logo_url || "");
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("existing_logo_url", existingLogoUrl);
        if (logoFile) {
            formData.append("logo", logoFile);
        }

        const result = await updateTeam(team.id, formData, tournamentId);
        setIsLoading(false);
        if (result.success) {
            setOpen(false);
        } else {
            alert(result.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t("delete_confirm"))) return;
        setIsLoading(true);
        const result = await deleteTeam(team.id, tournamentId);
        setIsLoading(false);
        if (result.success) {
            setOpen(false);
        } else {
            alert(result.error);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 border rounded-md bg-background">
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
                    {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="h-full w-full object-contain" />
                    ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                            {team.name.substring(0, 2).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="font-medium">{team.name}</span>
                    {team.group_name && (
                        <span className="text-xs text-muted-foreground">{t("group")} {team.group_name}</span>
                    )}
                </div>
            </div>

            <div className="flex gap-1">
                {isPro && <RosterDialog teamId={team.id} teamName={team.name} />}

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("edit_team")}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="name" className="text-sm font-medium">{t("team_name")}</label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-4 justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <label htmlFor="edit-logo-upload" className="cursor-pointer group relative">
                                        <div className="h-24 w-24 rounded-full border border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/5 hover:bg-muted/10 transition-colors">
                                            {previewUrl || existingLogoUrl ? (
                                                <img
                                                    src={previewUrl || existingLogoUrl}
                                                    alt="Logo Preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                                <Upload className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        <Input
                                            id="edit-logo-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setLogoFile(file);
                                                    setPreviewUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                    <span className="text-xs text-muted-foreground">{t("click_to_upload")}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="flex sm:justify-between w-full gap-2">
                            <Button variant="destructive" onClick={handleDelete} disabled={isLoading} type="button">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                {tCommon("delete")}
                            </Button>
                            <Button onClick={handleSave} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {tCommon("save")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
