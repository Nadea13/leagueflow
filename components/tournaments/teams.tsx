"use client";

import { useState } from "react";
import Image from "next/image";

import { updateTeam, deleteTeam, assignTeamGroup } from "@/actions/organizer/tournaments/general";
import { TournamentTeam } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2, Users, Upload, ImageIcon, Trash2, Edit2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { RosterDialog } from "./roster-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";


interface TeamsProps {
    teams: (TournamentTeam & { team?: { user_id: string | null } })[];
    tournamentId: string;
    isPro: boolean;
    showGroupSelector?: boolean;
    organizerId?: string;
}

export function Teams({ teams, tournamentId, isPro, showGroupSelector = false, organizerId }: TeamsProps) {
    const t = useTranslations("Team");

    if (!teams || teams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-muted group-hover:bg-secondary/40 transition-colors" />
                <div className="p-6 bg-background border border-border/10 rotate-12 transition-transform group-hover:rotate-0 shadow-lg mb-4 relative z-10">
                    <Users className="h-8 w-8 text-muted-foreground opacity-30 -rotate-12 group-hover:rotate-0 transition-transform" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-foreground/40 relative z-10">
                    {t("no_teams")}
                </h3>
                <p className="text-[10px] uppercase font-black text-muted-foreground/20 mt-2 flex items-center gap-2 relative z-10">
                    <span className="w-3 h-[1px] bg-muted-foreground/10" />
                    {t("no_teams_desc")}
                    <span className="w-3 h-[1px] bg-muted-foreground/10" />
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-border/10">
            {teams.map((team) => (
                <TeamItem
                    key={team.id}
                    team={team}
                    tournamentId={tournamentId}
                    isPro={isPro}
                    showGroupSelector={showGroupSelector}
                    isReadOnly={!!(team.team?.user_id && team.team.user_id !== organizerId)}
                />
            ))}
        </div>
    );
}

