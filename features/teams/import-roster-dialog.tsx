"use client";

import React, { useState, useRef } from "react";
import { Player, Team, ActionResponse } from "@/types/index";
import { 
    getMyTeams,
    importRoster,
    addPlayer,
    getPlayers
} from "@/actions/manager/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Loader2, 
    Users, 
    Download,
    FileText,
    Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Tab } from "@/components/ui/tab";
import Papa from "papaparse";
import * as xlsx from "xlsx";
import { useTranslations } from "next-intl";

interface ImportRosterDialogProps {
    teamId: string;
    teamName: string;
    onSuccess: (players?: Player[]) => void;
    effectivelyLocked?: boolean;
    trigger?: React.ReactNode;
    actions?: {
        getMyTeams?: () => Promise<ActionResponse>;
        importRoster?: (targetId: string, sourceId: string) => Promise<ActionResponse>;
        addPlayer?: (teamId: string, formData: FormData) => Promise<ActionResponse>;
        getPlayers?: (teamId: string) => Promise<{ success: boolean; data?: Player[]; error?: string }>;
    };
}

export function ImportRosterDialog({
    teamId,
    teamName,
    onSuccess,
    effectivelyLocked = false,
    trigger,
    actions = {}
}: ImportRosterDialogProps) {
    const {
        getMyTeams: getMyTeamsAction = getMyTeams,
        importRoster: importRosterAction = importRoster,
        addPlayer: addPlayerAction = addPlayer,
        getPlayers: getPlayersAction = getPlayers,
    } = actions;
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    // State
    const [myTeamsList, setMyTeamsList] = useState<Team[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isFetchingTeams, setIsFetchingTeams] = useState(false);
    const [selectedSourceTeamId, setSelectedSourceTeamId] = useState<string>("");
    const [importTab, setImportTab] = useState<"teams" | "file">("teams");
    const [importFile, setImportFile] = useState<File | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const fetchMyTeamsData = async () => {
        setIsFetchingTeams(true);
        const res = await getMyTeamsAction();
        if (res.success && res.data) {
            setMyTeamsList((res.data as Team[]).filter(t => t.id !== teamId));
        }
        setIsFetchingTeams(false);
    };

    const handleImportRoster = async () => {
        if (!selectedSourceTeamId) return;

        setIsImporting(true);
        const result = await importRosterAction(teamId, selectedSourceTeamId);
        setIsImporting(false);

        if (result.success) {
            toast({
                title: tCommon("success"),
                description: result.message
            });
            setSelectedSourceTeamId("");

            const res = await getPlayersAction(teamId);
            if (res.success && res.data) {
                onSuccess(res.data);
            }
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const processFileImport = async () => {
        if (!importFile) return;

        setIsImporting(true);

        try {
            const processData = async (data: any[][]) => {
                let successCount = 0;
                let errorCount = 0;

                for (const row of data) {
                    const numberStr = String(row[0] || "");
                    const name = String(row[1] || "").trim();
                    const position = String(row[2] || "").trim();
                    const birthDateRaw = String(row[3] || "").trim();

                    if (!name || name.toLowerCase() === "ชื่อ" || name.toLowerCase() === "name") {
                        continue;
                    }

                    let birthDate = "";
                    if (birthDateRaw && birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        birthDate = birthDateRaw;
                    } else if (birthDateRaw) {
                        const parts = birthDateRaw.split(/[\/\-]/);
                        if (parts.length === 3) {
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

                    const result = await addPlayerAction(teamId, formData);
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

                const res = await getPlayersAction(teamId);
                if (res.success && res.data) {
                    onSuccess(res.data);
                }

                toast({
                    title: tCommon("success"),
                    description: `Imported ${successCount} players. ${errorCount > 0 ? `Failed to import ${errorCount} players.` : ''}`
                });
            };

            if (importFile.name.endsWith(".csv")) {
                Papa.parse(importFile, {
                    complete: (results) => {
                        processData(results.data as any[][]);
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
                        processData(jsonData as any[][]);
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

    return (
        <Dialog onOpenChange={(open) => open && fetchMyTeamsData()}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="sm"
                    >
                        <Download className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">{t("import_roster")}</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-background border-border rounded-none p-0 overflow-hidden shadow-2xl">
                <div className="relative bg-primary/10 p-4 md:p-6 border-b border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tighter text-foreground leading-none">
                            {t("import_roster")}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium pt-2 text-base leading-relaxed">
                            {(t("import_roster_desc") || "Import roster for ") + teamName}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-4 space-y-2 md:p-6 md:space-y-3">
                    <Tab
                        value={importTab}
                        onChange={(v) => setImportTab(v as "teams" | "file")}
                        fullWidth
                        options={[
                            { label: t("from_my_teams"), value: "teams", icon: Users },
                            { label: t("from_file"), value: "file", icon: FileText }
                        ]}
                    />

                    {importTab === "teams" && (
                        <div className="space-y-2 md:space-y-3">
                            {isFetchingTeams ? (
                                <div className="flex justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : myTeamsList.length === 0 ? (
                                <div className="text-center py-12 text-xs font-bold tracking-widest text-muted-foreground border border-dashed">
                                    {t("no_other_teams_found")}
                                </div>
                            ) : (
                                <div className="space-y-2 md:space-y-3">
                                    <Label className="text-xs font-black tracking-widest text-primary text-left">{t("select_source_team")}</Label>
                                    <Select value={selectedSourceTeamId} onValueChange={setSelectedSourceTeamId}>
                                        <SelectTrigger className="h-12 bg-foreground/5 focus:ring-0 px-3 font-bold tracking-tighter text-left">
                                            <SelectValue placeholder={t("select_team")} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-border max-h-[300px]">
                                            {myTeamsList.map((team) => (
                                                <SelectItem key={team.id} value={team.id} className="rounded-none font-bold py-3">
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {importTab === "file" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black tracking-widest text-primary text-left">{t("upload_roster_file")}</Label>
                                <div 
                                    className={`border-2 border-dashed rounded-none p-8 text-center transition-all cursor-pointer ${importFile ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-primary/40 hover:bg-muted/5'}`}
                                    onClick={() => importFileRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={importFileRef}
                                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                    />
                                    {importFile ? (
                                        <div className="space-y-2">
                                            <FileText className="h-10 w-10 mx-auto text-primary" />
                                            <p className="text-sm font-black tracking-tighter">{importFile.name}</p>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setImportFile(null);
                                                }}
                                                className="text-[10px] font-black text-destructive hover:underline"
                                            >
                                                {tCommon("remove")}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="h-10 w-10 mx-auto text-muted-foreground/40" />
                                            <p className="text-xs font-bold tracking-widest text-muted-foreground/60">{t("click_to_upload") || "Click to upload CSV or Excel"}</p>
                                            <p className="text-[10px] text-muted-foreground/40">{t("file_format_guide") || "Columns: Number, Name, Position, BirthDate (YYYY-MM-DD)"}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 md:p-6 bg-muted/5 pt-0 border-t border-border/10">
                    <Button
                        className="w-full rounded-none h-12 font-black tracking-widest transition-all"
                        disabled={isImporting || (importTab === "teams" ? !selectedSourceTeamId : !importFile)}
                        onClick={importTab === "teams" ? handleImportRoster : processFileImport}
                    >
                        {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        {t("start_import")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
