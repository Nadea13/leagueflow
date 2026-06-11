"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, LayoutGrid, Trash2, ListOrdered, ExternalLink, Megaphone, X, Heart, Loader2, GripVertical, Globe, ClipboardEdit, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { getSponsors, addSponsor, updateSponsorsOrder, deleteSponsor, Sponsor } from "@/actions/tournaments/sponsor";
import { updateTournament } from "@/actions/tournaments/general";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type MatchItem = {
    id: string;
    placeholderA: string;
    placeholderB: string;
    match_date?: string;
    match_time?: string;
    dbId?: string;
    matchId?: string;
};
import { Match, Tournament } from "@/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Teams } from "@/features/tournaments/teams/team-list";
import { Registrations } from "@/features/tournaments/management/registrations";
import { TeamForm } from "@/features/tournaments/teams/team-form";
import { Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

export function NodeSettings() {
    const { nodes, edges, updateNodeData, deleteNode, teams, fetchTeams, activeNodeId, activeCategoryId } = useBracketStore();
    const params = useParams();
    const tournamentId = params.id as string;
    const selectedNode = nodes.find((node) => node.id === activeNodeId);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const t = useTranslations("Team");
    const { toast } = useToast();
    const supabase = React.useMemo(() => createClient(), []);

    // Sponsors state
    const [sponsorsList, setSponsorsList] = React.useState<Sponsor[]>([]);
    const [isSponsorLoading, setIsSponsorLoading] = React.useState(true);
    const [isAddSponsorOpen, setIsAddSponsorOpen] = React.useState(false);
    const [newSponsorName, setNewSponsorName] = React.useState("");
    const [newSponsorLink, setNewSponsorLink] = React.useState("");
    const [newSponsorLogoFile, setNewSponsorLogoFile] = React.useState<File | null>(null);
    const [isSubmittingSponsor, setIsSubmittingSponsor] = React.useState(false);
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

    // Registration settings state
    const [regOpen, setRegOpen] = React.useState(false);
    const [regFee, setRegFee] = React.useState<number | "">("");
    const [bankNumber, setBankNumber] = React.useState("");
    const [bankName, setBankName] = React.useState("PromptPay");
    const [accountName, setAccountName] = React.useState("");
    const [isRegSaving, setIsRegSaving] = React.useState(false);
    const [isRegLoading, setIsRegLoading] = React.useState(false);
    const [tournamentRecord, setTournamentRecord] = React.useState<Tournament | null>(null);

    useEffect(() => {
        if (selectedNode?.type === "registrationNode") {
            setIsRegLoading(true);
            const fetchRegDetails = async () => {
                const { data, error } = await supabase
                    .from("tournaments")
                    .select("*")
                    .eq("id", tournamentId)
                    .single();

                let catQuery = supabase
                    .from("tournament_categories")
                    .select("registration_fee")
                    .eq("tournament_id", tournamentId);

                if (activeCategoryId) {
                    catQuery = catQuery.eq("id", activeCategoryId);
                } else {
                    catQuery = catQuery.limit(1);
                }

                const { data: catData } = await catQuery.maybeSingle();

                if (data && !error) {
                    setTournamentRecord(data);
                    setRegOpen(data.is_registration_open);
                    setRegFee(catData?.registration_fee ?? "");
                    setBankNumber(data.bank_account_number ?? "");
                    setBankName(data.bank_name || "PromptPay");
                    setAccountName(data.bank_account_name ?? "");
                }
                setIsRegLoading(false);
            };
            fetchRegDetails();
        }
    }, [selectedNode?.type, tournamentId, supabase, activeCategoryId]);

    const handleRegSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentRecord) {
            toast({
                title: "Error",
                description: "Tournament record is not loaded yet. Please try again.",
                variant: "destructive"
            });
            return;
        }
        setIsRegSaving(true);

        const formData = new FormData();
        formData.append("form_type", "registration");
        formData.append("name", tournamentRecord.name);
        formData.append("status", tournamentRecord.status || "draft");
        formData.append("max_teams", String(tournamentRecord.max_teams || 8));
        
        formData.append("is_registration_open", regOpen ? "true" : "false");
        formData.append("registration_fee", regFee === "" ? "" : String(regFee));
        formData.append("bank_account_number", bankNumber);
        formData.append("bank_name", bankName);
        formData.append("bank_account_name", accountName);
        if (activeCategoryId) {
            formData.append("tournament_category_id", activeCategoryId);
        }

        try {
            const res = await updateTournament(tournamentId, null, formData);
            if (res.success) {
                // Update local state to keep in sync
                setTournamentRecord(prev => prev ? {
                    ...prev,
                    is_registration_open: regOpen,
                    bank_account_number: bankNumber,
                    bank_name: bankName,
                    bank_account_name: accountName
                } : null);

                console.log("Dispatching registration-updated event with detail:", {
                    tournamentId,
                    is_registration_open: regOpen,
                    registration_fee: regFee === "" ? null : Number(regFee),
                    bank_account_number: bankNumber,
                    bank_name: bankName,
                    bank_account_name: accountName
                });
                window.dispatchEvent(new CustomEvent("registration-updated", {
                    detail: {
                        tournamentId,
                        is_registration_open: regOpen,
                        registration_fee: regFee === "" ? null : Number(regFee),
                        bank_account_number: bankNumber,
                        bank_name: bankName,
                        bank_account_name: accountName
                    }
                }));
                toast({
                    title: "Success",
                    description: "Registration settings updated successfully",
                });
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to update registration settings",
                    variant: "destructive"
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setIsRegSaving(false);
        }
    };

    const loadSponsors = React.useCallback(async () => {
        setIsSponsorLoading(true);
        const res = await getSponsors(tournamentId);
        if (res.success && res.data) {
            setSponsorsList(res.data);
        }
        setIsSponsorLoading(false);
    }, [tournamentId]);

    useEffect(() => {
        if (selectedNode?.type === "sponsorNode") {
            loadSponsors();
        }
    }, [selectedNode?.type, loadSponsors]);

    // DnD handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, hoverIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === hoverIndex) return;

        const list = [...sponsorsList];
        const draggedItem = list[draggedIndex];
        list.splice(draggedIndex, 1);
        list.splice(hoverIndex, 0, draggedItem);

        setDraggedIndex(hoverIndex);
        setSponsorsList(list);
    };

    const handleDragEnd = async () => {
        setDraggedIndex(null);
        const updates = sponsorsList.map((s, idx) => ({ id: s.id, order_index: idx }));
        const res = await updateSponsorsOrder(tournamentId, updates);
        if (res.success) {
            window.dispatchEvent(new Event("reload-sponsors"));
        } else {
            toast({
                title: "Error",
                description: res.error || "Failed to update sponsor order",
                variant: "destructive"
            });
            loadSponsors();
        }
    };

    const handleAddSponsorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSponsorName) return;

        setIsSubmittingSponsor(true);
        try {
            let logoUrl = "";
            if (newSponsorLogoFile) {
                const fileExt = newSponsorLogoFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `sponsors/${fileName}`;

                const { error } = await supabase.storage
                    .from('team-logos')
                    .upload(filePath, newSponsorLogoFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('team-logos')
                    .getPublicUrl(filePath);

                logoUrl = publicUrl;
            }

            const res = await addSponsor(tournamentId, newSponsorName, logoUrl, newSponsorLink);
            if (res.success) {
                toast({
                    title: "Sponsor added",
                    description: "The sponsor has been added successfully."
                });
                setIsAddSponsorOpen(false);
                setNewSponsorName("");
                setNewSponsorLink("");
                setNewSponsorLogoFile(null);
                loadSponsors();
                window.dispatchEvent(new Event("reload-sponsors"));
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to add sponsor",
                    variant: "destructive"
                });
            }
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to upload image",
                variant: "destructive"
            });
        } finally {
            setIsSubmittingSponsor(false);
        }
    };

    const handleDeleteSponsorClick = async (sponsorId: string) => {
        const res = await deleteSponsor(sponsorId, tournamentId);
        if (res.success) {
            toast({
                title: "Sponsor deleted",
                description: "The sponsor has been deleted successfully."
            });
            loadSponsors();
            window.dispatchEvent(new Event("reload-sponsors"));
        } else {
            toast({
                title: "Error",
                description: res.error || "Failed to delete sponsor",
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        if (activeCategoryId && selectedNode?.type === "teamListNode") {
            fetchTeams(activeCategoryId);
        }
    }, [activeCategoryId, fetchTeams, selectedNode?.type]);


    const [dbMatches, setDbMatches] = React.useState<Match[]>([]);

    useEffect(() => {
        async function fetchScores() {
            if (selectedNode?.type !== "matchNode") return;
            const nodeMatches = (selectedNode.data.matches as MatchItem[]) || [];
            const matchDbIds = nodeMatches.map(m => m.dbId || m.matchId).filter(Boolean) as string[];
            if (matchDbIds.length === 0) return;

            const { data: results } = await supabase
                .from('matches')
                .select('*')
                .in('id', matchDbIds)
                .is('deleted_at', null);
            
            if (results) {
                setDbMatches(results as Match[]);
            }
        }

        fetchScores();
        const interval = setInterval(fetchScores, 10000);
        return () => clearInterval(interval);
    }, [selectedNode, supabase]);

    if (!selectedNode || !activeNodeId) {
        return null;
    }

    const { id, type, data } = selectedNode;

    // Resolve live teams from edges or database assignments
    const getResolvedTeam = (targetId: string, handleId: string, dbMatch: Match | undefined, slot: 'a' | 'b') => {
        // 1. If we have a database match with a team ID assigned, use it
        if (dbMatch) {
            const teamId = slot === 'a' ? dbMatch.home_team_id : dbMatch.away_team_id;
            if (teamId) {
                const team = teams.find(t => String(t.team_id || t.id) === String(teamId));
                if (team) return team.name;
            }
        }

        // 2. Fall back to resolved placeholder/ranking/label from edge connections
        const edge = edges.find(e => e.target === targetId && e.targetHandle === handleId);
        if (!edge) return null;

        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return null;

        // Handle TeamListNode propagation
        if (sourceNode.type === 'teamListNode') {
            const teamIdMatch = edge.sourceHandle?.match(/team-(.+)/);
            if (teamIdMatch) {
                const teamId = teamIdMatch[1];
                const team = teams.find(t => String(t.id) === String(teamId) || String(t.team_id) === String(teamId));
                return team?.name || null;
            }
        }

        // Handle StandingNode/GroupNode propagation
        if (sourceNode.type === 'standingNode' || sourceNode.type === 'groupNode') {
            const rankMatch = edge.sourceHandle?.match(/rank-(\d+)/);
            if (rankMatch) {
                const rankIndex = parseInt(rankMatch[1], 10);
                const rankings = (sourceNode.data as { rankings?: string[] }).rankings || [];
                if (rankings[rankIndex]) return rankings[rankIndex];
                
                const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                return `${rankSuffix} Place (${sourceNode.data.label})`;
            }
        }

        // Handle MatchNode propagation (Winner / Loser)
        if (sourceNode.type === 'matchNode') {
            const winnerMatch = edge.sourceHandle?.match(/winner-(\d+)/);
            if (winnerMatch) {
                const winnerIndex = parseInt(winnerMatch[1], 10);
                return `Winner (Match ${winnerIndex + 1})`;
            }
            const loserMatch = edge.sourceHandle?.match(/loser-(\d+)/);
            if (loserMatch) {
                const loserIndex = parseInt(loserMatch[1], 10);
                return `Loser (Match ${loserIndex + 1})`;
            }
        }

        return null;
    };

    return (
        <aside className="w-[512px] border-l bg-background flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-right">
            <div className="p-2 md:p-4 border-b flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNode(id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                {/* ── Header based on type ── */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${type === 'groupNode' ? 'bg-node-5' :
                        type === 'matchNode' ? 'bg-node-2' :
                            type === 'standingNode' ? 'bg-node-1' :
                                type === 'teamListNode' ? 'bg-node-3' :
                                    type === 'sponsorNode' ? 'bg-red-500/10' : 
                                        type === 'registrationNode' ? 'bg-violet-500/10' : 'bg-node-4'
                        }`}>
                        {type === 'groupNode' ? <LayoutGrid className="h-4 w-4 text-foreground" /> :
                            type === 'matchNode' ? <span className="text-sm font-bold text-foreground select-none">VS</span> :
                                type === 'standingNode' ? <ListOrdered className="h-4 w-4 text-foreground" /> :
                                    type === 'teamListNode' ? <Users className="h-4 w-4 text-foreground" /> :
                                        type === 'sponsorNode' ? <Heart className="h-4 w-4 text-red-500 fill-red-500" /> :
                                            type === 'registrationNode' ? <ClipboardEdit className="h-4 w-4 text-violet-500" /> :
                                                <Megaphone className="h-4 w-4 text-foreground" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground leading-none mb-1">
                            {type?.replace('Node', '')}
                        </span>
                        <span className="text-xs font-bold truncate max-w-[140px]">
                            {data.label as string}
                        </span>
                    </div>
                </div>

                {/* ── Common Settings ── */}
                <div className="space-y-2 md:space-y-4">
                    <div className="space-y-1">
                        <Label>
                            Label
                        </Label>
                        <Input
                            value={data.label as string}
                            onChange={(e) => updateNodeData(id, { label: e.target.value })}
                        />
                    </div>

                    {/* ── Type Specific Settings ── */}
                    {type === "groupNode" && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                    Team Count
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={data.teamCount as number}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        updateNodeData(id, { teamCount: parseInt(val, 10) || 0 });
                                    }}
                                    className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-violet-500"
                                />
                            </div>
                        </>
                    )}

                    {type === "standingNode" && (
                        <div className="space-y-4 pt-2 border-t">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                    Advancing Teams
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={data.advancingCount as number || 0}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        const num = parseInt(val, 10) || 0;
                                        updateNodeData(id, { advancingCount: Math.min(16, num) });
                                    }}
                                    className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-emerald-500"
                                />
                                <p className="text-[9px] text-muted-foreground font-medium">Number of teams that move to the next stage.</p>
                            </div>

                            <h4 className="text-[10px] font-black tracking-widest text-muted-foreground">Column Visibility</h4>
                            <div className="grid gap-4">
                                {[
                                    { label: "Matches Played", key: "showPlayed" },
                                    { label: "Win / Draw / Loss", key: "showWDL", composite: ["showWin", "showDraw", "showLoss"] },
                                    { label: "GF / GA", key: "showG", composite: ["showGF", "showGA"], defaultOff: true },
                                    { label: "Goal Difference", key: "showGD" },
                                    { label: "Points", key: "showPts" },
                                    { label: "Form (Last 5)", key: "showForm", defaultOff: true },
                                    { label: "Next Match", key: "showNextMatch", defaultOff: true },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold text-foreground leading-none cursor-pointer" htmlFor={item.key}>
                                            {item.label}
                                        </Label>
                                        <Switch
                                            id={item.key}
                                            checked={item.composite
                                                ? item.composite.every(k => item.defaultOff ? !!data[k] : data[k] !== false)
                                                : item.defaultOff ? !!data[item.key] : data[item.key] !== false
                                            }
                                            onCheckedChange={(checked) => {
                                                if (item.composite) {
                                                    const updates: Record<string, boolean> = {};
                                                    item.composite.forEach(k => updates[k] = checked);
                                                    updateNodeData(id, updates);
                                                } else {
                                                    updateNodeData(id, { [item.key]: checked });
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {type === "matchNode" && (() => {
                        const groupEdge = edges.find(e => e.target === id && e.targetHandle === 'group-in');
                        const connectedGroupNode = groupEdge ? nodes.find(n => n.id === groupEdge.source) : null;
                        
                        const getSelectOptions = (currentVal: string) => {
                            const options = new Set<string>();
                            if (connectedGroupNode) {
                                const groupTeamCount = (connectedGroupNode.data as { teamCount?: number }).teamCount || 0;
                                const groupTeams = (connectedGroupNode.data as { teams?: string[] }).teams || [];
                                for (let i = 0; i < groupTeamCount; i++) {
                                    const name = groupTeams[i];
                                    options.add((!name || name === "TBD") ? `Team ${i + 1}` : name);
                                }
                            }
                            if (currentVal && currentVal !== "TBD" && !teams.some(t => t.name === currentVal)) {
                                options.add(currentVal);
                            }
                            return Array.from(options);
                        };

                        const getSelectItems = (optionsList: string[], liveTeam: string | null) => {
                            const rendered = new Set<string>();
                            rendered.add("TBD");
                            if (liveTeam) {
                                rendered.add(liveTeam);
                            }
                            const items: React.ReactNode[] = [];
                            optionsList.forEach(opt => {
                                if (!rendered.has(opt)) {
                                    rendered.add(opt);
                                    items.push(<SelectItem key={opt} value={opt}>{opt}</SelectItem>);
                                }
                            });
                            teams.forEach(t => {
                                if (!rendered.has(t.name)) {
                                    rendered.add(t.name);
                                    items.push(<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>);
                                }
                            });
                            return items;
                        };

                        return (
                            <div className="space-y-4 pt-2 border-t">
                                <h4 className="text-[10px] font-black tracking-widest text-muted-foreground">Matches in Node</h4>
                                <div className="space-y-3">
                                    {((data.matches as MatchItem[]) || [])
                                        .slice()
                                        .sort((a, b) => {
                                            const dateA = a.match_date || "9999-12-31";
                                            const timeA = a.match_time || "23:59";
                                            const dateB = b.match_date || "9999-12-31";
                                            const timeB = b.match_time || "23:59";
                                            if (dateA !== dateB) return dateA.localeCompare(dateB);
                                            return timeA.localeCompare(timeB);
                                        })
                                        .map((match, idx) => {
                                            const updateMatch = (updates: Partial<MatchItem>) => {
                                                const originalMatches = [...((data.matches as MatchItem[]) || [])];
                                                const matchIdx = originalMatches.findIndex(m => m.id === match.id);
                                                if (matchIdx !== -1) {
                                                    originalMatches[matchIdx] = { ...originalMatches[matchIdx], ...updates };
                                                    updateNodeData(id, { matches: originalMatches });
                                                }
                                            };

                                            const dbMatch = dbMatches.find(m => 
                                                m.id === match.dbId || 
                                                (m.placeholder_a === match.placeholderA && m.placeholder_b === match.placeholderB)
                                            );
                                            const liveTeamA = getResolvedTeam(id, `slot-a-${idx}`, dbMatch, 'a');
                                            const liveTeamB = getResolvedTeam(id, `slot-b-${idx}`, dbMatch, 'b');
 
                                            const homeOptions = getSelectOptions(match.placeholderA);
                                            const awayOptions = getSelectOptions(match.placeholderB);
 
                                            const homeSelectItems = getSelectItems(homeOptions, liveTeamA);
                                            const awaySelectItems = getSelectItems(awayOptions, liveTeamB);
 
                                            return (
                                                <div key={match.id || idx} className="p-2 bg-card border rounded-lg space-y-2 relative group">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-muted-foreground">Match #{idx + 1}</span>
                                                        {((data.matches as MatchItem[]).length > 1) && (
                                                            <button
                                                                onClick={() => {
                                                                    const originalMatches = [...((data.matches as MatchItem[]) || [])];
                                                                    const filtered = originalMatches.filter(m => m.id !== match.id);
                                                                    updateNodeData(id, { matches: filtered });
                                                                }}
                                                                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Home Team</Label>
                                                            <Select
                                                                value={liveTeamA || match.placeholderA}
                                                                onValueChange={(val) => updateMatch({ placeholderA: val })}
                                                            >
                                                                <SelectTrigger className={`bg-card w-full ${liveTeamA ? "text-violet-600 font-black border-violet-200" : ""}`}>
                                                                    <SelectValue placeholder="Select Team" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="TBD">TBD</SelectItem>
                                                                    {liveTeamA && (
                                                                        <SelectItem value={liveTeamA} disabled>
                                                                            {liveTeamA} (Live)
                                                                        </SelectItem>
                                                                    )}
                                                                    {homeSelectItems}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Away Team</Label>
                                                            <Select
                                                                value={liveTeamB || match.placeholderB}
                                                                onValueChange={(val) => updateMatch({ placeholderB: val })}
                                                            >
                                                                <SelectTrigger className={`bg-card w-full ${liveTeamB ? "text-violet-600 font-black border-violet-200" : ""}`}>
                                                                    <SelectValue placeholder="Select Team" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="TBD">TBD</SelectItem>
                                                                    {liveTeamB && (
                                                                        <SelectItem value={liveTeamB} disabled>
                                                                            {liveTeamB} (Live)
                                                                        </SelectItem>
                                                                    )}
                                                                    {awaySelectItems}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Date</Label>
                                                            <Input
                                                                type="date"
                                                                value={match.match_date || ""}
                                                                onChange={(e) => updateMatch({ match_date: e.target.value })}
                                                                className="bg-card"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Time</Label>
                                                            <Input
                                                                type="time"
                                                                value={match.match_time || ""}
                                                                onChange={(e) => updateMatch({ match_time: e.target.value })}
                                                                className="bg-card"
                                                            />
                                                        </div>
                                                    </div>

                                                    {(match.dbId || match.matchId || (type === "matchNode" && !!data.matchId && idx === 0)) && (
                                                        <Button
                                                            asChild
                                                            variant={dbMatch?.status === 'finished' ? "outline" : "default"}
                                                            size="sm"
                                                            className="w-full"
                                                        >
                                                            <Link href={`/dashboard/tournaments/${tournamentId}/matches/${match.dbId || match.matchId || (data.matchId as string)}`}>
                                                                {dbMatch?.status === 'finished' ? "VIEW MATCH" : "MATCH CONSOLE"}
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                            const next = [...((data.matches as MatchItem[]) || [])];
                                            next.push({ id: `m-${Date.now()}-${next.length + 1}`, placeholderA: "TBD", placeholderB: "TBD" });
                                            updateNodeData(id, { matches: next });
                                        }}
                                    >
                                        Add Match to Node
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}

                    {type === "teamListNode" && (
                        <div className="space-y-2 md:space-y-3">
                            <div className="space-y-2 md:space-y-3">
                                <div className="flex flex-col gap-1">
                                    <h4 className="text-[10px] font-black tracking-widest text-amber-500 flex items-center gap-2">
                                        <ExternalLink className="h-3 w-3" />
                                        Tournament Registrations
                                    </h4>
                                </div>
                                <div className="custom-scrollbar">
                                    <Registrations tournamentId={tournamentId} />
                                </div>
                            </div>

                            <div className="space-y-2 md:space-y-3 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black tracking-widest text-primary flex items-center gap-2">
                                        <Users className="h-3 w-3" />
                                        {t("participating_teams")}
                                    </h4>

                                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-[9px] font-black tracking-widest border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1" />
                                                {t("add_team_button") || "Add Team"}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[500px] rounded-lg p-0">
                                            <DialogHeader className="p-2 md:p-4 border-b ">
                                                <DialogTitle className="text-xl font-black tracking-tighter">{t("add_team")}</DialogTitle>
                                            </DialogHeader>
                                            <TeamForm
                                                tournamentId={tournamentId}
                                                tournamentCategoryId={activeCategoryId || undefined}
                                                isLimitReached={false}
                                                onSuccess={() => {
                                                    setIsAddDialogOpen(false);
                                                    if (activeCategoryId) {
                                                        fetchTeams(activeCategoryId);
                                                    }
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="custom-scrollbar max-h-[400px]">
                                    <Teams
                                        teams={teams}
                                        tournamentId={tournamentId}
                                        isPro={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {type === "sponsorNode" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="text-[11px] font-black tracking-widest text-red-500 flex items-center gap-2">
                                    <Heart className="h-4 w-4 fill-red-500" />
                                    Manage Sponsors
                                </h4>

                                <Dialog open={isAddSponsorOpen} onOpenChange={setIsAddSponsorOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-[9px] font-black tracking-widest border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            New Sponsor
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[450px] rounded-lg p-0">
                                        <DialogHeader className="p-4 border-b">
                                            <DialogTitle className="text-lg font-black tracking-tighter">Add New Sponsor</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleAddSponsorSubmit} className="p-4 space-y-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="sponsor-name">Sponsor Name</Label>
                                                <Input 
                                                    id="sponsor-name"
                                                    value={newSponsorName}
                                                    onChange={e => setNewSponsorName(e.target.value)}
                                                    placeholder="Sponsor / Company Name"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label>Sponsor Logo</Label>
                                                <LogoUploader
                                                    id="sponsor-logo-upload"
                                                    uploadLabel="Upload Logo"
                                                    clickToUploadLabel="Click to Upload"
                                                    onFileChange={file => setNewSponsorLogoFile(file)}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="sponsor-link">Link URL (Optional)</Label>
                                                <Input 
                                                    id="sponsor-link"
                                                    value={newSponsorLink}
                                                    onChange={e => setNewSponsorLink(e.target.value)}
                                                    placeholder="https://example.com"
                                                    type="url"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={() => setIsAddSponsorOpen(false)}
                                                    disabled={isSubmittingSponsor}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button 
                                                    type="submit" 
                                                    disabled={isSubmittingSponsor || !newSponsorName}
                                                >
                                                    {isSubmittingSponsor && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                    Add Sponsor
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <p className="text-[10px] text-muted-foreground/60 italic">
                                Drag handles to reorder sponsors. Reordering updates order_index automatically.
                            </p>

                            {isSponsorLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                                </div>
                            ) : sponsorsList.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed rounded-md">
                                    <p className="text-xs text-muted-foreground italic">No sponsors added yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {sponsorsList.map((sponsor, idx) => (
                                        <div
                                            key={sponsor.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDragEnd={handleDragEnd}
                                            className={cn(
                                                "flex items-center justify-between p-2 border bg-card/30 hover:bg-card/70 transition-all rounded-sm",
                                                draggedIndex === idx && "opacity-50 border-red-500 bg-red-500/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground p-1">
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                                <div className="h-8 w-8 rounded-sm bg-muted/40 flex items-center justify-center overflow-hidden border p-0.5">
                                                    {sponsor.logo_img ? (
                                                        <Image 
                                                            src={sponsor.logo_img} 
                                                            alt={sponsor.sponsor_name || "Sponsor logo"} 
                                                            className="max-h-full max-w-full object-contain" 
                                                            width={32}
                                                            height={32}
                                                        />
                                                    ) : (
                                                        <Heart className="h-3.5 w-3.5 text-muted-foreground/20" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold truncate leading-none mb-1 text-foreground">
                                                        {sponsor.sponsor_name}
                                                    </span>
                                                    {sponsor.link_url && (
                                                        <a href={sponsor.link_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:underline truncate flex items-center gap-1">
                                                            <Globe className="h-2.5 w-2.5" />
                                                            {sponsor.link_url}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => handleDeleteSponsorClick(sponsor.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {type === "registrationNode" && (
                        <div className="space-y-4">
                            <div className="border-b pb-2">
                                <h4 className="text-[11px] font-black tracking-widest text-violet-500 flex items-center gap-2">
                                    <ClipboardEdit className="h-4 w-4" />
                                    Configure Registration Settings
                                </h4>
                            </div>

                            {isRegLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                                </div>
                            ) : (
                                <form onSubmit={handleRegSave} className="space-y-4">
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-card/30">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="is_reg_open" className="text-xs font-bold">Allow Registration</Label>
                                            <p className="text-[9px] text-muted-foreground font-medium">
                                                Enable public team registrations
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_reg_open"
                                            checked={regOpen}
                                            onCheckedChange={setRegOpen}
                                            className="data-[state=checked]:bg-violet-500"
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="reg_fee" className="text-[10px] font-bold tracking-wider text-muted-foreground">Registration Fee (THB)</Label>
                                            <Input
                                                type="number"
                                                id="reg_fee"
                                                value={regFee}
                                                onChange={(e) => setRegFee(e.target.value === "" ? "" : Number(e.target.value))}
                                                placeholder="0.00 (Free)"
                                                min="0"
                                                step="0.01"
                                                className="bg-transparent"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="reg_promptpay" className="text-[10px] font-bold tracking-wider text-muted-foreground">PromptPay ID</Label>
                                            <Input
                                                type="text"
                                                id="reg_promptpay"
                                                value={bankNumber}
                                                onChange={(e) => setBankNumber(e.target.value)}
                                                placeholder="Mobile number or Identification Card number"
                                                className="bg-transparent"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="reg_bank" className="text-[10px] font-bold tracking-wider text-muted-foreground">Bank Name</Label>
                                                <Select value={bankName} onValueChange={setBankName}>
                                                    <SelectTrigger id="reg_bank" className="bg-transparent w-full text-xs">
                                                        <SelectValue placeholder="Select Bank" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-neutral-950 border-foreground/10 text-white">
                                                        <SelectItem value="PromptPay">PromptPay</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="reg_acc_name" className="text-[10px] font-bold tracking-wider text-muted-foreground">Account Name</Label>
                                                <Input
                                                    type="text"
                                                    id="reg_acc_name"
                                                    value={accountName}
                                                    onChange={(e) => setAccountName(e.target.value)}
                                                    placeholder="Account Name"
                                                    className="bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2 border-t mt-4">
                                        <Button
                                            type="submit"
                                            disabled={isRegSaving}
                                            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold"
                                        >
                                            {isRegSaving ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4 mr-2" />
                                            )}
                                            Save Settings
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto p-4 border-t bg-muted/10">
                <p className="text-[9px] text-muted-foreground font-bold leading-relaxed">
                    ID: {id}
                </p>
            </div>
        </aside>
    );
}
