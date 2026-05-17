'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Player, Team, SportType, GlobalPlayer } from "@/types/index";
import {
    updateGlobalPlayerAthleteTypes,
    updateGlobalPlayerPhoto,
    updateGlobalPlayerIdCard,
    createGlobalPlayer,
    linkPlayerToGlobal,
    updateGlobalPlayerInfo
} from "@/actions/organizer/tournaments/global-player";
import {
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    Upload,
    View,
    X,
    Unlink,
    FileText,
    Loader2,
    Trash2
} from "lucide-react";

interface ProfileManagementProps {
    player: Player;
    team: Team;
    onSuccess: () => Promise<void>;
}

export function ProfileManagement({ player, team, onSuccess }: ProfileManagementProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [editName, setEditName] = useState(player.global_player?.name || player.name);
    const [editBirthDate, setEditBirthDate] = useState(player.global_player?.date_of_birth || player.birth_date || "");
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setEditName(player.global_player?.name || player.name);
        setEditBirthDate(player.global_player?.date_of_birth || player.birth_date || "");
        setHasChanges(false);
    }, [player]);

    const handleUpdateInfo = async () => {
        if (!player.global_player_id) return;
        setIsSaving(true);
        try {
            const res = await updateGlobalPlayerInfo(player.global_player_id, {
                name: editName,
                date_of_birth: editBirthDate || null
            });
            if (res.success) {
                toast({ title: tCommon("success"), description: "Profile updated" });
                setHasChanges(false);
                await onSuccess();
            } else {
                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleGlobalPhotoUpload = async (globalPlayerId: string, file: File) => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("photo", file);
        const result = await updateGlobalPlayerPhoto(globalPlayerId, formData);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Global photo updated" });
            await onSuccess();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleIdCardUpload = async (globalPlayerId: string, file: File) => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("id_card", file);
        const result = await updateGlobalPlayerIdCard(globalPlayerId, formData);
        if (result.success) {
            toast({ title: tCommon("success"), description: "ID card uploaded" });
            await onSuccess();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleGlobalAthleteTypesUpdate = async (globalPlayerId: string, sports: string[]) => {
        setIsSaving(true);
        const result = await updateGlobalPlayerAthleteTypes(globalPlayerId, sports);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Sports profile updated" });
            await onSuccess();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleLinkPlayer = async (playerId: string, globalPlayer: GlobalPlayer) => {
        setIsSaving(true);
        const result = await linkPlayerToGlobal(playerId, globalPlayer.id);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Player linked successfully" });
            await onSuccess();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
        <>
            <div className="relative bg-primary/10 p-4 md:p-6">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-none">
                        {t("profile_management") || "Profile Management"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium pt-2 text-base leading-relaxed">
                        {t("global_identity_for") || "Global identity for"} {player.name}
                    </DialogDescription>
                </DialogHeader>
            </div>
            <div className="p-4 space-y-2 md:p-6 md:space-y-3">
                {player.global_player_id ? (
                    <div className="space-y-2 md:space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-black tracking-widest text-primary">
                                {t("global_profile_photo")}
                            </Label>
                            <div className="flex items-start gap-3 p-3 bg-muted/10 border">
                                <div className="relative group">
                                    <div className="h-20 w-20 flex items-center justify-center border-2 border-dashed border-border overflow-hidden bg-background/50">
                                        {player.global_player?.photo_url || player.photo_url ? (
                                            <img
                                                src={player.global_player?.photo_url || player.photo_url || ""}
                                                alt={player.name}
                                                width={80}
                                                height={80}
                                                className="h-full w-full object-contain p-1"                                            />
                                        ) : (
                                            <Upload className="h-8 w-8 text-muted-foreground/30" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex gap-2">
                                        <Label
                                            htmlFor={`global-photo-upload-${player.id}`}
                                            className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 bg-muted/20 hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                            {player.global_player?.photo_url || player.photo_url ? "CHANGE PHOTO" : "UPLOAD PHOTO"}
                                        </Label>
                                        {(player.global_player?.photo_url || player.photo_url) && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 rounded-none border"
                                                onClick={async () => {
                                                    // Note: We don't have a direct "delete" for global photo yet, 
                                                    // but we can set it to null or empty string if the API supports it.
                                                    // For now, this acts as a clear signal for the user to upload a new one.
                                                    const res = await updateGlobalPlayerPhoto(player.global_player_id!, new FormData());
                                                    if (res.success) {
                                                        toast({ title: tCommon("success"), description: "Global photo reset" });
                                                        await onSuccess();
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <Input
                                        id={`global-photo-upload-${player.id}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={isSaving}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && player.global_player_id) {
                                                handleGlobalPhotoUpload(player.global_player_id, file);
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                                        {t("syncs_across_all_tournament_rosters") || "Syncs across all tournament rosters"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black tracking-widest text-primary">
                                    {t("global_name") || "GLOBAL NAME"}
                                </Label>
                                <Input
                                    value={editName}
                                    onChange={(e) => {
                                        setEditName(e.target.value);
                                        setHasChanges(true);
                                    }}
                                    placeholder="Player Name"
                                    className="rounded-none border-2 h-11 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black tracking-widest text-primary">
                                    {t("date_of_birth") || "DATE OF BIRTH"}
                                </Label>
                                <Input
                                    type="date"
                                    value={editBirthDate}
                                    onChange={(e) => {
                                        setEditBirthDate(e.target.value);
                                        setHasChanges(true);
                                    }}
                                    className="rounded-none border-2 h-11 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black tracking-widest text-primary">{t("player_identification") || "PLAYER IDENTIFICATION"}</Label>
                                {player.global_player?.id_card_url && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-muted/10 border">
                                <div className="relative group">
                                    <div className="h-20 w-32 flex items-center justify-center border-2 border-dashed border-border overflow-hidden bg-background/50">
                                        {player.global_player?.id_card_url ? (
                                            <img
                                                src={player.global_player.id_card_url}
                                                alt="ID Card"
                                                width={128}
                                                height={80}
                                                className="h-full w-full object-contain p-1"
                                            />
                                        ) : (
                                            <FileText className="h-8 w-8 text-muted-foreground/30" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex gap-2">
                                        <Label
                                            htmlFor={`id-upload-${player.id}`}
                                            className="cursor-pointer flex-1 inline-flex items-center justify-center h-10 px-6 bg-muted/20 hover:bg-muted/30 border whitespace-nowrap text-[10px] font-black tracking-widest transition-all"
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                            {player.global_player?.id_card_url ? "CHANGE IDENTIFICATION" : "UPLOAD ID"}
                                        </Label>
                                        {player.global_player?.id_card_url && (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-10 w-10 border rounded-none hover:bg-primary/10 hover:text-primary transition-all"
                                                    asChild
                                                >
                                                    <a href={player.global_player.id_card_url} target="_blank" rel="noopener noreferrer">
                                                        <View className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 rounded-none border"
                                                    onClick={async () => {
                                                        const res = await updateGlobalPlayerIdCard(player.global_player_id!, new FormData());
                                                        if (res.success) {
                                                            toast({ title: tCommon("success"), description: "ID card reset" });
                                                            await onSuccess();
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        id={`id-upload-${player.id}`}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        disabled={isSaving}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && player.global_player_id) {
                                                handleIdCardUpload(player.global_player_id, file);
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                                        {t("syncs_across_all_tournament_rosters") || "Syncs across all tournament rosters"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 border border-dashed border-border/40">
                        <Unlink className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-xs font-bold tracking-wider text-muted-foreground/60 mb-6 px-6">
                            {t("profile_must_be_connected_to_a_global_identity_to_manage_documents") || "Profile must be connected to a global identity to manage documents."}
                        </p>
                        <div className="px-6">
                            <Button
                                className="w-full rounded-none bg-primary text-black font-black tracking-widest text-[10px] h-11"
                                disabled={isSaving}
                                onClick={async () => {
                                    const res = await createGlobalPlayer(player.name, null, player.birth_date, [team.sport]);
                                    if (res.success && res.data) {
                                        await handleLinkPlayer(player.id, res.data);
                                    } else {
                                        toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                    }
                                }}
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {t("initialize_global_profile") || "Initialize Global Profile"}
                            </Button>
                        </div>
                    </div>
                )}

                {player.global_player_id && (
                    <div className="space-y-4 pt-4 border-t border-border/20">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black tracking-widest text-primary">
                                {tSports("title") || "Sports Profile"}
                            </Label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['football'] as SportType[]).map((sportKey) => {
                                const isActive = player.global_player?.athlete_types?.includes(sportKey);
                                return (
                                    <Badge
                                        key={sportKey}
                                        variant={isActive ? "default" : "outline"}
                                        className={`rounded-none cursor-pointer pr-1 transition-all text-[9px] font-black tracking-widest h-7 ${isActive ? "bg-primary text-black hover:bg-primary/80" : "border-muted-foreground/20 text-muted-foreground/40 hover:border-primary hover:text-primary"}`}
                                        onClick={() => {
                                            if (isSaving) return;
                                            const currentTypes = player.global_player?.athlete_types || [];
                                            const newTypes = isActive
                                                ? currentTypes.filter(t => t !== sportKey)
                                                : [...currentTypes, sportKey];
                                            handleGlobalAthleteTypesUpdate(player.global_player_id!, newTypes);
                                        }}
                                    >
                                        {tSports(sportKey)}
                                        {isActive && <X className="ml-1 h-3 w-3" />}
                                    </Badge>
                                );
                            })}
                        </div>
                        <p className="text-[9px] text-muted-foreground/60 tracking-wider">
                            {t("multi_sport_athlete_desc") || "Select all sports this athlete participates in."}
                        </p>
                    </div>
                )}
                {hasChanges && (
                    <Button
                        className="w-full rounded-none bg-primary text-black font-black tracking-widest text-[10px] h-11"
                        onClick={handleUpdateInfo}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {tCommon("save_changes") || "Save Changes"}
                    </Button>
                )}
            </div>

        </>
    );
}