function TeamItem({
    team,
    tournamentId,
    isPro,
    showGroupSelector,
    isReadOnly
}: {
    team: TournamentTeam & { team?: { user_id: string | null } };
    tournamentId: string;
    isPro: boolean;
    showGroupSelector: boolean;
    isReadOnly: boolean;
}) {
    const t = useTranslations("Team");
    const tGroup = useTranslations("Group");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [name, setName] = useState(team.name);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [existingLogoUrl] = useState(team.logo_url || "");
    const [isLoading, setIsLoading] = useState(false);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const [description, setDescription] = useState(team.description || "");
 

    const handleSave = async () => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
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
        setIsLoading(true);
        const result = await deleteTeam(team.id, tournamentId);
        setIsLoading(false);
        if (result.success) {
            setOpen(false);
            setShowDeleteConfirm(false);
        } else {
            alert(result.error);
        }
    };

    const handleGroupChange = async (value: string) => {
        setIsGroupLoading(true);
        const groupName = value === "none" ? null : value;
        try {
            const result = await assignTeamGroup(team.id, groupName, tournamentId);
            if (!result.success) {
                alert(`${tCommon("error")}: ${result.error}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGroupLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between px-2 py-4 md:p-6 hover:bg-muted/5 transition-all group relative overflow-hidden">
            {/* Standardized Accent Bar */}
            <div className="absolute left-0 top-0 w-1 h-full bg-secondary opacity-0 group-hover:opacity-100 transition-opacity z-30" />
            
            <div className="flex items-center flex-1 min-w-0 z-10">
                <div className="h-12 w-12 rounded-none bg-muted/10 flex items-center justify-center mr-2 md:mr-3 shrink-0 overflow-hidden border border-foreground/5 relative">
                    {team.logo_url ? (
                        <Image src={team.logo_url} alt={team.name} width={48} height={48} className="h-full w-full object-contain p-1" unoptimized />
                    ) : (
                        <span className="text-[10px] font-black text-muted-foreground/40">
                            {team.name.substring(0, 2).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex flex-col min-w-0 mr-2 md:mr-3">
                    <h3 className="font-black uppercase tracking-tighter text-lg md:text-xl leading-none truncate group-hover:text-primary transition-colors">{team.name}</h3>
                    {team.description && (
                        <p className="text-[10px] font-bold uppercase text-muted-foreground/40 mt-1.5 line-clamp-1 tracking-wider">{team.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                        {(!showGroupSelector && team.group_name) ? (
                            <Badge variant="outline" className="rounded-none border-secondary/30 text-secondary bg-secondary/5 text-[9px] font-black uppercase px-2">
                                {t("group")} {team.group_name}
                            </Badge>
                        ) : (
                            <span className="text-[10px] font-bold uppercase text-muted-foreground/20 tracking-tight">{t("participating_team")}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 z-10">
                {showGroupSelector && (
                    <div className="flex items-center gap-2">
                        {isGroupLoading && <Loader2 className="h-3 w-3 animate-spin text-secondary" />}
                        <Select
                            defaultValue={team.group_name || "none"}
                            onValueChange={handleGroupChange}
                            disabled={isGroupLoading}
                        >
                            <SelectTrigger className="w-[110px] h-9 text-[10px] bg-muted/5 border-border/10 rounded-none font-black uppercase tracking-widest focus:ring-secondary/20 transition-all hover:bg-muted/10">
                                <SelectValue placeholder={tGroup("group")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border/10 rounded-none shadow-2xl">
                                <SelectItem value="none" className="text-[10px] font-bold uppercase opacity-40">{tCommon("none") || "None"}</SelectItem>
                                {["A", "B", "C", "D", "E", "F", "G", "H"].map((g) => (
                                    <SelectItem key={g} value={g} className="text-[10px] font-black uppercase">
                                        {tGroup("group")} {g}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex gap-2 shrink-0">
                    {isPro && <RosterDialog teamId={team.id} teamName={team.name} readOnly={isReadOnly} />}

                    {!isReadOnly && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-none border-border/10 bg-muted/5 hover:bg-foreground/5 hover:border-secondary/30 text-muted-foreground/40 hover:text-secondary transition-all">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                        <DialogContent className="bg-card border-border/10 rounded-none max-w-md shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2">
                                    <Edit2 className="h-5 w-5 text-secondary" />
                                    {t("edit_team")}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-6 border-y border-border/10 my-4">
                                <div className="space-y-4 justify-center flex">
                                    <div className="flex flex-col items-center gap-3">
                                        <label htmlFor="edit-logo-upload" className="cursor-pointer group relative">
                                            <div className="h-28 w-28 rounded-none border border-border/10 flex items-center justify-center overflow-hidden bg-foreground/5 hover:bg-foreground/10 transition-all group-hover:border-secondary/30 relative">
                                                {previewUrl || existingLogoUrl ? (
                                                    <Image
                                                        src={previewUrl || existingLogoUrl}
                                                        alt="Logo Preview"
                                                        width={112}
                                                        height={112}
                                                        className="h-full w-full object-contain p-2"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <ImageIcon className="h-10 w-10 text-muted-foreground/10 group-hover:text-secondary/20 transition-colors" />
                                                )}
                                                <div className="absolute inset-0 bg-secondary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="h-6 w-6 text-secondary-foreground" />
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
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t("click_to_upload")}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("team_name")}</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        className="bg-foreground/5 border-border/10 rounded-none font-black uppercase tracking-tighter h-12 focus-visible:ring-secondary/20"
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{t("team_description") || "Team Description"}</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        className="bg-foreground/5 border-border/10 rounded-none font-medium text-sm min-h-[100px] focus-visible:ring-secondary/20"
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={t("no_description") || "No description"}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="flex sm:justify-between w-full gap-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowDeleteConfirm(true)} 
                                    disabled={isLoading} 
                                    type="button"
                                    className="rounded-none border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-foreground transition-all h-10 px-6 text-[11px] font-black uppercase tracking-widest"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    {tCommon("delete")}
                                </Button>
                                <Button 
                                    onClick={handleSave} 
                                    disabled={isLoading}
                                    className="rounded-none bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all h-10 px-8 text-[11px] font-black uppercase tracking-widest"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {tCommon("save")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                        </Dialog>
                    )}

                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2">
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                    {t("delete_team")}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                    {t("delete_desc")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black uppercase tracking-widest">
                                    {tCommon("cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDelete();
                                    }}
                                    disabled={isLoading}
                                    className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black uppercase tracking-widest"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-3.5 w-3.5 mr-2" />}
                                    {t("delete_team")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
