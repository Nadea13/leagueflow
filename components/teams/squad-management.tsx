'use client';

import React, { useState, useCallback, useEffect } from "react";
import {  Player, GlobalPlayer, Team, SportType, Registration, Tournament } from "@/types/index";
import { getPlayers, addPlayer, updatePlayer, deletePlayer, importRoster, toggleRosterLock, updateTeamGlobal, getMyTeams, deleteTeamGlobal } from "@/actions/manager/team";
import Papa from "papaparse";
import * as xlsx from "xlsx";
import {  linkPlayerToGlobal, unlinkPlayerFromGlobal, updateGlobalPlayerIdCard, updateGlobalPlayerPhoto, getGlobalPlayers, updateGlobalPlayerAthleteTypes, createGlobalPlayer } from "@/actions/organizer/tournaments/global-player";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Removed unused Table, TableRow imports
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, UserPlus, Trash2, Users, Link2, Unlink, Search, Save, X, Upload, Copy, AlertCircle, Lock, Unlock, ExternalLink, FileText, View, Camera, MoreVertical, Edit2, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface SquadManagementProps {
    team: Team & {
        participations?: { tournament_id: string }[];
        registrations?: Registration[];
        is_roster_locked?: boolean;
        isParticipation?: boolean;
        tournament?: Tournament;
        team_id?: string | null;
    };
    initialPlayers: Player[];
}

