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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Lock, RotateCcw, X } from "lucide-react";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { getSportIcon } from "@/components/shared/sport-icons";
import { cn } from "@/lib/utils";

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
        <div className="bg-card border rounded-sm relative overflow-hidden">
            <div className="p-2 md:p-4">
                <form onSubmit={handleUpdateTeam} className="space-y-1 md:space-y-2">
                    <div className="flex flex-col items-center justify-center space-y-1">
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
                            imageFit="cover"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>
                            {tTeam("team_name")} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            placeholder={tTeam("team_name_placeholder")}
                            className="bg-transparent text-foreground focus-visible:ring-0"
                            required
                            readOnly={isLocked}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>{tCommon("sport")} <span className="text-destructive">*</span></Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 lg:gap-2">
                            {sportsList.map((sport) => {
                                const isSelected = teamSport === sport.id;
                                return (
                                    <button
                                        key={sport.id}
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => setTeamSport(sport.id)}
                                        className={cn(
                                            "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                            isSelected
                                                ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30",
                                            isLocked && "opacity-50 cursor-not-allowed"
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

                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                        <div className="space-y-1">
                            <Label>
                                {tTeam("contact_name") || "Contact Name"} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={contactName}
                                onChange={e => setContactName(e.target.value)}
                                placeholder={tTeam("contact_name_placeholder")}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                                required
                                readOnly={isLocked}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>
                                {tTeam("contact_phone") || "Phone Number"} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={contactPhone}
                                onChange={e => setContactPhone(e.target.value)}
                                placeholder={tTeam("contact_phone_placeholder")}
                                className="bg-transparent text-foreground focus-visible:ring-0"
                                required
                                readOnly={isLocked}
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

                            <AlertDialog open={resetRosterDialogOpen} onOpenChange={setResetRosterDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                                        disabled={isResettingRoster || isLocked}
                                    >
                                        {t("reset_roster") || "Reset Roster"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border rounded-sm shadow-2xl max-w-md p-0">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="p-2 md:p-4 border-b">{t("reset_roster")}</AlertDialogTitle>
                                        <AlertDialogDescription className="p-2 md:p-4">
                                            {t("reset_roster_desc")}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                                        <AlertDialogCancel className="mt-0">
                                            {tCommon("cancel")}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleResetRoster}
                                            disabled={isResettingRoster}
                                            className="bg-destructive hover:bg-destructive/90 transition-all flex items-center justify-center"
                                        >
                                            {t("confirm_reset") || "Confirm Reset"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Dialog open={deleteTeamDialogOpen} onOpenChange={(open) => { setDeleteTeamDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                                        disabled={isDeletingTeam || isLocked}
                                    >
                                        {tTeam("delete_team")}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent showCloseButton={false} className="bg-card border rounded-sm shadow-2xl max-w-md p-0">
                                    <DialogHeader className="border-b p-2 md:p-4 relative pr-10">
                                        <DialogTitle>{tTeam("delete_team")}</DialogTitle>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="absolute right-2 top-2"
                                            onClick={() => setDeleteTeamDialogOpen(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </DialogHeader>
                                    <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                                        <DialogDescription>{tTeam("delete_desc")}</DialogDescription>
                                        <div className="space-y-1">
                                            <DialogDescription className="font-bold">{tTeam("type_to_confirm", { text: team.name }) || `Please type "${team.name}" to confirm.`}</DialogDescription>
                                            <div className="py-1">
                                                <Input
                                                    id="confirm-team-delete"
                                                    value={deleteConfirmText}
                                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter className="p-2 md:p-4 border-t">
                                        <Button
                                            variant="destructive"
                                            disabled={isDeletingTeam || deleteConfirmText !== team.name}
                                            onClick={handleDeleteTeam}
                                            className="bg-destructive w-full"
                                        >
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
