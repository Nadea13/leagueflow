"use client";

import { useState, useEffect } from "react";
import { Player } from "@/types/index";
import { addPlayer, getPlayers, deletePlayer } from "@/app/[locale]/dashboard/tournaments/[id]/player-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserPlus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";

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

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newName.trim()) return;

        setIsSaving(true);
        const formData = new FormData();
        formData.append("name", newName);
        formData.append("number", newNumber);
        formData.append("position", newPosition);

        const result = await addPlayer(teamId, null, formData); // prevState is null

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
                    <div className="p-4 bg-muted/30 rounded-lg border">
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
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t("no_players_desc")}</p>
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px] text-center">{t("number")}</TableHead>
                                            <TableHead>{t("player_name")}</TableHead>
                                            <TableHead>{t("position")}</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {players.map((player) => (
                                            <TableRow key={player.id}>
                                                <TableCell className="text-center font-mono font-medium">
                                                    {player.number || "-"}
                                                </TableCell>
                                                <TableCell className="font-medium">{player.name}</TableCell>
                                                <TableCell>{player.position || "-"}</TableCell>
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
