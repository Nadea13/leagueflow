"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Search, Plus, User, MoreHorizontal, Calendar, Shield } from "lucide-react";
import { GlobalPlayer } from "@/types";
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
    initialPlayers: GlobalPlayer[];
}

export function AdminPlayersTable({ initialPlayers }: AdminPlayersTableProps) {
    const t = useTranslations("Admin");
    const commonT = useTranslations("Common");
    const [searchTerm, setSearchTerm] = useState("");
    const [players] = useState(initialPlayers);
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
                        placeholder={t("search_players")}
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-none text-[10px] font-black tracking-wider h-10 px-6">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("add_player")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-none border-border p-0 overflow-hidden">
                        <div className="bg-primary/10 px-6 py-5 border-b border-border relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    {t("add_player")}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-sm font-medium pt-1">
                                    Create a new player record in the global database.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-[10px] font-black tracking-wider">
                                    {t("player_name")}
                                </Label>
                                <Input
                                    id="name"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    placeholder={t("player_name_placeholder")}
                                    className="rounded-none border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="photo" className="text-[10px] font-black tracking-wider">
                                    {t("photo_url")}
                                </Label>
                                <Input
                                    id="photo"
                                    value={newPlayerPhoto}
                                    onChange={(e) => setNewPlayerPhoto(e.target.value)}
                                    placeholder="https://..."
                                    className="rounded-none border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dob" className="text-[10px] font-black tracking-wider">
                                    {t("date_of_birth")}
                                </Label>
                                <Input
                                    id="dob"
                                    type="date"
                                    value={newPlayerDOB}
                                    onChange={(e) => setNewPlayerDOB(e.target.value)}
                                    className="rounded-none border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsAddDialogOpen(false)}
                                className="rounded-none text-[10px] font-black tracking-wider"
                            >
                                {commonT("cancel")}
                            </Button>
                            <Button 
                                onClick={handleAddPlayer}
                                className="rounded-none text-[10px] font-black tracking-wider"
                            >
                                {t("add_player")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-none border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">
                                {commonT("user")}
                            </TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">
                                {t("date_of_birth")}
                            </TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">
                                {t("created_at")}
                            </TableHead>
                            <TableHead className="text-right text-[10px] font-black tracking-[0.15em] text-muted-foreground">
                                {t("actions")}
                            </TableHead>
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
                                <TableRow key={player.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-muted/50 flex items-center justify-center border border-border overflow-hidden shrink-0">
                                                {player.photo_url ? (
                                                    <Image src={player.photo_url} alt={player.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                                ) : (
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm tracking-tight">{player.name}</span>
                                                <span className="text-[10px] font-medium text-muted-foreground tracking-wider -mt-0.5">PLAYER</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {player.date_of_birth || "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-[10px] font-bold tracking-tight">
                                        {player.created_at ? new Date(player.created_at).toLocaleDateString() : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/30">
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
