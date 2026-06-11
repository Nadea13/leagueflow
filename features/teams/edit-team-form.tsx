'use client';

import React, { useState, useEffect } from "react";
import { Team, TournamentTeam, Sport } from "@/types/index";
import { updateTeamGlobal, deleteTeamGlobal, resetRoster, restoreRoster, hasSoftDeletedPlayers, getSports } from "@/actions/manager/team";
import { updateTeam, deleteTeam } from "@/actions/tournaments/general";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Save, Trash2, Lock, RotateCcw } from "lucide-react";
import { LogoUploader } from "@/components/shared/logo-uploader";

interface EditTeamFormProps {
    team: (Team | TournamentTeam) & {
        isParticipation?: boolean;
    };
    onNameChange: (name: string) => void;
    onSportChange?: (sport: string) => void;
    isLocked: boolean;
    context?: 'manager' | 'organizer';
    tournamentId?: string;
}

export function EditTeamForm({
    team,
    onNameChange,
    onSportChange,
    isLocked,
    context = 'manager',
    tournamentId = ""
}: EditTeamFormProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const tTeam = useTranslations("Team");
    const { toast } = useToast();
    const router = useRouter();

    const [teamName, setTeamName] = useState(team.name);
    const [teamDescription, setTeamDescription] = useState(team.description || "");
    const [contactName, setContactName] = useState(team.contact_name || "");
    const [contactPhone, setContactPhone] = useState(team.contact_phone || "");
    const [teamSport, setTeamSport] = useState<string>((team as { sport_id?: string }).sport_id || team.sport || "");
    const [previewUrl, setPreviewUrl] = useState<string | null>(team.logo_url || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
    const [isDeletingTeam, setIsDeletingTeam] = useState(false);
    const [isResettingRoster, setIsResettingRoster] = useState(false);
    const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
    const [resetRosterDialogOpen, setResetRosterDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    const [hasResetRoster, setHasResetRoster] = useState(false);
    const [isRestoringRoster, setIsRestoringRoster] = useState(false);
    const [sportsList, setSportsList] = useState<Sport[]>([]);

    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data) {
                setSportsList(res.data);
                const currentSport = (team as { sport_id?: string }).sport_id || team.sport;
                if (currentSport) {
                    const match = res.data.find(s =>
                        s.id === currentSport ||
                        s.sport_name.toLowerCase() === currentSport.toLowerCase()
                    );
                    if (match) {
                        setTeamSport(match.id);
                    }
                }
            }
        }
        loadSports();
    }, [team]);

    useEffect(() => {
        const checkRestore = async () => {
            const res = await hasSoftDeletedPlayers(team.id);
            if (res.success && res.data) {
                setHasResetRoster(true);
            } else {
                setHasResetRoster(false);
            }
        };
        checkRestore();
    }, [team.id]);

    const handleRestoreRoster = async () => {
        setIsRestoringRoster(true);
        const res = await restoreRoster(team.id);
        setIsRestoringRoster(false);
        if (res.success) {
            toast({
                title: tCommon("success"),
                description: t("roster_restored") || "Roster restored successfully"
            });
            setHasResetRoster(false);
            router.refresh();
        } else {
            toast({
                title: tCommon("error"),
                description: res.error,
                variant: "destructive"
            });
        }
    };



    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingTeam(true);

        const formData = new FormData();
        formData.append("name", teamName);
        formData.append("description", teamDescription);
        formData.append("contact_name", contactName);
        formData.append("contact_phone", contactPhone);
        formData.append("sport", teamSport);
        formData.append("tournament_id", "");
        formData.append("existing_logo_url", previewUrl || "");
        if (selectedFile) {
            formData.append("logo", selectedFile);
        }

        const result = context === 'organizer'
            ? await updateTeam(team.id, formData, tournamentId)
            : await updateTeamGlobal(team.id, formData, tournamentId);

        setIsUpdatingTeam(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: tTeam("updated_successfully") || "Team updated successfully" });
            onNameChange(teamName);
            onSportChange?.(teamSport);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleDeleteTeam = async () => {
        setIsDeletingTeam(true);
        const result = context === 'organizer'
            ? await deleteTeam(team.id, tournamentId)
            : await deleteTeamGlobal(team.id, tournamentId);

        if (result.success) {
            toast({ title: tCommon("success"), description: tTeam("deleted_successfully") || "Team deleted successfully" });
            setDeleteTeamDialogOpen(false);
            if (context === 'manager') {
                router.push("/dashboard/teams");
            }
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
            setIsDeletingTeam(false);
        }
    };

    const handleResetRoster = async () => {
        setIsResettingRoster(true);
        const result = await resetRoster(team.id);

        setIsResettingRoster(false);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("roster_reset_success") || "Roster reset successfully" });
            setResetRosterDialogOpen(false);
            setHasResetRoster(true);
            router.refresh();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="bg-card border rounded-xl relative overflow-hidden">
            <div className="p-2 md:p-4">
                <form onSubmit={handleUpdateTeam} className="space-y-1 md:space-y-2">
                    <div className="space-y-1">
                        <Label>{tTeam("upload_logo")}</Label>
                        <LogoUploader
                            id="edit-logo-right"
                            initialUrl={previewUrl}
                            onFileChange={(file) => {
                                setSelectedFile(file);
                                if (file) {
                                    setPreviewUrl(URL.createObjectURL(file));
                                } else {
                                    setPreviewUrl(null);
                                }
                            }}
                            onRemove={() => {
                                setSelectedFile(null);
                                setPreviewUrl(null);
                            }}
                            disabled={isLocked}
                            uploadLabel={tTeam("upload_logo")}
                            clickToUploadLabel={tTeam("click_to_upload")}
                            previewLabel={tCommon("preview")}
                            imageFit="contain"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>
                            {tTeam("team_name")}
                        </Label>
                        <Input
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            placeholder={tTeam("team_name")}
                            required
                            readOnly={isLocked}
                            className="bg-transparent text-foreground focus-visible:ring-0 text-sm font-bold"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>
                            {tCommon("sport") || "Sport"}
                        </Label>
                        <Select value={teamSport} onValueChange={(v) => setTeamSport(v)} disabled={isLocked}>
                            <SelectTrigger className="bg-transparent text-foreground focus-visible:ring-0 w-full">
                                <SelectValue placeholder={tCommon("sport") || "Sport"} />
                            </SelectTrigger>
                            <SelectContent className="border-border">
                                {sportsList.map((sport) => (
                                    <SelectItem key={sport.id} value={sport.id} className="focus:bg-primary/10 focus:text-primary font-bold text-xs tracking-tighter">
                                        {sport.sport_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label>
                            {tTeam("team_description")}
                        </Label>
                        <Textarea
                            value={teamDescription}
                            onChange={e => setTeamDescription(e.target.value)}
                            placeholder={tTeam("team_description_placeholder")}
                            readOnly={isLocked}
                            className="bg-transparent w-full text-foreground focus-visible:ring-0 resize-none min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>
                                {tTeam("contact_name") || "Contact Name"}
                            </Label>
                            <Input
                                value={contactName}
                                onChange={e => setContactName(e.target.value)}
                                placeholder="Manager Name"
                                readOnly={isLocked}
                                className="bg-transparent text-foreground focus-visible:ring-0 text-sm font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>
                                {tTeam("contact_phone") || "Phone Number"}
                            </Label>
                            <Input
                                value={contactPhone}
                                onChange={e => setContactPhone(e.target.value)}
                                placeholder="08x-xxx-xxxx"
                                readOnly={isLocked}
                                className="bg-transparent text-foreground focus-visible:ring-0 text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 md:space-y-2">
                        <div className="flex gap-1 md:gap-2">
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isUpdatingTeam || isLocked}
                            >
                                {isUpdatingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                {tCommon("save")}
                            </Button>

                            {hasResetRoster && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 border-primary text-primary hover:bg-primary/10 transition-all h-10 w-10 flex items-center justify-center"
                                    onClick={handleRestoreRoster}
                                    disabled={isRestoringRoster || isLocked}
                                    title={t("restore_roster") || "Restore Roster"}
                                >
                                    {isRestoringRoster ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>

                        {isLocked && (
                            <div className="bg-destructive/10 rounded-sm border border-destructive p-2 flex items-center justify-center gap-2 md:gap-3">
                                <Lock className="h-4 w-4 text-destructive" />
                                <span className="text-[10px] font-black tracking-widest text-destructive">{t("team_details_locked")}</span>
                            </div>
                        )}
                    </div>

                    {!isLocked && (
                        <div className="space-y-1 md:space-y-2">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="h-px flex-1 bg-destructive" />
                                <span className="text-xs font-black tracking-widest text-destructive">{t("danger_zone")}</span>
                                <div className="h-px flex-1 bg-destructive" />
                            </div>

                            <Dialog open={resetRosterDialogOpen} onOpenChange={setResetRosterDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                                        disabled={isResettingRoster || isLocked}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {t("reset_roster") || "Reset Roster"}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md border-border bg-card">
                                    <DialogHeader>
                                        <DialogTitle className="font-black tracking-tight text-destructive">{t("reset_roster") || "Reset Roster"}</DialogTitle>
                                        <DialogDescription className="text-[10px] tracking-wider font-medium text-muted-foreground/60 leading-relaxed">
                                            {t("reset_roster_desc") || "This will delete all players from this team's roster. This action cannot be undone."}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button
                                            variant="ghost"
                                            className="font-black text-[10px] tracking-widest"
                                            onClick={() => setResetRosterDialogOpen(false)}
                                        >
                                            {tCommon("cancel")}
                                        </Button>
                                        <Button
                                            variant="default"
                                            className="font-black text-[10px] tracking-widest bg-destructive hover:bg-destructive/60 hover:text-destructive"
                                            onClick={handleResetRoster}
                                            disabled={isResettingRoster}
                                        >
                                            {isResettingRoster ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                            {t("confirm_reset") || "Confirm Reset"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={deleteTeamDialogOpen} onOpenChange={setDeleteTeamDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                                        disabled={isDeletingTeam || isLocked}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {tTeam("delete_team") || "Delete Team"}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md border-border bg-card">
                                    <DialogHeader>
                                        <DialogTitle className="font-black tracking-tight text-red-500">{tTeam("delete_team") || "Delete Team"}</DialogTitle>
                                        <DialogDescription className="text-[10px] tracking-wider font-medium text-muted-foreground/60 leading-relaxed mt-2">
                                            {tTeam("delete_desc") || "This action cannot be undone. This will permanently delete your team and all associated data."}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-6 space-y-3 font-semibold">
                                        <Label htmlFor="confirm-team-delete" className="text-[10px] font-black tracking-widest text-muted-foreground/60">
                                            {tTeam("type_to_confirm", { text: team.name }) || `Please type "${team.name}" to confirm.`}
                                        </Label>
                                        <Input
                                            id="confirm-team-delete"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            autoComplete="off"
                                            className="border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-lg font-black tracking-tight transition-all p-0"
                                        />
                                    </div>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button
                                            variant="ghost"
                                            className="font-black text-[10px] tracking-widest"
                                            onClick={() => { setDeleteTeamDialogOpen(false); setDeleteConfirmText(""); }}
                                        >
                                            {tCommon("cancel")}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="font-black text-[10px] tracking-widest bg-destructive hover:bg-destructive/80"
                                            onClick={handleDeleteTeam}
                                            disabled={isDeletingTeam || deleteConfirmText !== team.name}
                                        >
                                            {isDeletingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            {tCommon("delete")}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
