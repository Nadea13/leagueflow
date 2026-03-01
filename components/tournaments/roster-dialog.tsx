"use client";

import { useState, useEffect, useCallback } from "react";
import { Player, GlobalPlayer } from "@/types/index";
import { addPlayer, getPlayers, deletePlayer } from "@/app/[locale]/dashboard/tournaments/[id]/player-actions";
import { searchGlobalPlayers, linkPlayerToGlobal, unlinkPlayerFromGlobal } from "@/app/[locale]/dashboard/tournaments/[id]/global-player-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, UserPlus, Trash2, Users, Link2, Unlink, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface RosterDialogProps {
    teamId: string;
    teamName: string;
    trigger?: React.ReactNode;
}

export function RosterDialog({ teamId, teamName, trigger }: RosterDialogProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [open, setOpen] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newNumber, setNewNumber] = useState("");
    const [newPosition, setNewPosition] = useState("");

    // Global Player Search State
    const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GlobalPlayer[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchPlayers = async () => {
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
    };

    useEffect(() => {
        if (open) {
            fetchPlayers();
        }
    }, [open, teamId]);

    // Debounced search for global players
    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const result = await searchGlobalPlayers(query);
        if (result.success && result.data) {
            setSearchResults(result.data);
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

        const result = await addPlayer(teamId, null, formData);

        setIsSaving(false);
        if (result.success) {
            toast({
                title: tCommon("success"),
                description: t("added_success"),
            });
            setNewName("");
            setNewNumber("");
            setNewPosition("");
            fetchPlayers();
        } else {
            toast({
                title: tCommon("error"),
                description: result.error || tCommon("error"),
                variant: "destructive",
            });
        }
    };

    const handleDeletePlayer = async (playerId: string) => {
        if (!confirm(t("delete_confirm"))) return;

        const result = await deletePlayer(playerId);
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
                    <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        {t("manage_roster")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("title")} - {teamName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add Player Form */}
                    <div className="p-4 bg-muted/30 rounded-none border">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            {t("add_player")}
                        </h4>
                        <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium mb-1 block">{t("player_name")} *</label>
                                <Input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={t("player_name")}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">{t("number")}</label>
                                <Input
                                    value={newNumber}
                                    onChange={e => setNewNumber(e.target.value)}
                                    placeholder="10"
                                    type="number"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">{t("position")}</label>
                                <Select value={newPosition} onValueChange={setNewPosition}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("position")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GK">GK {t("goalkeeper")}</SelectItem>
                                        <SelectItem value="DF">DF {t("defender")}</SelectItem>
                                        <SelectItem value="MF">MF {t("midfielder")}</SelectItem>
                                        <SelectItem value="FW">FW {t("forward")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-4 flex justify-end mt-2">
                                <Button type="submit" size="sm" disabled={isSaving || !newName.trim()}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                    {t("add_player")}
                                </Button>
                            </div>
                        </form>
                    </div>

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
                            <div className="border rounded-none">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px] text-center">{t("number")}</TableHead>
                                            <TableHead>{t("player_name")}</TableHead>
                                            <TableHead>{t("position")}</TableHead>
                                            <TableHead className="w-[120px] text-center">Link</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {players.map((player) => (
                                            <TableRow key={player.id}>
                                                <TableCell className="text-center font-mono font-medium">
                                                    {player.number || "-"}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {player.name}
                                                        {player.global_player_id && (
                                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                                <Link2 className="h-3 w-3 mr-1" />
                                                                Linked
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{player.position || "-"}</TableCell>
                                                <TableCell className="text-center">
                                                    {player.global_player_id ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-muted-foreground"
                                                            onClick={() => handleUnlinkPlayer(player.id)}
                                                        >
                                                            <Unlink className="h-3 w-3 mr-1" />
                                                            Unlink
                                                        </Button>
                                                    ) : (
                                                        <Popover
                                                            open={linkingPlayerId === player.id}
                                                            onOpenChange={(isOpen) => {
                                                                setLinkingPlayerId(isOpen ? player.id : null);
                                                                if (!isOpen) {
                                                                    setSearchQuery("");
                                                                    setSearchResults([]);
                                                                }
                                                            }}
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                                    <Link2 className="h-3 w-3 mr-1" />
                                                                    Link
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-72 p-3" align="end">
                                                                <div className="space-y-3">
                                                                    <div className="relative">
                                                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                        <Input
                                                                            placeholder="Search player database..."
                                                                            value={searchQuery}
                                                                            onChange={(e) => handleSearch(e.target.value)}
                                                                            className="pl-8 h-9"
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                    <div className="max-h-[200px] overflow-y-auto">
                                                                        {isSearching ? (
                                                                            <div className="flex justify-center py-4">
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            </div>
                                                                        ) : searchResults.length > 0 ? (
                                                                            <div className="space-y-1">
                                                                                {searchResults.map((gp) => (
                                                                                    <button
                                                                                        key={gp.id}
                                                                                        className="w-full text-left px-2 py-1.5 hover:bg-muted text-sm flex items-center justify-between"
                                                                                        onClick={() => handleLinkPlayer(player.id, gp)}
                                                                                    >
                                                                                        <span>{gp.name}</span>
                                                                                        {gp.date_of_birth && (
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {gp.date_of_birth}
                                                                                            </span>
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        ) : searchQuery.length >= 2 ? (
                                                                            <div className="text-center py-3">
                                                                                <p className="text-xs text-muted-foreground mb-2">
                                                                                    No players found
                                                                                </p>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="text-xs h-7"
                                                                                    onClick={async () => {
                                                                                        const { createGlobalPlayer } = await import("@/app/[locale]/dashboard/tournaments/[id]/global-player-actions");
                                                                                        const res = await createGlobalPlayer(searchQuery);
                                                                                        if (res.success && res.data) {
                                                                                            await handleLinkPlayer(player.id, res.data);
                                                                                        } else {
                                                                                            toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <UserPlus className="h-3 w-3 mr-1" />
                                                                                    Create &quot;{searchQuery}&quot; & Link
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-muted-foreground text-center py-4">
                                                                                Type at least 2 characters
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {/* Quick: Create & Link with player's own name */}
                                                                    {!searchQuery && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="secondary"
                                                                            className="w-full text-xs h-8"
                                                                            onClick={async () => {
                                                                                const { createGlobalPlayer } = await import("@/app/[locale]/dashboard/tournaments/[id]/global-player-actions");
                                                                                const res = await createGlobalPlayer(player.name);
                                                                                if (res.success && res.data) {
                                                                                    await handleLinkPlayer(player.id, res.data);
                                                                                } else {
                                                                                    toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                                                                }
                                                                            }}
                                                                        >
                                                                            <UserPlus className="h-3 w-3 mr-1" />
                                                                            Quick: Create &quot;{player.name}&quot; & Link
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                                                        onClick={() => handleDeletePlayer(player.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
