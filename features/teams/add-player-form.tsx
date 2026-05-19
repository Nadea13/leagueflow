'use client';

import React, { useState } from "react";
import { Plus, Loader2, UserPlus, Search, ArrowRight, FileText } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addPlayer } from "@/actions/manager/team";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchMasterPlayers } from "@/actions/common/user";

interface AddPlayerFormProps {
    teamId: string;
    onSuccess: () => Promise<void>;
    effectivelyLocked: boolean;
}

export function AddPlayerForm({ teamId, onSuccess, effectivelyLocked }: AddPlayerFormProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const { toast } = useToast();

    const [newName, setNewName] = useState("");
    const [newNumber, setNewNumber] = useState("");
    const [newPosition, setNewPosition] = useState("");
    const [newTel, setNewTel] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMasterPlayerId, setSelectedMasterPlayerId] = useState<string | null>(null);

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        setIsSearching(true);
        try {
            const res = await searchMasterPlayers(val);
            if (res.success && res.data) {
                const mapped = res.data.map((mp: any) => ({
                    id: mp.id,
                    name: `${mp.first_name} ${mp.last_name}`.trim(),
                    date_of_birth: mp.birthday,
                    tel: mp.tel
                }));
                setSearchResults(mapped);
            } else {
                setSearchResults([]);
            }
        } catch (err) {
            console.error("Error searching global players:", err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleSelectGlobalPlayer = async (gp: any) => {
        setIsPopoverOpen(false);
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append("name", gp.name);
            formData.append("number", "");
            formData.append("position", "");
            formData.append("tel", gp.tel || "");
            formData.append("master_player_id", gp.id);

            const result = await addPlayer(teamId, formData);
            if (result.success) {
                toast({ title: tCommon("success"), description: t("added_success") });
                setNewName("");
                setNewNumber("");
                setNewPosition("");
                setNewTel("");
                setSelectedMasterPlayerId(null);
                await onSuccess();
            } else {
                toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: tCommon("error"), description: err.message || "Failed to add player", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setIsSaving(true);
        const formData = new FormData();
        formData.append("name", newName);
        formData.append("number", newNumber);
        formData.append("position", newPosition);
        formData.append("tel", newTel);
        if (selectedMasterPlayerId) {
            formData.append("master_player_id", selectedMasterPlayerId);
        }

        const result = await addPlayer(teamId, formData);
        setIsSaving(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: t("added_success") });
            setNewName("");
            setNewNumber("");
            setNewPosition("");
            setNewTel("");
            setSelectedMasterPlayerId(null);
            onSuccess();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="bg-background border relative rounded-xl">
            <div className="p-2 md:p-4">
                <div className="flex items-center justify-between mb-2 md:mb-4">
                    <div className="flex items-center gap-3">
                        <Plus className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-black tracking-tighter text-foreground">
                            {t("add_player")}
                        </h3>
                    </div>

                    <Popover
                        open={isPopoverOpen}
                        onOpenChange={(isOpen) => {
                            setIsPopoverOpen(isOpen);
                            if (isOpen) {
                                handleSearch("");
                            }
                        }}
                    >
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-primary transition-all text-[10px] text-primary hover:text-primary hover:bg-primary/10 gap-2 md:gap-3">
                                <Search className="h-4 w-4" />
                                Search Players
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 border-border bg-card shadow-2xl" align="end">
                            <div className="p-0 border-b border-border/40">
                                <div className="relative">
                                    <Input
                                        placeholder="Search database..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-11 h-12 border-none bg-transparent font-black tracking-widest text-[11px] focus-visible:ring-0"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        <span className="text-[9px] font-black tracking-widest text-muted-foreground/40">Searching...</span>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="py-1">
                                        {searchResults.map((gp) => (
                                            <button
                                                key={gp.id}
                                                disabled={isSaving}
                                                className="w-full text-left px-4 py-3 hover:bg-primary/10 group flex items-center justify-between transition-colors border-b border-foreground/5 last:border-0 disabled:opacity-50"
                                                onClick={() => handleSelectGlobalPlayer(gp)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs tracking-tight group-hover:text-primary">{gp.name}</span>
                                                    {gp.date_of_birth && (
                                                        <span className="text-[9px] font-mono font-bold text-muted-foreground/40 mt-0.5">
                                                            {gp.date_of_birth}
                                                        </span>
                                                    )}
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center">
                                        <div className="h-10 w-10 border flex items-center justify-center mx-auto mb-2 md:mb-3">
                                            <FileText className="h-5 w-5 text-muted-foreground/20" />
                                        </div>
                                        <p className="text-[10px] font-black tracking-widest text-muted-foreground/40">No records found</p>
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <form onSubmit={handleAddPlayer} className="flex flex-wrap items-end gap-2 md:gap-3">
                    <div className="space-y-1 w-[80px] shrink-0">
                        <Label>{t("number")}</Label>
                        <Input
                            value={newNumber}
                            onChange={e => setNewNumber(e.target.value)}
                            placeholder="00"
                            type="text"
                            className="bg-transparent text-foreground focus-visible:ring-0"
                        />
                    </div>

                    <div className="space-y-1 flex-1 min-w-[200px] relative transition-all">
                        <div className="flex items-center justify-between">
                            <Label>{t("player_name")} <span className="text-destructive">*</span></Label>
                        </div>
                        <Input
                            value={newName}
                            onChange={e => {
                                setNewName(e.target.value);
                                if (selectedMasterPlayerId) setSelectedMasterPlayerId(null);
                            }}
                            placeholder={t("player_name")}
                            required
                            className="bg-transparent text-foreground focus-visible:ring-0"
                        />
                    </div>

                    <div className="flex gap-2 md:gap-3 flex-1 md:flex-none md:w-auto w-full items-end">
                        <div className="space-y-1 shrink-0 w-[120px]">
                            <Label>{t("position")}</Label>
                            <Select value={newPosition} onValueChange={setNewPosition}>
                                <SelectTrigger className="bg-transparent w-full text-foreground focus-visible:ring-0">
                                    <SelectValue placeholder={t("position")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GK">{t("goalkeeper")}</SelectItem>
                                    <SelectItem value="DF">{t("defender")}</SelectItem>
                                    <SelectItem value="MF">{t("midfielder")}</SelectItem>
                                    <SelectItem value="FW">{t("forward")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 flex-1 md:w-[150px] shrink-0">
                            <Label>{t("tel") || "Telephone"}</Label>
                            <Input
                                value={newTel}
                                onChange={e => setNewTel(e.target.value)}
                                type="tel"
                                placeholder="08X-XXX-XXXX"
                                className="bg-transparent text-foreground focus-visible:ring-0"
                            />
                        </div>
                    </div>

                    <div className="shrink-0 w-full md:w-[160px] relative">
                        <Button
                            type="submit"
                            className="w-full h-10 font-black tracking-widest text-sm transition-all disabled:opacity-50"
                            disabled={isSaving || !newName.trim() || effectivelyLocked}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                            {t("add_player")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
