"use client";

import React, { useState, useCallback, useRef } from "react";
import { Player, GlobalPlayer, Team, ActionResponse } from "@/types/index";
import { cn } from "@/lib/utils";
import { 
    updatePlayer, 
    linkPlayerToGlobal, 
    unlinkPlayerFromGlobal, 
    createGlobalPlayer, 
    getGlobalPlayers,
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
    Link2, 
    Unlink, 
    Search, 
    Save, 
    X, 
    UserPlus, 
    MoreVertical, 
    Edit2, 
    Trash2, 
    ChevronLeft, 
    ChevronRight,
    ArrowRight,
    FileText
} from "lucide-react";
import { ProfileManagement } from "./profile-management";
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
    const [editBirthDate, setEditBirthDate] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Linking Global ID state
    const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GlobalPlayer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 5;

    const fetchGlobalPlayersData = async (page: number, query: string) => {
        setIsSearching(true);
        const result = await getGlobalPlayers(page, pageSize, query);
        if (result.success && result.data) {
            setSearchResults(result.data.players);
            setTotalCount(result.data.totalCount);
        } else {
            setSearchResults([]);
            setTotalCount(0);
        }
        setIsSearching(false);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchGlobalPlayersData(1, query);
    };

    const handleLinkPlayer = async (playerId: string, globalPlayer: GlobalPlayer) => {
        const result = await linkPlayerToGlobal(playerId, globalPlayer.id);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Player linked successfully" });
            setLinkingPlayerId(null);
            setSearchQuery("");
            setSearchResults([]);
            refreshPlayers();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleUnlinkPlayer = async (playerId: string) => {
        const result = await unlinkPlayerFromGlobal(playerId);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Player unlinked" });
            refreshPlayers();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleUpdatePlayer = async (playerId: string) => {
        setIsSaving(true);
        const updateData = {
            name: editName,
            number: editNumber ? parseInt(editNumber) : null,
            position: editPosition,
            birth_date: editBirthDate
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

    return (
        <div className="bg-card space-y-4 md:space-y-6 border p-4 md:p-6">
            <div className="flex md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-black tracking-tighter text-foreground">
                        {t("title")}
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    <ImportRosterDialog
                        teamId={team.id}
                        teamName={team.name}
                        effectivelyLocked={effectivelyLocked}
                        onSuccess={() => refreshPlayers()}
                    />
                </div>
            </div>

            {players.length === 0 ? (
                <EmptyState
                    title={t("no_players_desc")}
                    description={t("get_started_by_adding_your_first_player_above") || "Get started by adding your first player above"}
                    icon={Users}
                    className="min-h-[300px]"
                />
            ) : (
                <div className="grid gap-2 md:gap-3">
                    {players.map((player) => (
                        <Dialog key={player.id} open={openProfileId === player.id} onOpenChange={(isOpen) => setOpenProfileId(isOpen ? player.id : null)}>
                            <>
                                <div
                                className="group bg-card border relative overflow-hidden transition-all hover:border-primary hover:shadow-md cursor-pointer"
                                onClick={() => {
                                    if (editingPlayerId !== player.id) {
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
                                                        <Label className="text-[10px] font-black tracking-widest text-primary">{t("number")}</Label>
                                                        <Input
                                                            value={editNumber}
                                                            onChange={(e) => setEditNumber(e.target.value)}
                                                            className="w-full text-left md:text-center bg-transparent font-black text-sm focus-visible:ring-0 p-0 rounded-none"
                                                            placeholder="#"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
 
                                                    <div className="space-y-1 w-full md:flex-1 md:min-w-[150px]">
                                                        <Label className="text-[10px] font-black tracking-widest text-primary">{t("player_name")}</Label>
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="text-sm font-black bg-transparent focus-visible:ring-0 p-0 rounded-none w-full"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
 
                                                    <div className="space-y-1 w-full md:w-[100px] shrink-0">
                                                        <Label className="text-[10px] font-black tracking-widest text-primary">{t("position")}</Label>
                                                        <Select value={editPosition} onValueChange={setEditPosition}>
                                                            <SelectTrigger 
                                                                className="w-full text-sm font-black bg-transparent focus:ring-0 p-0 rounded-none [&_svg]:hidden"
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
                                                        <Label className="text-[10px] font-black tracking-widest text-primary">{t("birth_date")}</Label>
                                                        <Input
                                                            value={editBirthDate}
                                                            onChange={(e) => setEditBirthDate(e.target.value)}
                                                            type="date"
                                                            className="text-sm font-bold bg-transparent focus-visible:ring-0 p-0 rounded-none w-full border-b border-border/40 md:border-none h-10 md:h-auto"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-12 w-12 shrink-0 bg-muted/20 flex items-center justify-center relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                                                        <span className="text-xl font-black text-primary relative z-10">
                                                            {player.number || "-"}
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0 flex-1 py-1 flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="rounded-none border-primary/20 text-primary text-[8px] font-black px-1 py-0">
                                                                {player.position || "N/A"}
                                                            </Badge>
                                                            {player.global_player_id && (
                                                                <div className="rounded-none text-primary">
                                                                    <Link2 className="h-3 w-3" />
                                                                </div>
                                                            )}
                                                            <span className="text-[9px] font-bold tracking-widest text-muted-foreground/40 font-mono">
                                                                {formatDate(player.birth_date)}
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
                                                    className="h-10 w-10 text-primary hover:bg-primary/10 rounded-none transition-all"
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
                                                    className="h-10 w-10 text-red-500 hover:bg-red-500/10 rounded-none transition-all"
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
                                                {player.global_player_id ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnlinkPlayer(player.id);
                                                        }}
                                                        title="Unlink Identity"
                                                    >
                                                        <Unlink className="h-5 w-5" />
                                                    </Button>
                                                ) : (
                                                    <Popover
                                                        open={linkingPlayerId === player.id}
                                                        onOpenChange={(isOpen) => {
                                                            setLinkingPlayerId(isOpen ? player.id : null);
                                                            if (isOpen) {
                                                                setSearchQuery("");
                                                                handleSearch("");
                                                            } else {
                                                                setSearchQuery("");
                                                                setSearchResults([]);
                                                            }
                                                        }}
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-muted/10 rounded-none transition-all"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title={t("connect_identity") || "Connect Identity"}
                                                            >
                                                                <Link2 className="h-5 w-5" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80 p-0 rounded-none border-border bg-card shadow-2xl" align="end" onClick={(e) => e.stopPropagation()}>
                                                            <div className="p-0 border-b border-border/40">
                                                                <div className="relative group/search">
                                                                    <div className="relative">
                                                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within/search:text-primary group-focus-within/search:scale-110 transition-all duration-300 z-10" />
                                                                        <Input
                                                                            placeholder="Start typing..."
                                                                            value={searchQuery}
                                                                            onChange={(e) => handleSearch(e.target.value)}
                                                                            className="pl-14 h-16 text-xs bg-muted/5 border-none rounded-none group-focus-within/search:bg-muted/10 transition-all duration-500 font-black tracking-widest placeholder:text-muted-foreground/20 focus-visible:ring-0 shadow-none relative z-10"
                                                                            autoFocus
                                                                        />
                                                                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary group-focus-within/search:w-full transition-all duration-700 z-20" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                {isSearching ? (
                                                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                                        <span className="text-[9px] font-black tracking-widest text-muted-foreground/40">Scanning Database</span>
                                                                    </div>
                                                                ) : searchResults.length > 0 ? (
                                                                    <div className="py-2">
                                                                        {searchResults.map((gp) => (
                                                                            <button
                                                                                key={gp.id}
                                                                                className="w-full text-left px-5 py-3 hover:bg-primary/10 group/item flex items-center justify-between transition-colors border-b border-border/20 last:border-0"
                                                                                onClick={() => handleLinkPlayer(player.id, gp)}
                                                                            >
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-black text-xs tracking-tight group-hover/item:text-primary">{gp.name}</span>
                                                                                    {gp.date_of_birth && (
                                                                                        <span className="text-[9px] font-mono font-bold text-muted-foreground/60 mt-0.5">
                                                                                            {formatDate(gp.date_of_birth)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 opacity-0 group-hover/item:opacity-100 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-8 text-center space-y-4">
                                                                        <div className="h-10 w-10 bg-muted/20 border border-border/40 flex items-center justify-center mx-auto">
                                                                            {searchQuery ? <FileText className="h-5 w-5 text-muted-foreground/20" /> : <Search className="h-5 w-5 text-muted-foreground/20" />}
                                                                        </div>
                                                                        <p className="text-[10px] font-bold tracking-widest text-muted-foreground/40">
                                                                            {tCommon("no_results") || "No records found"}
                                                                        </p>
                                                                        {searchQuery && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="rounded-none w-full h-10 text-[9px] font-black tracking-widest border-2 hover:bg-primary hover:text-black hover:border-primary transition-all"
                                                                                onClick={async () => {
                                                                                    const res = await createGlobalPlayer(searchQuery, null, player.birth_date, [team.sport]);
                                                                                    if (res.success && res.data) {
                                                                                        await handleLinkPlayer(player.id, res.data);
                                                                                    } else {
                                                                                        toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Create & Sync Global ID
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-4 border-t border-border/40 bg-muted/5">
                                                                {!searchQuery && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="w-full h-10 rounded-none text-[9px] font-black tracking-widest justify-start px-2 hover:text-primary transition-colors"
                                                                        onClick={async () => {
                                                                            const res = await createGlobalPlayer(player.name, null, player.birth_date, [team.sport]);
                                                                            if (res.success && res.data) {
                                                                                await handleLinkPlayer(player.id, res.data);
                                                                            } else {
                                                                                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                                                            }
                                                                        }}
                                                                    >
                                                                        <UserPlus className="h-4 w-4 mr-3 opacity-40" />
                                                                        Create Global ID
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-muted/10 rounded-none transition-all"
                                                        disabled={effectivelyLocked}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-none border-border bg-card w-48 p-0">
                                                    <DropdownMenuItem
                                                        className="rounded-none py-3 px-4 text-[10px] font-black tracking-widest focus:bg-primary focus:text-black cursor-pointer transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingPlayerId(player.id);
                                                            setEditNumber(player.number?.toString() || "");
                                                            setEditPosition(player.position || "");
                                                            setEditBirthDate(player.birth_date || "");
                                                            setEditName(player.name || "");
                                                        }}
                                                    >
                                                        <Edit2 className="mr-3 h-4 w-4" />
                                                        {tCommon("edit")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="rounded-none py-3 px-4 text-[10px] font-black tracking-widest text-red-500 focus:bg-red-500 focus:text-foreground cursor-pointer transition-all border-t border-border/20"
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
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogContent className="sm:max-w-[450px] bg-background border-border rounded-none p-0 overflow-hidden shadow-2xl">
                                <ProfileManagement
                                    player={player}
                                    team={team}
                                    onSuccess={refreshPlayers}
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

