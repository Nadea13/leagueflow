"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import { Player, Team } from "@/types/index";
import { cn } from "@/lib/utils";
import { updatePlayer } from "@/actions/manager/team";
import { updateGlobalPlayerPhoto } from "@/actions/tournaments/master-player";
import { validateUploadedFile } from "@/lib/file-validation";
import { compressAndConvertToAvif } from "@/lib/image-compression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
    Loader2, 
    Users, 
    Save, 
    X, 
    MoreVertical, 
    Edit2, 
    Trash2,
    Camera
} from "lucide-react";
import { PlayerDetailsView } from "./player-details-view";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

interface SquadListProps {
    players: Player[];
    team: Team;
    effectivelyLocked: boolean;
    refreshPlayers: () => Promise<void>;
    onDeletePlayer: (playerId: string) => void;
    t: (key: string, values?: Record<string, string | number | Date>) => string;
    tCommon: (key: string) => string;
}

export function SquadList({
    players,
    team,
    effectivelyLocked,
    refreshPlayers,
    onDeletePlayer,
    t,
    tCommon
}: SquadListProps) {
    const { toast } = useToast();
    const [openProfileId, setOpenProfileId] = useState<string | null>(null);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editNumber, setEditNumber] = useState("");
    const [editPosition, setEditPosition] = useState("");
    const [editTel, setEditTel] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const handleUpdatePlayer = async (player: Player) => {
        setIsSaving(true);
        try {
            if (editPhotoFile && player.global_player_id) {
                const formData = new FormData();
                formData.append("photo", editPhotoFile);
                const photoResult = await updateGlobalPlayerPhoto(player.global_player_id, formData);
                if (!photoResult.success) {
                    toast({ title: tCommon("error"), description: photoResult.error || "Failed to update photo", variant: "destructive" });
                    setIsSaving(false);
                    return;
                }
            }

            const updateData = {
                name: editName,
                number: editNumber ? parseInt(editNumber) : null,
                position: editPosition,
                tel: editTel
            };

            const result = await updatePlayer(player.id, team.id, updateData);
            if (result.success) {
                toast({ title: tCommon("success"), description: t("updated_success") });
                setEditingPlayerId(null);
                setEditPhotoFile(null);
                setEditPhotoPreview(null);
                refreshPlayers();
            } else {
                toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An error occurred";
            toast({ title: tCommon("error"), description: errorMessage, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const activePlayers = players.filter((player) => !player.deleted_at);

    return (
        <div className="bg-card space-y-2 md:space-y-4 border rounded-sm p-2 md:p-4">

            {activePlayers.length === 0 ? (
                <EmptyState
                    title={t("no_players_desc")}
                    description={t("get_started_by_adding_your_first_player_above") || "Get started by adding your first player above"}
                    icon={Users}
                    className="min-h-[300px] rounded-sm"
                />
            ) : (
                <div className="grid gap-1 md:gap-2">
                    {activePlayers.map((player) => (
                        <Dialog key={player.id} open={openProfileId === player.id} onOpenChange={(isOpen) => setOpenProfileId(isOpen ? player.id : null)}>
                            <>
                                <div
                                className={cn(
                                    "group rounded-sm border relative overflow-hidden transition-all",
                                    !effectivelyLocked && player.status !== 'pending' && "hover:border-primary hover:shadow-md cursor-pointer",
                                    player.status === 'pending' && "opacity-50 border-dashed bg-muted/20"
                                )}
                                onClick={() => {
                                    if (!effectivelyLocked && editingPlayerId !== player.id && player.status !== 'pending') {
                                        setOpenProfileId(player.id);
                                    }
                                }}
                            >
                                <div className={cn(
                                    "p-2 md:p-3 flex gap-3 md:gap-6",
                                    editingPlayerId === player.id ? "flex-col md:flex-row" : "flex-row items-center"
                                )}>
                                    {/* Number & Basic Info */}
                                        <div className={cn(
                                            "flex flex-1 min-w-0 gap-3",
                                            editingPlayerId === player.id ? "flex-col md:flex-row md:items-end" : "flex-row items-center"
                                        )}>
                                            {editingPlayerId === player.id ? (
                                                <>
                                                    <div className="space-y-1 shrink-0 flex flex-col items-center">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const fileCheck = validateUploadedFile(file);
                                                                    if (!fileCheck.valid) {
                                                                        toast({ title: tCommon("error"), description: fileCheck.error, variant: "destructive" });
                                                                        return;
                                                                    }
                                                                    try {
                                                                        const compressed = await compressAndConvertToAvif(file);
                                                                        setEditPhotoFile(compressed);
                                                                        setEditPhotoPreview(URL.createObjectURL(compressed));
                                                                    } catch (err) {
                                                                        const errorMessage = err instanceof Error ? err.message : "Failed to compress image";
                                                                        toast({ title: tCommon("error"), description: errorMessage, variant: "destructive" });
                                                                    }
                                                                }
                                                            }}
                                                            ref={editFileInputRef}
                                                            className="hidden"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                editFileInputRef.current?.click();
                                                            }}
                                                            className="h-10 w-10 rounded-full border transition-all flex items-center justify-center overflow-hidden relative group"
                                                        >
                                                            {(() => {
                                                                const photoUrl = player.photo_url || player.profile_img || player.master_player?.profile_img || player.global_player?.photo_url || player.global_player?.profile_img;
                                                                return editPhotoPreview ? (
                                                                    <Image src={editPhotoPreview} alt="Preview" width={40} height={40} className="h-full w-full object-cover" />
                                                                ) : photoUrl ? (
                                                                    <Image src={photoUrl} alt="Current" width={40} height={40} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <Camera className="h-4 w-4 text-primary" />
                                                                );
                                                            })()}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Camera className="h-4 w-4 text-foreground" />
                                                            </div>
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1 w-full md:w-[60px] shrink-0">
                                                        <Label>{t("number")}</Label>
                                                        <Input
                                                            value={editNumber}
                                                            onChange={(e) => setEditNumber(e.target.value)}
                                                            className="w-full text-left md:text-center bg-transparent font-black text-sm focus-visible:ring-0 p-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
 
                                                    <div className="space-y-1 w-full md:flex-1 md:min-w-[150px]">
                                                        <Label>{t("player_name")}</Label>
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="text-sm font-black bg-transparent focus-visible:ring-0 p-0 w-full"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
 
                                                    <div className="space-y-1 w-full md:w-[100px] shrink-0">
                                                        <Label>{t("position")}</Label>
                                                        <Select value={editPosition} onValueChange={setEditPosition}>
                                                            <SelectTrigger 
                                                                className="w-full"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <SelectValue placeholder="POS" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GK" className="text-[10px] font-black">{t("goalkeeper") || "GK"}</SelectItem>
                                                                <SelectItem value="DF" className="text-[10px] font-black">{t("defender") || "DF"}</SelectItem>
                                                                <SelectItem value="MF" className="text-[10px] font-black">{t("midfielder") || "MF"}</SelectItem>
                                                                <SelectItem value="FW" className="text-[10px] font-black">{t("forward") || "FW"}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
 
                                                    <div className="space-y-1 w-full md:w-[130px] shrink-0">
                                                        <Label>{t("tel") || "Telephone"}</Label>
                                                        <Input
                                                            value={editTel}
                                                            onChange={(e) => setEditTel(e.target.value)}
                                                            type="tel"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="relative h-10 w-10 shrink-0">
                                                        {(() => {
                                                            const photoUrl = player.photo_url || player.profile_img || player.master_player?.profile_img || player.global_player?.photo_url || player.global_player?.profile_img;
                                                            return photoUrl ? (
                                                                <>
                                                                    <div className="h-full w-full rounded-full bg-muted/20 flex items-center justify-center overflow-hidden border border-border">
                                                                        <Image
                                                                            src={photoUrl}
                                                                            alt={player.name}
                                                                            width={40}
                                                                            height={40}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    </div>
                                                                    <div className="absolute -bottom-0 -right-0 bg-primary px-0.5 text-black text-[10px] font-black h-4 rounded-full flex items-center justify-center border border-background">
                                                                        {player.number ?? "-"}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="h-full w-full rounded-full bg-muted/20 flex items-center justify-center overflow-hidden border border-border">
                                                                    <span className="text-xl font-black text-primary">
                                                                        {player.number || "-"}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="border-muted text-forground text-[8px] font-black px-1 py-0 rounded">
                                                                {player.position || "N/A"}
                                                            </Badge>
                                                            {player.status === 'pending' && (
                                                                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black px-1 py-0 rounded" variant="outline">
                                                                    รออนุมัติ
                                                                </Badge>
                                                            )}
                                                            <span className="text-[9px] font-bold tracking-widest text-muted-foreground/40 font-mono">
                                                                {player.tel || ""}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-base font-black tracking-tight text-foreground truncate">
                                                            {player.name}
                                                        </h4>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2 shrink-0">
                                        {editingPlayerId === player.id ? (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-primary hover:bg-primary/10 transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdatePlayer(player);
                                                    }}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-5 w-5" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-red-500 hover:bg-red-500/10 transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPlayerId(null);
                                                        setEditPhotoFile(null);
                                                        setEditPhotoPreview(null);
                                                    }}
                                                    disabled={isSaving}
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {(!effectivelyLocked || player.status === 'pending') && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-muted/10 transition-all"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreVertical className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36 rounded-sm">
                                                            {player.status !== 'pending' && (
                                                                <DropdownMenuItem
                                                                    className="flex items-center rounded"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingPlayerId(player.id);
                                                                        setEditNumber(player.number?.toString() || "");
                                                                        setEditPosition(player.position || "");
                                                                        setEditTel(player.tel || "");
                                                                        setEditName(player.name || "");
                                                                        setEditPhotoFile(null);
                                                                        setEditPhotoPreview(null);
                                                                    }}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                    {tCommon("edit")}
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                className="flex items-center rounded"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeletePlayer(player.id);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {tCommon("delete")}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogContent className="sm:max-w-[450px] bg-background border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                                <PlayerDetailsView
                                    player={player}
                                    team={team}
                                />
                            </DialogContent>
                            </>
                        </Dialog>
                    ))}
                </div>
            )}
        </div>
    );
}

