'use client';

import React, { useState } from "react";
import Image from "next/image";
import { Team, SportType, TournamentTeam } from "@/types/index";
import { updateTeamGlobal, deleteTeamGlobal, resetRoster } from "@/actions/manager/team";
import { updateTeam, deleteTeam } from "@/actions/organizer/tournaments/general";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Users, Upload, Save, Trash2, Lock, RotateCcw } from "lucide-react";

interface EditTeamFormProps {
    team: (Team | TournamentTeam) & {
        isParticipation?: boolean;
    };
    onNameChange: (name: string) => void;
    onSportChange?: (sport: SportType) => void;
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
    const tSports = useTranslations("Sports");
    const { toast } = useToast();
    const router = useRouter();

    const [teamName, setTeamName] = useState(team.name);
    const [teamDescription, setTeamDescription] = useState(team.description || "");
    const [contactName, setContactName] = useState(team.contact_name || "");
    const [contactPhone, setContactPhone] = useState(team.contact_phone || "");
    const [teamSport, setTeamSport] = useState<SportType>((team as Team).sport || 'football');
    const [previewUrl, setPreviewUrl] = useState<string | null>(team.logo_url || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
    const [isDeletingTeam, setIsDeletingTeam] = useState(false);
    const [isResettingRoster, setIsResettingRoster] = useState(false);
    const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
    const [resetRosterDialogOpen, setResetRosterDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleRemoveLogo = () => {
        setPreviewUrl(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
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
                router.push(`/${team.isParticipation ? "manager/my-registrations" : "manager/my-teams"}`);
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
            router.refresh();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="bg-card border relative overflow-hidden">
            <div className="p-4 md:p-6">
                <div className="flex flex-col items-center text-center mb-6">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground">
                        {teamName || "New Team"}
                    </h2>
                    <p className="text-[10px] font-black tracking-widest text-muted-foreground/40 mt-1">
                        {tTeam("edit_team_desc") || "Customize Identity"}
                    </p>
                </div>

                <form onSubmit={handleUpdateTeam} className="space-y-4 md:space-y-6">
                    <div className="space-y-1">
                        <Label htmlFor="edit-logo-right" className="text-xs font-black tracking-widest text-primary">
                            {tTeam("upload_logo")}
                        </Label>
                        <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 border">
                            <div className="relative group">
                                <div className="h-20 w-20 flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                                    {previewUrl ? (
                                        <Image
                                            src={previewUrl}
                                            alt={tCommon("preview")}
                                            width={80}
                                            height={80}
                                            className="h-full w-full object-contain p-1"
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
                                        htmlFor="edit-logo-right"
                                        className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 bg-muted/20 hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
                                    >
                                        {previewUrl ? tTeam("click_to_upload") : tTeam("upload_logo")}
                                    </Label>
                                    {previewUrl && (
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 rounded-none border"
                                            onClick={handleRemoveLogo}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    id="edit-logo-right"
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
                        <Label className="text-xs font-black tracking-widest text-primary">
                            {tTeam("team_name")}
                        </Label>
                        <Input
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            placeholder={tTeam("team_name")}
                            required
                            className="bg-transparent text-foreground focus-visible:ring-0 h-12 text-sm font-bold"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs font-black tracking-widest text-primary">
                            {tCommon("sport") || "Sport"}
                        </Label>
                        <Select value={teamSport} onValueChange={(v) => setTeamSport(v as SportType)}>
                            <SelectTrigger className="bg-transparent text-foreground focus-visible:ring-0 w-full">
                                <SelectValue placeholder={tCommon("sport") || "Sport"} />
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
                        <Label className="text-xs font-black tracking-widest text-primary">
                            {tTeam("team_description")}
                        </Label>
                        <Textarea
                            value={teamDescription}
                            onChange={e => setTeamDescription(e.target.value)}
                            placeholder={tTeam("team_description_placeholder")}
                            className="bg-transparent w-full text-foreground focus-visible:ring-0 resize-none min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-black tracking-widest text-primary">
                                {tTeam("contact_name") || "Contact Name"}
                            </Label>
                            <Input
                                value={contactName}
                                onChange={e => setContactName(e.target.value)}
                                placeholder="Manager Name"
                                className="bg-transparent text-foreground focus-visible:ring-0 h-12 text-sm font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-black tracking-widest text-primary">
                                {tTeam("contact_phone") || "Phone Number"}
                            </Label>
                            <Input
                                value={contactPhone}
                                onChange={e => setContactPhone(e.target.value)}
                                placeholder="08x-xxx-xxxx"
                                className="bg-transparent text-foreground focus-visible:ring-0 h-12 text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                        <Button
                            type="submit"
                            className="w-full h-12 font-black tracking-widest text-sm transition-all bg-primary text-primary-foreground disabled:opacity-50 shadow-[0_0_20px_rgba(0,196,154,0.2)]"
                            disabled={isUpdatingTeam || isLocked}
                        >
                            {isUpdatingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            {tCommon("save")}
                        </Button>

                        {isLocked && (
                            <div className="bg-destructive/10 border border-destructive p-2 flex items-center justify-center gap-2 md:gap-3">
                                <Lock className="h-4 w-4 text-destructive" />
                                <span className="text-[10px] font-black tracking-widest text-destructive">{t("team_details_locked")}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 md:space-y-3">
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
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    {t("reset_roster") || "Reset Roster"}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-none sm:max-w-md border-border bg-card">
                                <DialogHeader>
                                    <DialogTitle className="font-black tracking-tight text-destructive">{t("reset_roster") || "Reset Roster"}</DialogTitle>
                                    <DialogDescription className="text-[10px] tracking-wider font-medium text-muted-foreground/60 leading-relaxed mt-2">
                                        {t("reset_roster_desc") || "This will delete all players from this team's roster. This action cannot be undone."}
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                                    <Button
                                        variant="ghost"
                                        className="rounded-none font-black text-[10px] tracking-widest"
                                        onClick={() => setResetRosterDialogOpen(false)}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="rounded-none font-black text-[10px] tracking-widest bg-destructive hover:bg-destructive/60 hover:text-destructive"
                                        onClick={handleResetRoster}
                                        disabled={isResettingRoster}
                                    >
                                        {isResettingRoster ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
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
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {tTeam("delete_team") || "Delete Team"}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-none sm:max-w-md border-border bg-card">
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
                                        className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-lg font-black tracking-tight transition-all p-0"
                                    />
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button
                                        variant="ghost"
                                        className="rounded-none font-black text-[10px] tracking-widest"
                                        onClick={() => { setDeleteTeamDialogOpen(false); setDeleteConfirmText(""); }}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="rounded-none font-black text-[10px] tracking-widest bg-red-500 hover:bg-red-600"
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
                </form>
            </div>
        </div>
    );
}
