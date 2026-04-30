"use client";

import { useState, useEffect, useCallback } from "react";
import { Player, GlobalPlayer } from "@/types/index";
import { addPlayer, getPlayers, deletePlayer, updatePlayer } from "@/actions/organizer/tournaments/player";
import {  linkPlayerToGlobal, unlinkPlayerFromGlobal } from "@/actions/organizer/tournaments/global-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, UserPlus, Trash2, Users, Link2, Unlink, Search, Save, X, Eye, FileText, ArrowRight, MoreVertical, Edit2, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface RosterDialogProps {
    teamId: string;
    teamName: string;
    trigger?: React.ReactNode;
    readOnly?: boolean;
}

export function RosterDialog({ teamId, teamName, trigger, readOnly = false }: RosterDialogProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [open, setOpen] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const locale = useLocale();

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr || dateStr === "0000-00-00") return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";

        return date.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Form State
    const [newName, setNewName] = useState("");
    const [newNumber, setNewNumber] = useState("");
    const [newPosition, setNewPosition] = useState("");
    const [newBirthDate, setNewBirthDate] = useState("");

    // Global Player Search State
    const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GlobalPlayer[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Edit State
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editName, setEditName] = useState<string>("");
    const [editNumber, setEditNumber] = useState<string>("");
    const [editPosition, setEditPosition] = useState<string>("");
    const [editBirthDate, setEditBirthDate] = useState<string>("");

    const fetchPlayers = useCallback(async () => {
        setIsLoading(true);
        const result = await getPlayers(teamId);
        if (result.success && result.data) {
            setPlayers(result.data);
        } else {
            toast({
                title: tCommon("error"),
                description: t("no_players"),
                variant: "destructive",
            });
        }
        setIsLoading(false);
    }, [teamId, tCommon, t, toast]);

    useEffect(() => {
        if (open) {
            fetchPlayers();
        }
    }, [open, fetchPlayers]);

    // Search for global players (now allows empty query to fetch initial list)
    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        setIsSearching(true);
        const { searchGlobalPlayers } = await import("@/actions/organizer/tournaments/global-player");
        const result = await searchGlobalPlayers(query);
        if (result.success && result.data) {
            setSearchResults(result.data);
        } else {
            setSearchResults([]);
        }
        setIsSearching(false);
    }, []);

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newName.trim()) return;

        setIsSaving(true);
        const formData = new FormData();
        formData.append("name", newName);
        formData.append("number", newNumber);
        formData.append("position", newPosition);
        formData.append("birthDate", newBirthDate);

        const result = await addPlayer(teamId, { success: false }, formData);

        setIsSaving(false);
        if (result.success) {
            toast({
                title: tCommon("success"),
                description: t("added_success"),
            });
            setNewName("");
            setNewNumber("");
            setNewPosition("");
            setNewBirthDate("");
            fetchPlayers();
        } else {
            toast({
                title: tCommon("error"),
                description: result.error || tCommon("error"),
                variant: "destructive",
            });
        }
    };

    const confirmDeletePlayer = async () => {
        if (!playerToDelete) return;

        const result = await deletePlayer(playerToDelete);
        setPlayerToDelete(null);
        if (result.success) {
            toast({
                title: tCommon("success"),
                description: t("deleted_success"),
            });
            fetchPlayers();
        } else {
            toast({
                title: tCommon("error"),
                description: result.error || tCommon("error"),
                variant: "destructive",
            });
        }
    };

    const handleUpdatePlayer = async (playerId: string) => {
        setIsSaving(true);
        const result = await updatePlayer(playerId, {
            name: !players.find(p => p.id === playerId)?.global_player_id ? (editName || undefined) : undefined,
            number: editNumber ? parseInt(editNumber) : null,
            position: editPosition || null,
            birth_date: editBirthDate || null,
        });
        setIsSaving(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: t("updated_success") || "Player updated" });
            setEditingPlayerId(null);
            fetchPlayers();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleLinkPlayer = async (playerId: string, globalPlayer: GlobalPlayer) => {
        const result = await linkPlayerToGlobal(playerId, globalPlayer.id);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Player linked successfully" });
            setLinkingPlayerId(null);
            setSearchQuery("");
            setSearchResults([]);
            fetchPlayers();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleUnlinkPlayer = async (playerId: string) => {
        const result = await unlinkPlayerFromGlobal(playerId);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Player unlinked" });
            fetchPlayers();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="icon" className="bg-background/50 backdrop-blur-sm rounded-none border-border/10 hover:border-primary/30 text-muted-foreground/40 hover:text-primary transition-all">
                        {readOnly ? (
                            <Eye className="h-4 w-4" />
                        ) : (
                            <Users className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                            {readOnly ? t("view_squad") : t("manage_squad")}
                        </span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("title")} - {teamName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Add Player Form */}
                    {!readOnly && (
                        <div className="bg-card border border-border/40 relative overflow-hidden group">
                            <div className="absolute left-0 w-1 h-full bg-primary transition-all" />
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="space-y-1 block w-full">
                                        <div className="flex items-center w-full">
                                            <h3 className="text-lg font-black tracking-tighter text-foreground flex items-center gap-2">
                                                <UserPlus className="h-5 w-5 text-primary" />
                                                {t("add_player")}
                                            </h3>
                                            <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-4 hidden sm:block" />
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleAddPlayer} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                                    <div className="sm:col-span-5 space-y-2 relative">
                                        <label className="text-[10px] font-bold tracking-wider text-muted-foreground ml-1">{t("player_name")} *</label>
                                        <Input
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder={t("player_name")}
                                            required
                                            className="h-10 rounded-none bg-background/50 border-input/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold tracking-wider text-muted-foreground ml-1">{t("birth_date") || "Birth Date"}</label>
                                        <Input
                                            value={newBirthDate}
                                            onChange={e => setNewBirthDate(e.target.value)}
                                            type="date"
                                            lang={locale === 'th' ? 'th-TH' : 'en-US'}
                                            className="h-10 rounded-none bg-background/50 border-input/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold tracking-wider text-muted-foreground ml-1">{t("number")}</label>
                                        <Input
                                            value={newNumber}
                                            onChange={e => setNewNumber(e.target.value)}
                                            placeholder="10"
                                            type="number"
                                            className="h-10 rounded-none bg-background/50 border-input/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-center font-bold"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold tracking-wider text-muted-foreground ml-1">{t("position")}</label>
                                        <Select value={newPosition} onValueChange={setNewPosition}>
                                            <SelectTrigger className="h-10 rounded-none bg-background/50 border-input/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all">
                                                <SelectValue placeholder="POS" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none">
                                                <SelectItem value="GK" className="cursor-pointer">GK {t("goalkeeper")}</SelectItem>
                                                <SelectItem value="DF" className="cursor-pointer">DF {t("defender")}</SelectItem>
                                                <SelectItem value="MF" className="cursor-pointer">MF {t("midfielder")}</SelectItem>
                                                <SelectItem value="FW" className="cursor-pointer">FW {t("forward")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold tracking-wider text-transparent select-none hidden sm:block">Action</label>
                                        <Button 
                                            type="submit" 
                                            className="w-full h-10 rounded-none font-black tracking-wider text-xs transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,157,0.15)]" 
                                            disabled={isSaving || !newName.trim()}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                                            {t("add")}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Player List */}
                    <div>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : players.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-none bg-muted/10">
                                <div className="h-12 w-12 rounded-none bg-muted/20 flex items-center justify-center mb-4">
                                    <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-medium text-muted-foreground">{t("no_players_desc")}</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Please add players to this team.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {players.map((player) => (
                                    <div key={player.id} className="group bg-card border border-border/40 relative overflow-hidden transition-all hover:border-primary/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                                        <div className="absolute left-0 top-0 w-1 h-full bg-primary opacity-80 group-hover:opacity-100 transition-opacity" />

                                        <div className="p-4 flex flex-col md:flex-row md:items-center gap-6">
                                            {/* Player Number & Avatar */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="w-12 h-12 bg-muted/20 border border-border/40 flex items-center justify-center rounded-none relative">
                                                    {editingPlayerId === player.id ? (
                                                        <Input
                                                            value={editNumber}
                                                            onChange={e => setEditNumber(e.target.value)}
                                                            className="h-full w-full border-none bg-primary/10 text-center font-mono text-xl font-black focus-visible:ring-0 p-0 rounded-none shadow-none"
                                                            type="number"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-2xl font-black tracking-tighter text-primary">
                                                            {player.number?.toString().padStart(2, '0') || "??"}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="h-12 w-12 rounded-none border border-border/40 overflow-hidden bg-muted/10 relative">
                                                    {player.photo_url || player.global_player?.photo_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={player.photo_url || player.global_player?.photo_url || ""} alt={player.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center opacity-20">
                                                            <Users className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Player Name & Connection */}
                                             <div className="flex-1 min-w-0 pr-12 md:pr-0">
                                                <div className="flex items-center flex-wrap gap-3 mb-1">
                                                    {(editingPlayerId === player.id && !player.global_player_id) ? (
                                                        <Input
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            className="h-10 flex-1 min-w-[200px] rounded-none border-t-0 border-x-0 border-border/40 bg-primary/10 text-xl font-black tracking-tighter text-primary focus-visible:ring-0"
                                                            placeholder={t("player_name")}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h4 className="text-xl font-black tracking-tighter text-foreground leading-none group-hover:text-primary transition-colors">
                                                            {player.name}
                                                        </h4>
                                                    )}

                                                    {player.global_player_id ? (
                                                        <Badge variant="default" className="rounded-none bg-primary/10 text-primary border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                                                            <Link2 className="h-2.5 w-2.5 mr-1" />
                                                            {t("verified") || "VERIFIED"}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="rounded-none border-muted-foreground/20 text-muted-foreground/40 text-[9px] font-black tracking-widest px-2 py-0.5">
                                                            {t("local_only") || "LOCAL ONLY"}
                                                        </Badge>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        {editingPlayerId === player.id ? (
                                                            <Select value={editPosition} onValueChange={setEditPosition}>
                                                                <SelectTrigger className="h-7 w-20 rounded-none border-t-0 border-x-0 border-border/40 bg-muted/20 text-[9px] font-black tracking-widest p-1 focus:ring-0 [&_svg]:hidden">
                                                                    <SelectValue placeholder="POS" />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-none border-border">
                                                                    <SelectItem value="FW" className="text-[9px] font-black tracking-widest">{t("forward") || "FW"}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Badge className="rounded-none bg-muted border-none text-muted-foreground text-[9px] font-black tracking-widest px-2 py-0.5">
                                                                {player.position || "N/A"}
                                                            </Badge>
                                                        )}

                                                        {(editingPlayerId === player.id && !player.global_player_id) ? (
                                                            <Input
                                                                value={editBirthDate}
                                                                onChange={e => setEditBirthDate(e.target.value)}
                                                                type="date"
                                                                lang={locale === 'th' ? 'th-TH' : 'en-US'}
                                                                className="h-7 w-28 border-t-0 border-x-0 border-border/40 bg-muted/10 text-[9px] font-black p-1 focus-visible:ring-0 shadow-none"
                                                            />
                                                        ) : (
                                                            player.birth_date && (
                                                                <span className="text-[10px] font-bold tracking-widest text-muted-foreground/40 font-mono">
                                                                    {formatDate(player.birth_date)}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 mt-3">
                                                    {!player.global_player_id && !readOnly && (
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
                                                                <Button variant="link" size="sm" className="p-0 h-auto text-[10px] font-black tracking-widest text-primary hover:text-primary/80 flex items-center gap-2">
                                                                    <Link2 className="h-3.5 w-3.5" />
                                                                    {tCommon("search")} Global ID
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80 p-0 rounded-none border-border bg-card shadow-2xl" align="start">
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
                                                                                        const { createGlobalPlayer } = await import("@/actions/organizer/tournaments/global-player");
                                                                                        const res = await createGlobalPlayer(searchQuery, null, player.birth_date);
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
                                                                                const { createGlobalPlayer } = await import("@/actions/organizer/tournaments/global-player");
                                                                                const res = await createGlobalPlayer(player.name, null, player.birth_date);
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

                                                    {player.global_player_id && !readOnly && (
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            className="p-0 h-auto text-[10px] font-black tracking-widest text-red-500/60 hover:text-red-500 flex items-center gap-2"
                                                            onClick={() => handleUnlinkPlayer(player.id)}
                                                        >
                                                            <Unlink className="h-3.5 w-3.5" />
                                                            Unlink Identity
                                                        </Button>
                                                    )}

                                                    {player.global_player_id && (
                                                        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                            <span className="text-[9px] font-black tracking-[0.2em] text-foreground">Cloud Sync Active</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {!readOnly && (
                                                <div className="md:static absolute top-4 right-4 flex items-center justify-end gap-3 md:border-t-0 md:border-l border-border/20 md:pt-0 md:pl-6 shrink-0">
                                                    {editingPlayerId === player.id ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="default"
                                                                size="icon"
                                                                className="h-10 w-10 rounded-none bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,157,0.2)]"
                                                                onClick={() => handleUpdatePlayer(player.id)}
                                                                disabled={isSaving}
                                                            >
                                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-5 w-5" />}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-10 w-10 rounded-none border-2"
                                                                onClick={() => setEditingPlayerId(null)}
                                                                disabled={isSaving}
                                                            >
                                                                <X className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-muted/10 rounded-none transition-all"
                                                                >
                                                                    <MoreVertical className="h-5 w-5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-none border-border bg-card w-48 p-0">
                                                                <DropdownMenuItem
                                                                    className="rounded-none py-3 px-4 text-[10px] font-black tracking-widest focus:bg-primary focus:text-black cursor-pointer transition-all"
                                                                    onClick={() => {
                                                                        setEditingPlayerId(player.id);
                                                                        setEditName(player.name || "");
                                                                        setEditNumber(player.number?.toString() || "");
                                                                        setEditPosition(player.position || "");
                                                                        setEditBirthDate(player.birth_date || "");
                                                                    }}
                                                                >
                                                                    <Edit2 className="mr-3 h-4 w-4" />
                                                                    {tCommon("edit")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="rounded-none py-3 px-4 text-[10px] font-black tracking-widest text-red-500 focus:bg-red-500 focus:text-foreground cursor-pointer transition-all border-t border-border/20"
                                                                    onClick={() => setPlayerToDelete(player.id)}
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                    <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                <Trash2 className="h-5 w-5 text-destructive" />
                                {tCommon("delete")}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                                {t("delete_desc")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="rounded-none border-border/10 bg-foreground/5 hover:bg-foreground/10 hover:text-foreground transition-all h-10 text-[11px] font-black tracking-widest">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmDeletePlayer();
                                }}
                                className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {tCommon("delete")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}