export function SquadManagement({ team, initialPlayers }: SquadManagementProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const tTeam = useTranslations("Team");
    const tSports = useTranslations("Sports");
    const locale = useLocale();
    const { toast } = useToast();

    // Helper to format date based on locale
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr || dateStr === "0000-00-00") return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";

        // English: MM/DD/YYYY, Thai: DD/MM/YYYY
        return date.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
    const [isDeletingTeam, setIsDeletingTeam] = useState(false);
    const router = useRouter();

    // Form State
    const [newName, setNewName] = useState("");
    const [newNumber, setNewNumber] = useState("");
    const [newPosition, setNewPosition] = useState("");
    const [newBirthDate, setNewBirthDate] = useState("");

    // Global Player Search State (shared with Add Player form)
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GlobalPlayer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedGlobalPlayerId, setSelectedGlobalPlayerId] = useState<string | null>(null);

    // Team Edit State
    const [teamName, setTeamName] = useState(team.name);
    const [previewUrl, setPreviewUrl] = useState<string | null>(team.logo_url || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    // Edit State
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editNumber, setEditNumber] = useState<string>("");
    const [editPosition, setEditPosition] = useState<string>("");
    const [editBirthDate, setEditBirthDate] = useState<string>("");
    const [editName, setEditName] = useState<string>("");

    // Import Roster State
    const [myTeams, setMyTeams] = useState<Team[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isFetchingTeams, setIsFetchingTeams] = useState(false);
    const [selectedSourceTeamId, setSelectedSourceTeamId] = useState<string>("");
    const [importTab, setImportTab] = useState<"teams" | "file">("teams");
    const [importFile, setImportFile] = useState<File | null>(null);

    // Synergy State
    const [isLocked, setIsLocked] = useState(team.is_roster_locked || false);
    const [isLocking, setIsLocking] = useState(false);

    // Deadline check
    const documentDeadline = team.tournament?.document_deadline;
    const isDeadlinePassed = documentDeadline ? new Date() > new Date(documentDeadline) : false;
    const effectivelyLocked = isLocked || isDeadlinePassed;

    // Delete confirmation state
    const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);

    const fetchMyTeams = async () => {
        setIsFetchingTeams(true);
        const res = await getMyTeams();
        if (res.success && res.data) {
            // Filter out current team
            setMyTeams((res.data as Team[]).filter(t => t.id !== team.id));
        }
        setIsFetchingTeams(false);
    };

    const handleImportRoster = async (sourceId?: string) => {
        const idToUse = sourceId || selectedSourceTeamId;
        if (!idToUse) return;

        setIsImporting(true);
        const result = await importRoster(team.id, idToUse);
        setIsImporting(false);

        if (result.success) {
            toast({
                title: tCommon("success"),
                description: sourceId ? "Roster automatically imported from My Team" : result.message
            });
            setSelectedSourceTeamId("");
            // Refresh players list
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            // Only show error for manual import, or silent fail for auto
            if (!sourceId) {
                toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
            }
        }
    };

    // Auto-import roster if participation is empty and has linked team
    useEffect(() => {
        if (team.isParticipation && players.length === 0 && team.team_id && !isImporting) {
            handleImportRoster(team.team_id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [team.isParticipation, team.team_id]);

    const handleToggleLock = async () => {
        setIsLocking(true);
        const result = await toggleRosterLock(team.id, !isLocked);
        setIsLocking(false);

        if (result.success) {
            setIsLocked(!isLocked);
            toast({
                title: tCommon("success"),
                description: !isLocked ? "Roster locked. Only Organizer can unlock now." : "Roster unlocked."
            });
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const processFileImport = async () => {
        if (!importFile) return;

        setIsImporting(true);

        try {
            const processData = async (data: unknown[][]) => {
                let successCount = 0;
                let errorCount = 0;

                for (const row of data) {
                    // Extract data by array index: 0 = Number, 1 = Name, 2 = Position, 3 = Birth Date
                    const numberStr = String(row[0] || "");
                    const name = String(row[1] || "").trim();
                    const position = String(row[2] || "").trim();
                    const birthDateRaw = String(row[3] || "").trim();

                    if (!name || name.toLowerCase() === "ชื่อ" || name.toLowerCase() === "name") {
                        continue; // skip empty or header rows
                    }

                    // Attempt to parse date simply if provided.
                    let birthDate = "";
                    if (birthDateRaw && birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        birthDate = birthDateRaw;
                    } else if (birthDateRaw) {
                        // Very basic fallback if it's DD/MM/YYYY or similar might need more robust parsing later
                        // For now we just pass it as is, or skip if invalid format for input type="date"
                        const parts = birthDateRaw.split(/[\/\-]/);
                        if (parts.length === 3) {
                            // guess if it's start with year or day
                            if (parts[0].length === 4) {
                                birthDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                            } else {
                                birthDate = `${parts[2].padStart(4, '20')}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                        }
                    }

                    const formData = new FormData();
                    formData.append("name", name);
                    formData.append("number", numberStr.replace(/\D/g, ''));
                    formData.append("position", position);
                    formData.append("birthDate", birthDate);

                    const result = await addPlayer(team.id, formData);
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                }

                setIsImporting(false);
                setImportFile(null);
                if (importFileRef.current) {
                    importFileRef.current.value = '';
                }

                const { getPlayers } = await import("@/actions/manager/team");
                const res = await getPlayers(team.id);
                if (res.success && res.data) setPlayers(res.data);

                toast({
                    title: tCommon("success"),
                    description: `Imported ${successCount} players. ${errorCount > 0 ? `Failed to import ${errorCount} players.` : ''}`
                });
            };

            if (importFile.name.endsWith(".csv")) {
                Papa.parse(importFile, {
                    complete: (results) => {
                        processData(results.data as unknown[][]);
                    },
                    error: (_error) => {
                        setIsImporting(false);
                        toast({ title: tCommon("error"), description: "Failed to parse CSV file", variant: "destructive" });
                    }
                });
            } else if (importFile.name.endsWith(".xlsx") || importFile.name.endsWith(".xls")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = xlsx.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
                        processData(jsonData as unknown[][]);
                    } catch (_err) {
                        setIsImporting(false);
                        toast({ title: tCommon("error"), description: "Failed to parse Excel file", variant: "destructive" });
                    }
                };
                reader.readAsArrayBuffer(importFile);
            } else {
                setIsImporting(false);
                toast({ title: tCommon("error"), description: "Unsupported file format. Please upload a CSV or Excel file.", variant: "destructive" });
            }
        } catch (_error) {
            setIsImporting(false);
            toast({ title: tCommon("error"), description: "An unexpected error occurred during import.", variant: "destructive" });
        }
    };

    const importFileRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSelectGlobalPlayer = (gp: GlobalPlayer) => {
        setNewName(gp.name);
        setNewBirthDate(gp.date_of_birth || "");
        setSelectedGlobalPlayerId(gp.id);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleUpdateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingTeam(true);

        const formData = new FormData();
        formData.append("name", teamName);
        formData.append("tournament_id", "");
        formData.append("existing_logo_url", team.logo_url || "");
        if (selectedFile) {
            formData.append("logo", selectedFile);
        }

        const result = await updateTeamGlobal(team.id, formData, "");
        setIsUpdatingTeam(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: tTeam("updated_successfully") || "Team updated successfully" });
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleDeleteTeam = async () => {

        setIsDeletingTeam(true);
        const result = await deleteTeamGlobal(team.id, "");

        if (result.success) {
            toast({ title: tCommon("success"), description: tTeam("deleted_successfully") || "Team deleted successfully" });
            setDeleteTeamDialogOpen(false);
            router.push(`/${team.isParticipation ? "manager/my-registrations" : "manager/my-teams"}`);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
            setIsDeletingTeam(false);
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
        formData.append("birthDate", newBirthDate);
        if (selectedGlobalPlayerId) {
            formData.append("global_player_id", selectedGlobalPlayerId);
        }

        const result = await addPlayer(team.id, formData);
        setIsSaving(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: t("added_success") });
            setNewName("");
            setNewNumber("");
            setNewPosition("");
            setNewBirthDate("");
            setSelectedGlobalPlayerId(null);
            // Refresh players list
            const { getPlayers } = await import("@/actions/manager/team");
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const confirmDeletePlayer = async () => {
        if (!playerToDelete) return;
        const playerId = playerToDelete;
        setPlayerToDelete(null);

        const result = await deletePlayer(playerId, team.id);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("deleted_success") });
            setPlayers(players.filter(p => p.id !== playerId));
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleUpdatePlayer = async (playerId: string) => {
        setIsSaving(true);
        const result = await updatePlayer(playerId, team.id, {
            name: !players.find(p => p.id === playerId)?.global_player_id ? (editName || undefined) : undefined,
            number: editNumber ? parseInt(editNumber) : null,
            position: editPosition || null,
            birth_date: editBirthDate || null,
        });
        setIsSaving(false);

        if (result.success) {
            toast({ title: tCommon("success"), description: t("updated_success") });
            setEditingPlayerId(null);
            const { getPlayers } = await import("@/actions/manager/team");
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const fetchGlobalPlayersData = useCallback(async (page: number, query: string) => {
        setIsSearching(true);
        const result = await getGlobalPlayers(page, pageSize, query);
        if (result.success && result.data) {
            setSearchResults(result.data.players);
            setTotalCount(result.data.totalCount);
        }
        setIsSearching(false);
    }, []);

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
        fetchGlobalPlayersData(1, query);
    }, [fetchGlobalPlayersData]);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        fetchGlobalPlayersData(newPage, searchQuery);
    };

    const handleGlobalAthleteTypesUpdate = async (globalPlayerId: string, sports: string[]) => {
        setIsSaving(true);
        const result = await updateGlobalPlayerAthleteTypes(globalPlayerId, sports);
        setIsSaving(false);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Sports profile updated" });
            // Refresh players list
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
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
            const { getPlayers } = await import("@/actions/manager/team");
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleUnlinkPlayer = async (playerId: string) => {
        const result = await unlinkPlayerFromGlobal(playerId);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Player unlinked" });
            const { getPlayers } = await import("@/actions/manager/team");
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };
    const handleGlobalPhotoUpload = async (globalPlayerId: string, file: File) => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("photo", file);
        const result = await updateGlobalPlayerPhoto(globalPlayerId, formData);
        setIsSaving(true);
        if (result.success) {
            toast({ title: tCommon("success"), description: "Global photo updated" });
            const { getPlayers } = await import("@/actions/manager/team");
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleIdCardUpload = async (globalPlayerId: string, file: File) => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("id_card", file);
        const result = await updateGlobalPlayerIdCard(globalPlayerId, formData);
        setIsSaving(false);
        if (result.success) {
            toast({ title: tCommon("success"), description: "ID card uploaded" });
            // Refresh players list to get the new id_card_url
            const { getPlayers } = await import("@/actions/manager/team");
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-none h-10 w-10 shrink-0 border border-border/50 hover:bg-secondary hover:text-black transition-all">
                        <Link href={team.isParticipation ? "/manager/my-registrations" : "/manager/my-teams"}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground/40">
                        <span>{team.isParticipation ? t("tournament_squad") : t("team_roster")}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground">{teamName}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {team.participations && team.participations.length > 0 && (
                        <Button variant="outline" size="sm" asChild className="rounded-none font-bold tracking-wider text-[10px] h-10 px-4 border-2">
                            <Link href={`/${team.participations[0].tournament_id}`}>
                                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                {tCommon("view_tournament")}
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant={effectivelyLocked ? "outline" : "default"}
                        size="sm"
                        className={`rounded-none font-bold tracking-wider text-[10px] h-10 px-6 transition-all ${!effectivelyLocked ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(0,255,157,0.2)]" : "border-2"}`}
                        onClick={handleToggleLock}
                        disabled={isLocking || isDeadlinePassed}
                    >
                        {isLocking ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        ) : effectivelyLocked ? (
                            <Unlock className="h-3.5 w-3.5 mr-2" />
                        ) : (
                            <Lock className="h-3.5 w-3.5 mr-2" />
                        )}
                        {effectivelyLocked ? t("unlock_roster") : t("submit_lock")}
                    </Button>
                </div>
            </div>

            {/* Main Title Area */}
            <div className="pb-6 border-b-4 border-secondary/20 relative">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none text-foreground flex items-baseline gap-3">
                    {teamName}
                    <span className="text-xs font-black tracking-[0.2em] text-secondary">
                        {players.length} {tCommon("players") || "Players"}
                    </span>
                </h1>

                {isLocked && (
                    <div className="absolute top-0 right-0">
                        <Badge variant="destructive" className="font-black tracking-tighter rounded-none bg-red-600 text-foreground border-none py-1 px-3">
                            <Lock className="h-3 w-3 mr-1.5" />
                            {tCommon("secured")}
                        </Badge>
                    </div>
                )}
            </div>

            {isDeadlinePassed && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-none flex items-start gap-3 text-red-800 animate-in fade-in slide-in-from-top-2 mb-6">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm tracking-tight">{t("deadline_passed")}</h4>
                        <p className="text-xs opacity-90 mt-1">
                            {t("deadline_locked_desc", { date: new Date(documentDeadline!).toLocaleString() })}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 w-full min-w-0 space-y-6">
                    <div className="bg-card border border-border/40 relative overflow-hidden">
                        <div className="absolute left-0 w-1 h-full bg-secondary" />
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                        <Plus className="h-4 w-4 text-secondary" />
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
                                        <Button variant="outline" size="sm" className="h-9 rounded-none bg-foreground/5 border-secondary/20 hover:bg-secondary/10 hover:border-secondary/40 transition-all font-black tracking-widest text-[10px] gap-2">
                                            <Search className="h-3.5 w-3.5" />
                                            {t("connect_global") || "Search Global"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0 rounded-none border-border bg-card shadow-2xl" align="end">
                                        <div className="p-0 border-b border-border/40">
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                                <Input
                                                    placeholder="Search database..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                    className="pl-11 h-12 border-none rounded-none bg-transparent font-black tracking-widest text-[11px] focus-visible:ring-0"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {isSearching ? (
                                                <div className="flex flex-col items-center justify-center py-8 gap-2">
                                                    <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                                                    <span className="text-[9px] font-black tracking-widest text-muted-foreground/40">Searching...</span>
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                <div className="py-1">
                                                    {searchResults.map((gp) => (
                                                        <button
                                                            key={gp.id}
                                                            className="w-full text-left px-4 py-3 hover:bg-secondary/10 group flex items-center justify-between transition-colors border-b border-foreground/5 last:border-0"
                                                            onClick={() => handleSelectGlobalPlayer(gp)}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-xs tracking-tight group-hover:text-secondary">{gp.name}</span>
                                                                {gp.date_of_birth && (
                                                                    <span className="text-[9px] font-mono font-bold text-muted-foreground/40 mt-0.5">
                                                                        {gp.date_of_birth}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <div className="h-10 w-10 bg-foreground/5 border border-foreground/5 flex items-center justify-center mx-auto mb-3">
                                                        <FileText className="h-5 w-5 text-muted-foreground/20" />
                                                    </div>
                                                    <p className="text-[10px] font-black tracking-widest text-muted-foreground/40">No records found</p>
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <form onSubmit={handleAddPlayer} className="flex flex-wrap items-end gap-6">

                                <div className="space-y-2 w-[80px] shrink-0">
                                    <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">{t("number")}</Label>
                                    <Input
                                        value={newNumber}
                                        onChange={e => setNewNumber(e.target.value)}
                                        placeholder="00"
                                        type="number"
                                        className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-xl font-mono text-center transition-all p-0"
                                    />
                                </div>

                                <div className="space-y-2 flex-1 min-w-[200px] relative transition-all">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">{t("player_name")} *</Label>
                                        {selectedGlobalPlayerId && (
                                            <Badge variant="secondary" className="h-5 rounded-none bg-secondary/10 text-secondary border-none text-[8px] font-black tracking-widest px-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95">
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
                                        className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-lg font-black tracking-tight transition-all p-0"
                                    />
                                </div>

                                <div className="flex gap-6 flex-1 md:flex-none md:w-auto w-full items-end">
                                    <div className="space-y-2 shrink-0 w-[120px]">
                                        <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">{t("position")}</Label>
                                        <Select value={newPosition} onValueChange={setNewPosition}>
                                            <SelectTrigger className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus:ring-0 focus-visible:ring-0 h-11 text-lg font-black tracking-tight transition-all p-0 shadow-none hover:bg-transparent dark:hover:bg-transparent [&_svg]:hidden">
                                                <SelectValue placeholder={t("position")} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none border-border">
                                                <SelectItem value="GK">{t("goalkeeper")}</SelectItem>
                                                <SelectItem value="DF">{t("defender")}</SelectItem>
                                                <SelectItem value="MF">{t("midfielder")}</SelectItem>
                                                <SelectItem value="FW">{t("forward")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 flex-1 md:w-[150px] shrink-0">
                                        <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">{t("birth_date")}</Label>
                                        <Input
                                            value={newBirthDate}
                                            onChange={e => setNewBirthDate(e.target.value)}
                                            type="date"
                                            lang={locale === 'th' ? 'th-TH' : 'en-US'}
                                            className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-sm font-bold transition-all p-0"
                                        />
                                    </div>
                                </div>

                                <div className="shrink-0 w-full md:w-[160px] relative mt-4 md:mt-0">
                                    <Button
                                        type="submit"
                                        className="w-full rounded-none h-12 font-black tracking-widest text-xs transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                                        disabled={isSaving || !newName.trim() || effectivelyLocked}
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                        {t("add_player")}
                                    </Button>

                                    {effectivelyLocked && (
                                        <div className="absolute -bottom-6 left-0 w-full text-center">
                                            <p className="text-[9px] text-red-500 font-black tracking-widest flex items-center justify-center gap-1.5">
                                                <Lock className="h-3 w-3" /> {isDeadlinePassed ? t("deadline_expired") : t("squad_secured")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-secondary" />
                                <h3 className="text-3xl font-black tracking-tighter text-foreground">
                                    {t("title")}
                                </h3>
                            </div>

                            <div className="flex items-center gap-3">
                                <Dialog onOpenChange={(open) => open && fetchMyTeams()}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="rounded-none border border-border/50 font-bold tracking-wider text-[10px] h-10 px-4 hover:bg-secondary hover:text-black transition-all">
                                            <Copy className="h-3.5 w-3.5 mr-2" />
                                            {t("import_roster")}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-none sm:max-w-md border-border bg-card">
                                        <DialogHeader>
                                            <DialogTitle className="font-black tracking-tight">{t("import_roster") || "Import Roster"}</DialogTitle>
                                            <DialogDescription className="text-xs tracking-wider font-medium text-muted-foreground/60">
                                                {t("import_roster_desc") + teamName}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <Tabs value={importTab} onValueChange={(v) => setImportTab(v as "teams" | "file")} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2 rounded-none mb-6 h-12 bg-muted/20 border-b border-border/40">
                                                <TabsTrigger value="teams" className="rounded-none text-xs font-black data-[state=active]:bg-secondary data-[state=active]:text-black">{t("from_my_teams") || "From My Teams"}</TabsTrigger>
                                                <TabsTrigger value="file" className="rounded-none text-xs font-black data-[state=active]:bg-secondary data-[state=active]:text-black">{t("from_file") || "From File"}</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="teams" className="space-y-4 py-2">
                                                {isFetchingTeams ? (
                                                    <div className="flex justify-center py-10">
                                                        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                                                    </div>
                                                ) : myTeams.length === 0 ? (
                                                    <div className="text-center py-10 text-xs font-bold tracking-widest text-muted-foreground/40 border border-dashed border-border/40">
                                                        {t("no_other_teams_found") || "No other teams found to import from."}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60 text-left">{t("select_source_team") || "Select Source Team"}</Label>
                                                        <Select value={selectedSourceTeamId} onValueChange={setSelectedSourceTeamId}>
                                                            <SelectTrigger className="rounded-none h-11 text-sm font-bold border-t-0 border-x-0 border-border/40 focus:ring-0">
                                                                <SelectValue placeholder={t("select_source_team") || "Select Source Team"} />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-none border-border">
                                                                {myTeams.map((t) => (
                                                                    <SelectItem key={t.id} value={t.id} className="text-xs font-bold focus:bg-secondary focus:text-black">
                                                                        {t.name} {(t as Team & { tournament?: { name: string } }).tournament ? `(${(t as Team & { tournament?: { name: string } }).tournament?.name})` : "(No Tournament)"}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-[9px] font-medium text-muted-foreground/60 tracking-wider mt-4">
                                                            {t("import_roster_note") || "* THIS WILL COPY ALL PLAYERS AND GLOBAL LINKS."}
                                                        </p>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="file" className="space-y-6 py-2">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">{t("upload_roster_file") || "Upload Roster File (.csv, .xlsx, .xls)"}</Label>
                                                    <Input
                                                        ref={importFileRef}
                                                        type="file"
                                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                                        className="rounded-none border-border/40 bg-muted/20 file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-r file:border-border/40 file:text-[10px] file:font-black file file:bg-secondary file:text-black hover:file:opacity-90 cursor-pointer text-xs h-12"
                                                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                                    />
                                                </div>
                                                <div className="bg-muted/10 p-5 border-l-4 border-secondary">
                                                    <p className="text-[10px] font-black tracking-[0.2em] mb-3 text-secondary">{t("column_order_requirement") || "Column Order Requirement:"}</p>
                                                    <ol className="text-[10px] font-bold text-muted-foreground/80 list-decimal list-inside space-y-2 tracking-wider">
                                                        <li>{t("shirt_number") || "Shirt Number"}</li>
                                                        <li>{t("full_name") || "Full Name"}</li>
                                                        <li>{t("position") || "Position (GK, DF, MF, FW)"}</li>
                                                        <li>{t("date_of_birth") || "Date of Birth (YYYY-MM-DD)"}</li>
                                                    </ol>
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        <DialogFooter className="mt-6 flex flex-col md:flex-row gap-3">
                                            <Button
                                                variant="outline"
                                                className="rounded-none h-12 text-[10px] font-black tracking-widest flex-1 border-2"
                                                onClick={() => {
                                                    setSelectedSourceTeamId("");
                                                    setImportFile(null);
                                                    if (importFileRef.current) {
                                                        importFileRef.current.value = '';
                                                    }
                                                }}
                                                disabled={effectivelyLocked || isImporting}
                                            >
                                                {t("cancel") || "Cancel"}
                                            </Button>
                                            <Button
                                                className="rounded-none h-12 text-[10px] font-black tracking-widest flex-1 bg-secondary text-black hover:bg-secondary/90 shadow-[0_0_15px_rgba(0,255,157,0.15)]"
                                                disabled={
                                                    (importTab === "teams" && !selectedSourceTeamId) ||
                                                    (importTab === "file" && !importFile) ||
                                                    isImporting ||
                                                    effectivelyLocked
                                                }
                                                onClick={() => importTab === "teams" ? handleImportRoster() : processFileImport()}
                                            >
                                                {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                                                {isImporting ? t("importing") || "Importing..." : t("process_import") || "Process Import"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {players.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-dashed border-border/40 relative">
                                <div className="absolute left-0 w-1 h-full bg-muted/20" />
                                <div className="h-16 w-16 rounded-none bg-muted/10 border border-border/20 flex items-center justify-center mb-6">
                                    <Users className="h-8 w-8 text-muted-foreground/20" />
                                </div>
                                <h3 className="text-xl font-black tracking-tighter text-muted-foreground/40">{t("no_players_desc")}</h3>
                                <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground/20 mt-2">{t("get_started_by_adding_your_first_player_above") || "Get started by adding your first player above"}</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {players.map((player) => (
                                    <div key={player.id} className="group bg-card border border-border/40 relative overflow-hidden transition-all hover:border-secondary/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                                        <div className="absolute left-0 top-0 w-1 h-full bg-secondary opacity-80 group-hover:opacity-100 transition-opacity" />

                                        <div className="p-4 flex flex-col md:flex-row md:items-center gap-6">
                                            {/* Player Number & Avatar */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="w-12 h-12 bg-muted/20 border border-border/40 flex items-center justify-center rounded-none relative">
                                                    {editingPlayerId === player.id ? (
                                                        <Input
                                                            value={editNumber}
                                                            onChange={e => setEditNumber(e.target.value)}
                                                            className="h-full w-full border-none bg-secondary/10 text-center font-mono text-xl font-black focus-visible:ring-0 p-0 rounded-none shadow-none"
                                                            type="number"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-2xl font-black tracking-tighter text-secondary">
                                                            {player.number?.toString().padStart(2, '0') || "??"}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="h-12 w-12 rounded-none border border-border/40 overflow-hidden bg-muted/10 relative group/photo-list">
                                                    {player.photo_url || player.global_player?.photo_url ? (
                                                        <Image src={player.photo_url || player.global_player?.photo_url || ""} alt={player.name} width={48} height={48} className="object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center opacity-20">
                                                            <Users className="h-6 w-6" />
                                                        </div>
                                                    )}

                                                    {!effectivelyLocked && (
                                                        <div className="absolute inset-0 bg-secondary/80 flex items-center justify-center opacity-0 group-hover/photo-list:opacity-100 transition-all cursor-pointer">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-full w-full rounded-none hover:bg-transparent">
                                                                        <Camera className="h-5 w-5 text-black" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                {/* Shared Global Profile Dialog Content */}
                                                                <DialogContent className="rounded-none sm:max-w-md border-border bg-card">
                                                                    <DialogHeader>
                                                                        <DialogTitle className="font-black text-2xl tracking-tighter">{t("profile_management") || "Profile Management"}</DialogTitle>
                                                                        <DialogDescription className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/60">
                                                                            {t("global_identity_for") || "Global identity for"} {player.name}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-8 py-6">
                                                                        {player.global_player_id ? (
                                                                            <div className="space-y-8">
                                                                                <div className="flex flex-col items-center gap-4">
                                                                                    <div className="relative group/photo">
                                                                                        <div className="h-32 w-32 rounded-none border-4 border-secondary/20 bg-muted flex items-center justify-center overflow-hidden ring-4 ring-secondary/5">
                                                                                            {player.global_player?.photo_url || player.photo_url ? (
                                                                                                <Image src={player.global_player?.photo_url || player.photo_url || ""} alt={player.name} width={128} height={128} className="h-full w-full object-cover" unoptimized />
                                                                                            ) : (
                                                                                                <Users className="h-12 w-12 text-muted-foreground/20" />
                                                                                            )}
                                                                                        </div>
                                                                                        <Label
                                                                                            htmlFor={`global-photo-upload-${player.id}`}
                                                                                            className="absolute inset-0 flex items-center justify-center bg-secondary/90 text-black opacity-0 group-hover/photo:opacity-100 transition-opacity cursor-pointer"
                                                                                        >
                                                                                            <Upload className="h-6 w-6" />
                                                                                        </Label>
                                                                                        <Input
                                                                                            id={`global-photo-upload-${player.id}`}
                                                                                            type="file"
                                                                                            accept="image/*"
                                                                                            className="hidden"
                                                                                            onChange={(e) => {
                                                                                                const file = e.target.files?.[0];
                                                                                                if (file && player.global_player_id) {
                                                                                                    handleGlobalPhotoUpload(player.global_player_id, file);
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="text-center">
                                                                                        <p className="text-[10px] font-black tracking-widest text-secondary mb-1">{t("global_profile_photo") || "GLOBAL PROFILE PHOTO"}</p>
                                                                                        <p className="text-[9px] text-muted-foreground/60 tracking-wider">{t("syncs_across_all_tournament_rosters") || "Syncs across all tournament rosters"}</p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="space-y-4">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">{t("player_identification") || "PLAYER IDENTIFICATION"}</Label>
                                                                                        {player.global_player?.id_card_url && (
                                                                                            <div className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="aspect-[1.6/1] w-full border-2 border-dashed border-border/40 rounded-none bg-muted/10 flex flex-col items-center justify-center relative overflow-hidden group/id">
                                                                                        {player.global_player?.id_card_url ? (
                                                                                            <>
                                                                                                <Image src={player.global_player.id_card_url} alt="ID Card" width={400} height={250} className="w-full h-full object-contain" unoptimized />
                                                                                                <div className="absolute inset-0 bg-secondary/80 opacity-0 group-hover/id:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                                                                    <Button variant="outline" size="sm" className="rounded-none border-black text-black hover:bg-black hover:text-foreground font-black text-[10px]" asChild>
                                                                                                        <a href={player.global_player.id_card_url} target="_blank" rel="noopener noreferrer">
                                                                                                            <View className="h-3.5 w-3.5 mr-2" />
                                                                                                            {t("fullscreen") || "Fullscreen"}
                                                                                                        </a>
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </>
                                                                                        ) : (
                                                                                            <div className="text-center p-8 opacity-20">
                                                                                                <FileText className="h-12 w-12 mx-auto mb-4" />
                                                                                                <p className="text-[10px] font-black tracking-widest">{t("no_documents_uploaded") || "No Documents Uploaded"}</p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="relative">
                                                                                        <Label
                                                                                            htmlFor={`id-upload-${player.id}`}
                                                                                            className="w-full cursor-pointer inline-flex items-center justify-center rounded-none text-[10px] font-black tracking-widest border-2 border-border h-12 hover:bg-muted transition-all"
                                                                                        >
                                                                                            <Upload className="mr-3 h-4 w-4" />
                                                                                            {player.global_player?.id_card_url ? "REPLACE IDENTIFICATION" : "UPLOAD PLAYER ID"}
                                                                                        </Label>
                                                                                        <Input
                                                                                            id={`id-upload-${player.id}`}
                                                                                            type="file"
                                                                                            className="hidden"
                                                                                            accept="image/*"
                                                                                            onChange={(e) => {
                                                                                                const file = e.target.files?.[0];
                                                                                                if (file && player.global_player_id) {
                                                                                                    handleIdCardUpload(player.global_player_id, file);
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center py-10 border border-dashed border-border/40">
                                                                                <Unlink className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                                                                                <p className="text-xs font-bold tracking-wider text-muted-foreground/60 mb-6 px-6">
                                                                                    {t("profile_must_be_connected_to_a_global_identity_to_manage_documents") || "Profile must be connected to a global identity to manage documents."}
                                                                                </p>
                                                                                <div className="px-6">
                                                                                    <Button
                                                                                        className="w-full rounded-none bg-secondary text-black font-black tracking-widest text-[10px] h-11"
                                                                                        onClick={async () => {
                                                                                            const res = await createGlobalPlayer(player.name, null, player.birth_date, [team.sport]);
                                                                                            if (res.success && res.data) {
                                                                                                await handleLinkPlayer(player.id, res.data);
                                                                                            } else {
                                                                                                toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {t("initialize_global_profile") || "Initialize Global Profile"}
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {player.global_player_id && (
                                                                            <div className="space-y-4 pt-4 border-t border-border/20">
                                                                                <div className="flex items-center justify-between">
                                                                                    <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">
                                                                                        {tSports("title") || "Sports Profile"}
                                                                                    </Label>
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {(['football'] as SportType[]).map((sportKey) => {
                                                                                        const isActive = player.global_player?.athlete_types?.includes(sportKey);
                                                                                        return (
                                                                                            <Badge
                                                                                                key={sportKey}
                                                                                                variant={isActive ? "default" : "outline"}
                                                                                                className={`rounded-none cursor-pointer pr-1 transition-all text-[9px] font-black tracking-widest h-7 ${isActive ? "bg-secondary text-black hover:bg-secondary/80" : "border-muted-foreground/20 text-muted-foreground/40 hover:border-secondary hover:text-secondary"}`}
                                                                                                onClick={() => {
                                                                                                    const currentTypes = player.global_player?.athlete_types || [];
                                                                                                    const newTypes = isActive 
                                                                                                        ? currentTypes.filter(t => t !== sportKey)
                                                                                                        : [...currentTypes, sportKey];
                                                                                                    handleGlobalAthleteTypesUpdate(player.global_player_id!, newTypes);
                                                                                                }}
                                                                                            >
                                                                                                {tSports(sportKey)}
                                                                                                {isActive && <X className="ml-1 h-3 w-3" />}
                                                                                            </Badge>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                <p className="text-[9px] text-muted-foreground/60 tracking-wider">
                                                                                    {t("multi_sport_athlete_desc") || "Select all sports this athlete participates in."}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
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
                                                            className="h-9 flex-1 min-w-[200px] rounded-none border-t-0 border-x-0 border-border/40 bg-secondary/10 text-xl font-black tracking-tighter text-secondary focus-visible:ring-0"
                                                            placeholder={t("player_name")}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h4 className="text-xl font-black tracking-tighter text-foreground leading-none group-hover:text-secondary transition-colors">
                                                            {player.name}
                                                        </h4>
                                                    )}

                                                    {player.global_player_id ? (
                                                        <Badge variant="secondary" className="rounded-none bg-secondary/10 text-secondary border-none text-[9px] font-black tracking-widest px-2 py-0.5">
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
                                                                    <SelectItem value="GK" className="text-[9px] font-black tracking-widest">{t("gk") || "GK"}</SelectItem>
                                                                    <SelectItem value="DF" className="text-[9px] font-black tracking-widest">{t("df") || "DF"}</SelectItem>
                                                                    <SelectItem value="MF" className="text-[9px] font-black tracking-widest">{t("mf") || "MF"}</SelectItem>
                                                                    <SelectItem value="FW" className="text-[9px] font-black tracking-widest">{t("fw") || "FW"}</SelectItem>
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
                                                                className="h-7 w-28 border-t-0 border-x-0 border-border/40 bg-muted/20 text-[9px] font-black p-1 focus-visible:ring-0 shadow-none"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] font-bold tracking-widest text-muted-foreground/40 font-mono">
                                                                {formatDate(player.birth_date)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 mt-3">
                                                    {!player.global_player_id && !effectivelyLocked && (
                                                        <Popover
                                                            open={linkingPlayerId === player.id}
                                                            onOpenChange={(isOpen) => {
                                                                setLinkingPlayerId(isOpen ? player.id : null);
                                                                if (isOpen) {
                                                                    setCurrentPage(1);
                                                                    setSearchQuery("");
                                                                    fetchGlobalPlayersData(1, "");
                                                                } else {
                                                                    setSearchQuery("");
                                                                    setSearchResults([]);
                                                                }
                                                            }}
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <Button variant="link" size="sm" className="p-0 h-auto text-[10px] font-black tracking-widest text-secondary hover:text-secondary/80 flex items-center gap-2">
                                                                    <Link2 className="h-3.5 w-3.5" />
                                                                    {t("connect_global_id")}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80 p-0 rounded-none border-border bg-card shadow-2xl" align="start">
                                                                <div className="p-0 border-b border-border/40">
                                                                    <div className="relative group/search">
                                                                        <div className="relative">
                                                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within/search:text-secondary group-focus-within/search:scale-110 transition-all duration-300 z-10" />
                                                                            <Input
                                                                                placeholder={t("start_typing")}
                                                                                value={searchQuery}
                                                                                onChange={(e) => handleSearch(e.target.value)}
                                                                                className="pl-14 h-16 text-xs bg-muted/5 border-none rounded-none group-focus-within/search:bg-muted/10 transition-all duration-500 font-black tracking-widest placeholder:text-muted-foreground/20 focus-visible:ring-0 shadow-none relative z-10 relative"
                                                                                autoFocus
                                                                            />
                                                                            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-secondary group-focus-within/search:w-full transition-all duration-700 z-20" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                    {isSearching ? (
                                                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                                            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                                                                            <span className="text-[9px] font-black tracking-widest text-muted-foreground/40">{t("scanning_database")}</span>
                                                                        </div>
                                                                    ) : searchResults.length > 0 ? (
                                                                        <div className="py-2">
                                                                            {searchResults.map((gp) => (
                                                                                <button
                                                                                    key={gp.id}
                                                                                    className="w-full text-left px-5 py-3 hover:bg-secondary/10 group/item flex items-center justify-between transition-colors border-b border-border/20 last:border-0"
                                                                                    onClick={() => handleLinkPlayer(player.id, gp)}
                                                                                >
                                                                                    <div className="flex flex-col">
                                                                                        <span className="font-black text-xs tracking-tight group-hover/item:text-secondary">{gp.name}</span>
                                                                                        {formatDate(gp.date_of_birth) && (
                                                                                            <span className="text-[9px] font-mono font-bold text-muted-foreground/60 mt-0.5">
                                                                                                {formatDate(gp.date_of_birth)}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 opacity-0 group-hover/item:opacity-100 group-hover/item:text-secondary group-hover/item:translate-x-1 transition-all" />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-8 text-center space-y-4">
                                                                            <div className="h-10 w-10 bg-muted/20 border border-border/40 flex items-center justify-center mx-auto">
                                                                                {searchQuery ? <FileText className="h-5 w-5 text-muted-foreground/20" /> : <Search className="h-5 w-5 text-muted-foreground/20" />}
                                                                            </div>
                                                                            <p className="text-[10px] font-bold tracking-widest text-muted-foreground/40">
                                                                                {searchQuery ? t("no_records_found") : t("start_typing")}
                                                                            </p>
                                                                            {searchQuery && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="rounded-none w-full h-10 text-[9px] font-black tracking-widest border-2 hover:bg-secondary hover:text-black hover:border-secondary transition-all"
                                                                                    onClick={async () => {
                                                                                        const res = await createGlobalPlayer(searchQuery, null, player.birth_date, [team.sport]);
                                                                                        if (res.success && res.data) {
                                                                                            await handleLinkPlayer(player.id, res.data);
                                                                                        } else {
                                                                                            toast({ title: tCommon("error"), description: res.error, variant: "destructive" });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {t("create_global_id_sync")}
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Pagination Bar */}
                                                                {totalCount > pageSize && !isSearching && (
                                                                    <div className="p-2 border-t border-border/20 flex items-center justify-between bg-muted/5">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            disabled={currentPage === 1}
                                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                                            className="h-8 rounded-none px-2 text-muted-foreground hover:text-secondary"
                                                                        >
                                                                            <ChevronLeft className="h-4 w-4" />
                                                                        </Button>
                                                                        <span className="text-[10px] font-black tracking-widest text-muted-foreground/60">
                                                                            {currentPage} / {Math.ceil(totalCount / pageSize)}
                                                                        </span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                                            className="h-8 rounded-none px-2 text-muted-foreground hover:text-secondary"
                                                                        >
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                <div className="p-4 border-t border-border/40 bg-muted/5">
                                                                    {!searchQuery && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="w-full h-10 rounded-none text-[9px] font-black tracking-widest justify-start px-2 hover:text-secondary transition-colors"
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
                                                                                {t("create_global_id")}
                                                                            </Button>
                                                                    )}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}

                                                    {player.global_player_id && !effectivelyLocked && (
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            className="p-0 h-auto text-[10px] font-black tracking-widest text-red-500/60 hover:text-red-500 flex items-center gap-2"
                                                            onClick={() => handleUnlinkPlayer(player.id)}
                                                        >
                                                            <Unlink className="h-3.5 w-3.5" />
                                                            {t("unlink_identity")}
                                                        </Button>
                                                    )}

                                                    {player.global_player_id && (
                                                        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                                                            <span className="text-[9px] font-black tracking-[0.2em] text-foreground">{t("cloud_sync_active")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="md:static absolute top-4 right-4 flex items-center justify-end gap-3 md:border-t-0 md:border-l border-border/20 md:pt-0 md:pl-6 shrink-0">
                                                {editingPlayerId === player.id ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="default"
                                                            size="icon"
                                                            className="h-10 w-10 rounded-none bg-secondary text-black hover:bg-secondary/90 shadow-[0_0_15px_rgba(0,255,157,0.2)]"
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
                                                                className="h-10 w-10 text-muted-foreground hover:text-secondary hover:bg-muted/10 rounded-none transition-all"
                                                                disabled={effectivelyLocked}
                                                            >
                                                                <MoreVertical className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-none border-border bg-card w-48 p-0">
                                                            <DropdownMenuItem
                                                                className="rounded-none py-3 px-4 text-[10px] font-black tracking-widest focus:bg-secondary focus:text-black cursor-pointer transition-all"
                                                                onClick={() => {
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
                                                                onClick={() => setPlayerToDelete(player.id)}
                                                            >
                                                                <Trash2 className="mr-3 h-4 w-4" />
                                                                {tCommon("delete")}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full lg:w-[380px] shrink-0 space-y-6 lg:sticky lg:top-6">
                    <div className="bg-card border border-border/40 relative overflow-hidden">
                        <div className="absolute left-0 w-1 h-full bg-secondary" />
                        <div className="p-6">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="relative group mb-6">
                                    <div className="h-32 w-32 rounded-none border-2 border-dashed border-secondary/20 bg-muted/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-secondary/50 p-2">
                                        {previewUrl ? (
                                            <Image src={previewUrl} alt="Team Logo" width={128} height={128} className="w-full h-full object-contain" />
                                        ) : (
                                            <Users className="h-10 w-10 text-muted-foreground/20" />
                                        )}
                                    </div>
                                    <Label
                                        htmlFor="edit-logo-right"
                                        className="absolute inset-0 flex items-center justify-center bg-secondary/80 text-black opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-black text-[10px] tracking-widest"
                                    >
                                        <Upload className="h-5 w-5 mr-2" /> {t("change")}
                                    </Label>
                                    <Input
                                        id="edit-logo-right"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <h2 className="text-xl font-black tracking-tighter text-foreground">
                                    {teamName || "New Team"}
                                </h2>
                                <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground/60 mt-1">
                                    {tTeam("edit_team_desc") || "Customize Identity"}
                                </p>
                            </div>

                            <form onSubmit={handleUpdateTeam} className="space-y-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black tracking-widest text-muted-foreground/60">
                                        {tTeam("team_name")}
                                    </Label>
                                    <Input
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                        placeholder={tTeam("team_name")}
                                        required
                                        className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-lg font-black tracking-tight transition-all p-0"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Button
                                        type="submit"
                                        className="w-full rounded-none h-12 font-black tracking-widest text-xs transition-all hover:scale-[1.02] bg-secondary text-secondary-foreground shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                                        disabled={isUpdatingTeam || isLocked}
                                    >
                                        {isUpdatingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        {tCommon("save")}
                                    </Button>

                                    {isLocked && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-3 flex items-center justify-center gap-2">
                                            <Lock className="h-3 w-3 text-red-500" />
                                            <span className="text-[9px] font-black tracking-widest text-red-500">{t("team_details_locked")}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-8 border-t border-border/20">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-px flex-1 bg-red-500/10" />
                                        <span className="text-[9px] font-black tracking-[0.2em] text-red-500/40">{t("danger_zone")}</span>
                                        <div className="h-px flex-1 bg-red-500/10" />
                                    </div>

                                    <Dialog open={deleteTeamDialogOpen} onOpenChange={setDeleteTeamDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full rounded-none h-10 text-[10px] font-black tracking-widest text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-foreground transition-all"
                                                disabled={isDeletingTeam || isLocked}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                {tTeam("delete_team") || "Delete Team"}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-none sm:max-w-md border-border bg-card">
                                            <DialogHeader>
                                                <DialogTitle className="font-black tracking-tight text-red-500">{tTeam("delete_team") || "Delete Team"}</DialogTitle>
                                                <DialogDescription className="text-[10px] tracking-wider font-medium text-muted-foreground/60 leading-relaxed mt-2">
                                                    {tTeam("delete_desc") || "This action cannot be undone. This will permanently delete your team and all associated data."}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-6 space-y-3 font-semibold">
                                                <Label htmlFor="confirm-team-delete" className="text-[10px] font-black tracking-widest text-muted-foreground/60">
                                                    {tTeam("type_to_confirm", { text: team.name }) || `Please type "${team.name}" to confirm.`}
                                                </Label>
                                                <Input
                                                    id="confirm-team-delete"
                                                    value={deleteConfirmText}
                                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                    autoComplete="off"
                                                    className="rounded-none border-t-0 border-x-0 border-border/40 bg-transparent focus-visible:ring-0 h-11 text-lg font-black tracking-tight transition-all p-0"
                                                />
                                            </div>
                                            <DialogFooter className="gap-3 sm:gap-0">
                                                <Button variant="outline" className="rounded-none flex-1 font-black text-[10px] h-11 border-2" onClick={() => { setDeleteTeamDialogOpen(false); setDeleteConfirmText(""); }} disabled={isDeletingTeam}>
                                                    {tCommon("cancel")}
                                                </Button>
                                                <Button variant="destructive" className="rounded-none flex-1 font-black text-[10px] h-11 bg-red-600 hover:bg-red-700" onClick={handleDeleteTeam} disabled={isDeletingTeam || deleteConfirmText !== team.name}>
                                                    {isDeletingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                    {tCommon("delete") || "Delete"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                <AlertDialogContent className="bg-card border-border/10 rounded-none shadow-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            {t("remove_player") || "Remove Player"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 mt-2">
                            {t("delete_confirm")}
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
                            className="rounded-none border border-destructive/20 bg-destructive/90 text-foreground hover:bg-destructive hover:shadow-[0_0_15_rgba(220,38,38,0.3)] transition-all h-10 text-[11px] font-black tracking-widest"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {tCommon("delete") || "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
