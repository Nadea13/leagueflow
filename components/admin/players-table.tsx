"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus, User, MoreHorizontal, Trash } from "lucide-react";
import { createGlobalPlayer } from "@/app/[locale]/admin/actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AdminPlayersTableProps {
    initialPlayers: any[];
}

export function AdminPlayersTable({ initialPlayers }: AdminPlayersTableProps) {
    const t = useTranslations("Admin");
    const commonT = useTranslations("Common");
    const [searchTerm, setSearchTerm] = useState("");
    const [players, setPlayers] = useState(initialPlayers);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [newPlayerPhoto, setNewPlayerPhoto] = useState("");
    const [newPlayerDOB, setNewPlayerDOB] = useState("");

    const filteredPlayers = players.filter(player =>
        (player.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const handleAddPlayer = async () => {
        if (!newPlayerName.trim()) {
            toast.error("Player name is required");
            return;
        }

        const result = await createGlobalPlayer(newPlayerName, {
            photo_url: newPlayerPhoto,
            date_of_birth: newPlayerDOB || null
        });

        if (result.success) {
            toast.success("Player added successfully");
            setNewPlayerName("");
            setNewPlayerPhoto("");
            setNewPlayerDOB("");
            setIsAddDialogOpen(false);
            // In a real app, we should refresh data from server
            window.location.reload();
        } else {
            toast.error(result.error || "Failed to add player");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("search_players") || "Search players..."}
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            {t("add_player") || "Add Player"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("add_player") || "Add Player"}</DialogTitle>
                            <DialogDescription>
                                Create a new player record in the global database.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t("player_name") || "Full Name"}</Label>
                                <Input
                                    id="name"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    placeholder={t("player_name_placeholder") || "Enter player's full name"}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="photo">{t("photo_url") || "Photo URL"}</Label>
                                <Input
                                    id="photo"
                                    value={newPlayerPhoto}
                                    onChange={(e) => setNewPlayerPhoto(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dob">{t("date_of_birth") || "Date of Birth"}</Label>
                                <Input
                                    id="dob"
                                    type="date"
                                    value={newPlayerDOB}
                                    onChange={(e) => setNewPlayerDOB(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{commonT("cancel")}</Button>
                            <Button onClick={handleAddPlayer}>{t("add_player")}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-none border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{commonT("user")}</TableHead>
                            <TableHead>{t("date_of_birth") || "DOB"}</TableHead>
                            <TableHead>{t("created_at")}</TableHead>
                            <TableHead className="text-right">{t("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPlayers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {t("no_results")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPlayers.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-none bg-muted flex items-center justify-center overflow-hidden border">
                                                {player.photo_url ? (
                                                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <span className="font-medium text-sm">{player.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {player.date_of_birth || "-"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {player.created_at ? new Date(player.created_at).toLocaleDateString() : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
