"use client";
import React, { useState, useCallback, useRef } from "react";
import { Player, Team, ActionResponse } from "@/types/index";
import { cn } from "@/lib/utils";
import { 
    updatePlayer, 
    getPlayers
} from "@/actions/manager/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
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
    Trash2
} from "lucide-react";
import { PlayerDetailsView } from "./player-details-view";
import { ImportRosterDialog } from "./import-roster-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Tab } from "@/components/ui/tab";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslations } from "next-intl";

interface SquadListProps {
    players: Player[];
    team: Team;
    effectivelyLocked: boolean;
    refreshPlayers: () => Promise<void>;
    onDeletePlayer: (playerId: string) => void;
    t: (key: string, values?: any) => string;
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

    const handleUpdatePlayer = async (playerId: string) => {
        setIsSaving(true);
        const updateData = {
            name: editName,
            number: editNumber ? parseInt(editNumber) : null,
            position: editPosition,
            tel: editTel
        };

        const result = await updatePlayer(playerId, team.id, updateData);
        setIsSaving(false);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("updated_success") });
            setEditingPlayerId(null);
            refreshPlayers();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr || dateStr === "0000-00-00") return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString();
    };

    const activePlayers = players.filter((player) => !player.deleted_at);

    return (
        <div className="bg-background space-y-2 md:space-y-4 border rounded-xl p-2 md:p-4">
            <div className="flex md:items-center justify-between gap-4 mb-2 md:mb-4">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-black tracking-tighter text-foreground">
                        {t("title")}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <ImportRosterDialog
                        teamId={team.id}
                        teamName={team.name}
                        effectivelyLocked={effectivelyLocked}
                        onSuccess={() => refreshPlayers()}
                    />
                </div>
            </div>

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
                                    "group bg-background rounded-sm border relative overflow-hidden transition-all",
                                    !effectivelyLocked && "hover:border-primary hover:shadow-md cursor-pointer"
                                )}
                                onClick={() => {
                                    if (!effectivelyLocked && editingPlayerId !== player.id) {
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
                                                    <div className="space-y-1 w-full md:w-[60px] shrink-0">
                                                        <Label>{t("number")}</Label>
                                                        <Input
                                                            value={editNumber}
                                                            onChange={(e) => setEditNumber(e.target.value)}
                                                            className="w-full text-left md:text-center bg-transparent font-black text-sm focus-visible:ring-0 p-0"
                                                            placeholder="#"
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
                                                            placeholder="08X-XXX-XXXX"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-muted/20 flex items-center justify-center relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                                                        <span className="text-xl font-black text-primary relative z-10">
                                                            {player.number || "-"}
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black px-1 py-0">
                                                                {player.position || "N/A"}
                                                            </Badge>
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
                                                        handleUpdatePlayer(player.id);
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
                                                    }}
                                                    disabled={isSaving}
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {!effectivelyLocked && (
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
                                                        <DropdownMenuContent align="end" className="border-border bg-card w-48 p-0">
                                                            <DropdownMenuItem
                                                                className="py-3 px-4 text-[10px] font-black tracking-widest focus:bg-primary focus:text-black cursor-pointer transition-all"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingPlayerId(player.id);
                                                                    setEditNumber(player.number?.toString() || "");
                                                                    setEditPosition(player.position || "");
                                                                    setEditTel(player.tel || "");
                                                                    setEditName(player.name || "");
                                                                }}
                                                            >
                                                                <Edit2 className="mr-3 h-4 w-4" />
                                                                {tCommon("edit")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="py-3 px-4 text-[10px] font-black tracking-widest text-red-500 focus:bg-red-500 focus:text-foreground cursor-pointer transition-all border-t border-border/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeletePlayer(player.id);
                                                                }}
                                                            >
                                                                <Trash2 className="mr-3 h-4 w-4" />
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
                            <DialogContent className="sm:max-w-[450px] bg-background border-border p-0 overflow-hidden shadow-2xl">
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

