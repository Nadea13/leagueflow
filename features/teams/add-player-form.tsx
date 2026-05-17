'use client';

import React, { useState, useCallback } from "react";
import { Plus, Search, Loader2, Link2, X, ArrowRight, FileText, UserPlus } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addPlayer } from "@/actions/manager/team";
import { getGlobalPlayers } from "@/actions/organizer/tournaments/global-player";
import { GlobalPlayer } from "@/types/index";

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
    const [newBirthDate, setNewBirthDate] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Global Player Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GlobalPlayer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedGlobalPlayerId, setSelectedGlobalPlayerId] = useState<string | null>(null);
    const pageSize = 10;

    const fetchGlobalPlayersData = useCallback(async (page: number, query: string) => {
        setIsSearching(true);
        const result = await getGlobalPlayers(page, pageSize, query);
        if (result.success && result.data) {
            setSearchResults(result.data.players);
        }
        setIsSearching(false);
    }, []);

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        fetchGlobalPlayersData(1, query);
    }, [fetchGlobalPlayersData]);

    const handleSelectGlobalPlayer = (gp: GlobalPlayer) => {
        setNewName(gp.name);
        setSelectedGlobalPlayerId(gp.id);
        if (gp.date_of_birth) {
            setNewBirthDate(gp.date_of_birth);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setIsSaving(true);
        const formData = new FormData();
        formData.append("name", newName);
        formData.append("number", newNumber);
        formData.append("position", newPosition);
        formData.append("birthDate", newBirthDate);
        if (selectedGlobalPlayerId) {
            formData.append("global_player_id", selectedGlobalPlayerId);
        }

        const result = await addPlayer(teamId, formData);
        setIsSaving(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: t("added_success") });
            setNewName("");
            setNewNumber("");
            setNewPosition("");
            setNewBirthDate("");
            setSelectedGlobalPlayerId(null);
            onSuccess();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="bg-card border relative">
            <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-3">
                        <Plus className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-black tracking-tighter text-foreground">
                            {t("add_player")}
                        </h3>
                    </div>

                    <Popover
                        onOpenChange={(isOpen) => {
                            if (isOpen) {
                                handleSearch("");
                            }
                        }}
                    >
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-primary transition-all text-[10px] text-primary hover:text-primary hover:bg-primary/10 gap-2 md:gap-3">
                                <Search className="h-4 w-4" />
                                {t("connect_global") || "Search Global"}
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
                                                className="w-full text-left px-4 py-3 hover:bg-primary/10 group flex items-center justify-between transition-colors border-b border-foreground/5 last:border-0"
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
                        <Label className="text-xs font-black tracking-widest text-primary">{t("number")}</Label>
                        <Input
                            value={newNumber}
                            onChange={e => setNewNumber(e.target.value)}
                            placeholder="00"
                            type="number"
                            className="bg-transparent text-foreground focus-visible:ring-0"
                        />
                    </div>

                    <div className="space-y-1 flex-1 min-w-[200px] relative transition-all">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black tracking-widest text-primary">{t("player_name")} <span className="text-destructive">*</span></Label>
                            {selectedGlobalPlayerId && (
                                <Badge variant="default" className="h-5 bg-primary/10 text-primary border-none text-[8px] font-black tracking-widest px-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95">
                                    <Link2 className="h-2.5 w-2.5" />
                                    Connected
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGlobalPlayerId(null)}
                                        className="ml-0.5 hover:text-foreground transition-colors"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                        <Input
                            value={newName}
                            onChange={e => {
                                setNewName(e.target.value);
                                if (selectedGlobalPlayerId) setSelectedGlobalPlayerId(null);
                            }}
                            placeholder={t("player_name")}
                            required
                            className="bg-transparent text-foreground focus-visible:ring-0"
                        />
                    </div>

                    <div className="flex gap-2 md:gap-3 flex-1 md:flex-none md:w-auto w-full items-end">
                        <div className="space-y-1 shrink-0 w-[120px]">
                            <Label className="text-xs font-black tracking-widest text-primary">{t("position")}</Label>
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
                            <Label className="text-xs font-black tracking-widest text-primary">{t("birth_date")}</Label>
                            <Input
                                value={newBirthDate}
                                onChange={e => setNewBirthDate(e.target.value)}
                                type="date"
                                lang={locale === 'th' ? 'th-TH' : 'en-US'}
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
