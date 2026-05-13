"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    ConnectionMode,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Loader2, Plus, RefreshCw, RotateCcw, Save, Users, X, Zap,
    List, ListOrdered, Settings, Info, MapPin, Hammer, ShieldAlert,
    Calendar, Settings2, CalendarCheck, ArrowRight, ChevronLeft, ChevronRight,
    Calendar as CalendarIcon
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addDays, subDays, addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { formatDate } from "@/lib/date";
import { saveBracketCanvas } from "@/actions/organizer/tournaments/bracket";
import { updateTournament } from "@/actions/organizer/tournaments/general";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { BracketCanvasData, Match, Tournament, TournamentTeam } from "@/types";
import { MatchManager } from "@/components/tournaments/matches/match-manager";
import { TournamentSettings } from "@/components/tournaments/settings/tournament-settings";
import { MatchGenerator } from "@/components/tournaments/matches/match-generator";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { advanceStage } from "@/actions/organizer/tournaments/general";
import { ByeNode } from "./bye-node";
import { GroupNode } from "./group-node";
import { MatchNode } from "./match-node";
import { StandingNode } from "./standing-node";
import { TeamListNode } from "./team-list-node";
import { NodeSettings } from "./node-settings";
import { Input } from "@/components/ui/input";

const nodeTypes = {
    matchNode: MatchNode,
    byeNode: ByeNode,
    groupNode: GroupNode,
    standingNode: StandingNode,
    teamListNode: TeamListNode,
};

interface BracketCanvasProps {
    tournamentId: string;
    tournamentName: string;
    initialCanvasData: BracketCanvasData | null;
    isCompact?: boolean;
    readonly?: boolean;
    onClose?: () => void;
    tournament?: Tournament;
    hasFixtures?: boolean;
    teams?: TournamentTeam[];
    matches?: Match[];
}

interface BracketCanvasTeam {
    id: string;
    name: string;
    logo_url?: string | null;
}

function BracketCanvasInternal({
    tournamentId,
    tournamentName,
    initialCanvasData,
    isCompact = false,
    readonly = false,
    onClose,
    tournament,
    hasFixtures = false,
    teams: initialTeamsData = [],
    matches: initialMatchesData = [],
}: BracketCanvasProps) {
    const t = useTranslations("Bracket");
    const tMatch = useTranslations("Match");
    const tFixtures = useTranslations("Fixtures");
    const locale = useLocale();
    const { toast } = useToast();

    // Lifted Filter States
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterStage, setFilterStage] = useState<string>("all");
    const [viewDate, setViewDate] = useState(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Calendar logic helpers
    const calendarDays = useMemo(() => {
        const days = [];
        const startOfViewMonth = startOfMonth(viewDate);
        const endOfViewMonth = endOfMonth(viewDate);
        const firstDay = getDay(startOfViewMonth);

        for (let i = 0; i < firstDay; i++) days.push(null);
        const interval = eachDayOfInterval({ start: startOfViewMonth, end: endOfViewMonth });
        interval.forEach(day => days.push(day));
        return days;
    }, [viewDate]);

    const datesWithMatches = useMemo(() => {
        return new Set(initialMatchesData.map(m => m.match_date).filter(Boolean));
    }, [initialMatchesData]);

    const { setTeams: setStoreTeams } = useBracketStore();
    const [isSaving, setIsSaving] = useState(false);
    const [teams, setTeamsState] = useState<BracketCanvasTeam[]>(initialTeamsData as any);

    const setTeams = useCallback((newTeams: BracketCanvasTeam[]) => {
        setTeamsState(newTeams);
        setStoreTeams(newTeams);
    }, [setStoreTeams]);

    // Sync initial teams to store
    useEffect(() => {
        if (initialTeamsData && initialTeamsData.length > 0) {
            setStoreTeams(initialTeamsData as any);
        }
    }, [initialTeamsData, setStoreTeams]);
    const [activeSidebar, setActiveSidebar] = useState<'teams' | 'settings' | 'schedule'>('teams');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'rules' | 'venue' | 'collaborators' | 'danger'>('general');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(tournamentName);
    const [tempName, setTempName] = useState(tournamentName);
    const { screenToFlowPosition } = useReactFlow();

    const getCenterPos = () => {
        return screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
    };

    const [isAdvancing, setIsAdvancing] = useState(false);

    const goToPrevDay = () => {
        const current = selectedDate ? new Date(selectedDate) : new Date();
        const prev = subDays(current, 1);
        setSelectedDate(format(prev, 'yyyy-MM-dd'));
    };

    const goToNextDay = () => {
        const current = selectedDate ? new Date(selectedDate) : new Date();
        const next = addDays(current, 1);
        setSelectedDate(format(next, 'yyyy-MM-dd'));
    };

    const handleAdvance = async () => {
        setIsAdvancing(true);
        try {
            const result = await advanceStage(tournamentId);
            if (!result.success) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Success", description: "Stage advanced successfully" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to advance stage", variant: "destructive" });
        } finally {
            setIsAdvancing(false);
        }
    };

    useEffect(() => {
        const fetchTeams = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("tournament_teams")
                .select("*, registrations(payment_status)")
                .eq("tournament_id", tournamentId)
                .order("name", { ascending: true });

            if (data) {
                const filteredTeams = (data as any[]).filter((t) => {
                    const registration = Array.isArray(t.registrations) ? t.registrations[0] : t.registrations;
                    if (registration) {
                        return (registration as { payment_status: string }).payment_status === 'PAID';
                    }
                    return true; // Manual teams
                });
                setTeams(filteredTeams);
            }
        };

        fetchTeams();
    }, [tournamentId]);

    const onDragStart = (event: React.DragEvent, teamName: string) => {
        event.dataTransfer.setData("application/reactflow-team", teamName);
        event.dataTransfer.effectAllowed = "move";
    };

    const {
        nodes,
        edges,
        isDirty,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addMatchNode,
        addByeNode,
        addGroupNode,
        addStandingNode,
        addTeamListNode,
        hydrate,
        reset,
        getCanvasData,
        markClean,
        selectNode,
    } = useBracketStore();

    useEffect(() => {
        hydrate(initialCanvasData);
    }, [hydrate, initialCanvasData]);

    const handleSave = useCallback(async (showToast = false) => {
        if (!isDirty || isSaving || readonly) return;

        setIsSaving(true);
        try {
            const canvasData = getCanvasData();
            const result = await saveBracketCanvas(tournamentId, canvasData);
            if (result.success) {
                if (result.data) {
                    hydrate(result.data);
                }
                markClean();
                if (showToast) {
                    toast({
                        title: "Saved",
                        description: "Bracket canvas and matches saved successfully.",
                    });
                }
                return;
            }

            toast({
                title: "Error",
                description: result.error || "Failed to save bracket canvas.",
                variant: "destructive",
            });
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [getCanvasData, hydrate, isDirty, isSaving, markClean, readonly, toast, tournamentId]);

    const [isDragging, setIsDragging] = useState(false);

    // Event-based state triggers
    const onNodeDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const onDragStop = useCallback(() => {
        setIsDragging(false);
    }, []);

    const onConnectWithSave = useCallback((params: any) => {
        onConnect(params);
    }, [onConnect]);

    // For data changes and movement, we wait 2 seconds after activity stops
    useEffect(() => {
        if (!isDirty || isSaving || readonly || isDragging) return;

        const timer = setTimeout(() => {
            handleSave();
        }, 0);

        return () => clearTimeout(timer);
    }, [isDirty, isSaving, readonly, isDragging, handleSave]);

    const handleReset = useCallback(() => {
        if (window.confirm("Are you sure you want to clear the entire canvas?")) {
            reset();
        }
    }, [reset]);

    const handleNameSave = async () => {
        if (!tempName || tempName === currentName) {
            setIsEditingName(false);
            setTempName(currentName);
            return;
        }

        const formData = new FormData();
        formData.append("name", tempName);
        formData.append("form_type", "general");

        try {
            const res = await updateTournament(tournamentId, null, formData);
            if (res.success) {
                setCurrentName(tempName);
                toast({
                    title: "Success",
                    description: "Tournament name updated successfully",
                });
            } else {
                setTempName(currentName);
                toast({
                    title: "Error",
                    description: res.error || "Failed to update tournament name",
                    variant: "destructive",
                });
            }
        } catch {
            setTempName(currentName);
        } finally {
            setIsEditingName(false);
        }
    };


    return (
        <div className={cn("flex flex-col bg-background border", isCompact ? "h-[700px]" : "h-[calc(100vh-64px)]")}>
            <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        {isEditingName && !readonly ? (
                            <Input
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleNameSave();
                                    if (e.key === "Escape") {
                                        setIsEditingName(false);
                                        setTempName(currentName);
                                    }
                                }}
                                className="h-7 text-sm font-bold w-[250px] bg-background"
                                autoFocus
                            />
                        ) : (
                            <span
                                className={cn(
                                    "font-bold tracking-tight truncate max-w-[300px] cursor-pointer hover:text-primary transition-colors",
                                    readonly && "cursor-default hover:text-foreground"
                                )}
                                onClick={() => !readonly && setIsEditingName(true)}
                            >
                                {currentName}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="flex items-center gap-3">
                        {isSaving ? (
                            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                        ) : isDirty ? (
                            <RefreshCw className="h-4 w-4 text-chart-5 transition-all duration-300" />
                        ) : (
                            <RefreshCw className="h-4 w-4 text-primary transition-all duration-300" />
                        )}
                        {!readonly && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    className="h-8 text-[10px] font-black tracking-widest uppercase border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                </Button>

                                <Button
                                    variant={activeSidebar === 'schedule' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveSidebar(activeSidebar === 'schedule' ? 'teams' : 'schedule')}
                                    className={cn(
                                        "h-8 text-[10px] font-black tracking-widest uppercase transition-all px-3",
                                        activeSidebar === 'schedule'
                                            ? "bg-primary text-black hover:bg-primary/90"
                                            : "border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    <Calendar className="h-3 w-3" />
                                </Button>

                                <Button
                                    variant={activeSidebar === 'settings' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveSidebar(activeSidebar === 'settings' ? 'teams' : 'settings')}
                                    className={cn(
                                        "h-8 text-[10px] font-black tracking-widest uppercase transition-all",
                                        activeSidebar === 'settings'
                                            ? "bg-primary text-black hover:bg-primary/90"
                                            : "border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    <Settings className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {activeSidebar === 'schedule' && tournament ? (
                    <div className="absolute inset-0 bg-background z-20 flex flex-col">
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left Controls Sidebar (w-64 like settings) */}
                            <div className="w-64 border-r flex flex-col p-2 md:p-3 gap-2 bg-card shrink-0 z-10">
                                <div className="">
                                    <div className="">
                                        <div className="flex items-center justify-between gap-3 py-3 bg-muted/20 border border-border/5">
                                            <div className="flex items-center gap-3">
                                                <Settings2 className={cn("h-4 w-4 transition-colors", isEditMode ? "text-primary" : "text-muted-foreground")} />
                                                <span className={cn("text-[11px] font-black tracking-widest uppercase transition-colors", isEditMode ? "text-primary" : "text-muted-foreground")}>
                                                    Edit Mode
                                                </span>
                                            </div>
                                            <Switch
                                                checked={isEditMode}
                                                onCheckedChange={setIsEditMode}
                                                className="data-[state=checked]:bg-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="space-y-4">
                                        {/* Date Filter */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase">Date Selection</Label>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center border border-border/40 bg-muted/5">
                                                    <button
                                                        onClick={() => setSelectedDate(null)}
                                                        className={cn(
                                                            "px-2 py-2 text-[10px] font-black tracking-tighter transition-all border-r border-border/40",
                                                            selectedDate === null
                                                                ? "bg-primary text-black"
                                                                : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {locale === 'th' ? "ทั้งหมด" : "ALL"}
                                                    </button>
                                                    <div className="flex items-center justify-between flex-1 px-1">
                                                        <button onClick={goToPrevDay} className="p-1 hover:text-primary text-muted-foreground transition-colors">
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </button>
                                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" className="gap-2 border-none hover:bg-muted transition-all">
                                                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                                                    <div className="flex flex-col items-start overflow-hidden">
                                                                        <span className="text-[10px] font-black tracking-tight truncate">
                                                                            {selectedDate ? formatDate(selectedDate, "d MMM yyyy", locale) : (locale === 'th' ? "วันนี้" : "TODAY")}
                                                                        </span>
                                                                    </div>
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80 p-0 bg-card border-border/10 shadow-2xl" align="start" side="right" sideOffset={10}>
                                                                <div className="p-3 border-b border-border/10 flex items-center justify-between bg-muted/20">
                                                                    <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 hover:text-primary transition-colors">
                                                                        <ChevronLeft className="h-4 w-4" />
                                                                    </button>
                                                                    <span className="text-xs font-black tracking-widest uppercase">
                                                                        {viewDate.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                                                    </span>
                                                                    <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 hover:text-primary transition-colors">
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                                <div className="p-4 space-y-4">
                                                                    <div className="grid grid-cols-7 gap-1">
                                                                        {(locale === 'th' ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, idx) => (
                                                                            <div key={`${d}-${idx}`} className="text-[9px] text-center font-black opacity-30">{d}</div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="grid grid-cols-7 gap-1">
                                                                        {calendarDays.map((day, i) => {
                                                                            if (!day) return <div key={`empty-${i}`} />;
                                                                            const dateStr = format(day, 'yyyy-MM-dd');
                                                                            const isSel = selectedDate === dateStr;
                                                                            const hasMatch = datesWithMatches.has(dateStr);
                                                                            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                                                                            const isOutsideRange = !!((tournament?.start_date && dateStr < tournament.start_date) || (tournament?.end_date && dateStr > tournament.end_date));

                                                                            return (
                                                                                <button
                                                                                    key={dateStr}
                                                                                    disabled={isOutsideRange}
                                                                                    onClick={() => {
                                                                                        setSelectedDate(dateStr);
                                                                                        setIsCalendarOpen(false);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "h-9 flex flex-col items-center justify-center relative transition-all rounded-none",
                                                                                        isSel ? "bg-primary text-black font-black" : "hover:bg-muted text-muted-foreground hover:text-foreground",
                                                                                        isToday && !isSel && "border border-primary text-primary",
                                                                                        isOutsideRange && "opacity-20 cursor-not-allowed grayscale"
                                                                                    )}
                                                                                >
                                                                                    <span className="text-[11px]">{format(day, 'd')}</span>
                                                                                    {hasMatch && (
                                                                                        <div className={cn(
                                                                                            "absolute bottom-1.5 h-1 w-1 rounded-full",
                                                                                            isSel ? "bg-black" : "bg-primary"
                                                                                        )} />
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                                                                            setViewDate(new Date());
                                                                            setIsCalendarOpen(false);
                                                                        }}
                                                                        className="w-full text-[10px] font-black tracking-widest uppercase h-9 rounded-none hover:bg-primary hover:text-black hover:border-primary transition-all"
                                                                    >
                                                                        {locale === 'th' ? "กลับไปที่วันนี้" : "BACK TO TODAY"}
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <button onClick={goToNextDay} className="p-1 hover:text-primary text-muted-foreground transition-colors">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stage Filter */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase">Stage Filter</Label>
                                            <Select value={filterStage} onValueChange={setFilterStage}>
                                                <SelectTrigger className="w-full h-10 rounded-none border-border/40 bg-muted/5 focus:ring-0 font-black text-[10px] tracking-widest uppercase">
                                                    <SelectValue placeholder={tMatch("round")} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-border/10 rounded-none shadow-2xl">
                                                    <SelectItem value="all" className="font-black text-[10px] tracking-widest uppercase">{tMatch("round")} ({tMatch("all")})</SelectItem>
                                                    <SelectItem value="group" className="font-black text-[10px] tracking-widest uppercase">{tMatch("group")}</SelectItem>
                                                    {['A', 'B', 'C', 'D'].map(l => (
                                                        <SelectItem key={l} value={`Group ${l}`} className="font-black text-[10px] tracking-widest uppercase">{tMatch("group")} {l}</SelectItem>
                                                    ))}
                                                    <SelectItem value="round_of_16" className="font-black text-[10px] tracking-widest uppercase">{tMatch("round_of_16")}</SelectItem>
                                                    <SelectItem value="quarter_final" className="font-black text-[10px] tracking-widest uppercase">{tMatch("quarter_final")}</SelectItem>
                                                    <SelectItem value="semi_final" className="font-black text-[10px] tracking-widest uppercase">{tMatch("semi_final")}</SelectItem>
                                                    <SelectItem value="final" className="font-black text-[10px] tracking-widest uppercase">{tMatch("final")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <ExportToImageButton
                                        targetId="fixtures-canvas"
                                        filename="fixtures"
                                        label="EXPORT TO IMAGE"
                                        className="w-full justify-start gap-3 h-11 px-3 border-none shadow-none bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-none"
                                    />
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-muted/5">
                                <div className="max-w-5xl mx-auto">
                                    <MatchManager
                                        matches={initialMatchesData}
                                        teams={teams as any}
                                        tournamentId={tournament.id}
                                        format={tournament.format}
                                        startDate={tournament.start_date}
                                        endDate={tournament.end_date}
                                        hideControls={true}
                                        externalEditMode={isEditMode}
                                        externalFilterStage={filterStage}
                                        externalSelectedDate={selectedDate}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {activeSidebar === 'settings' && tournament ? (
                    <div className="absolute inset-0 bg-background z-20 flex flex-col">
                        <div className="flex flex-1 overflow-hidden">
                            {/* Settings Sidebar */}
                            <aside className="w-64 border-r bg-card flex flex-col shrink-0 p-4 gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('general')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] uppercase tracking-wider",
                                        activeSettingsTab === 'general' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Info className="h-4 w-4" />
                                    General Info
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('rules')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] uppercase tracking-wider",
                                        activeSettingsTab === 'rules' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Hammer className="h-4 w-4" />
                                    Rules Config
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('venue')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] uppercase tracking-wider",
                                        activeSettingsTab === 'venue' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <MapPin className="h-4 w-4" />
                                    Venue Manager
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('collaborators')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] uppercase tracking-wider",
                                        activeSettingsTab === 'collaborators' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                    Collaborators
                                </Button>

                                <div className="mt-auto pt-4 border-t">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setActiveSettingsTab('danger')}
                                        className={cn(
                                            "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] uppercase tracking-wider",
                                            activeSettingsTab === 'danger' ? "bg-rose-500 text-white hover:bg-rose-600" : "hover:bg-rose-500/10 text-rose-500"
                                        )}
                                    >
                                        <ShieldAlert className="h-4 w-4" />
                                        Danger Zone
                                    </Button>
                                </div>
                            </aside>

                            {/* Settings Content Area */}
                            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-muted/5">
                                <div className="max-w-3xl">
                                    <TournamentSettings
                                        tournament={tournament}
                                        hasFixtures={hasFixtures}
                                        teams={initialTeamsData as any}
                                        activeTab={activeSettingsTab} // Note: We need to update TournamentSettings to support this
                                    />
                                </div>
                            </main>
                        </div>
                    </div>
                ) : (
                    <>
                        {!readonly && (
                            <aside className="w-64 border-r bg-card flex flex-col shrink-0">
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                                    <div className="flex flex-col h-full gap-6">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black tracking-widest text-muted-foreground uppercase">
                                                Tools
                                            </h3>
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => addMatchNode(getCenterPos())}
                                                    className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all group"
                                                >
                                                    <div className="w-8 h-8 bg-primary/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                                        <Plus className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="text-[11px] font-black tracking-tight">Add Match</span>
                                                        <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                                                            Knockout Slot
                                                        </span>
                                                    </div>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => addByeNode(getCenterPos())}
                                                    className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all group"
                                                >
                                                    <div className="w-8 h-8 bg-amber-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                                        <Zap className="h-4 w-4 text-amber-500" />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="text-[11px] font-black tracking-tight">Add Bye Team</span>
                                                        <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                                                            Skip Round
                                                        </span>
                                                    </div>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => addGroupNode(getCenterPos())}
                                                    className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/30 transition-all group"
                                                >
                                                    <div className="w-8 h-8 bg-violet-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                                                        <Users className="h-4 w-4 text-violet-500" />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="text-[11px] font-black tracking-tight">Add Group</span>
                                                        <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                                                            Stage / Pool
                                                        </span>
                                                    </div>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => addStandingNode(getCenterPos())}
                                                    className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all group"
                                                >
                                                    <div className="w-8 h-8 bg-emerald-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                                        <ListOrdered className="h-4 w-4 text-emerald-500" />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="text-[11px] font-black tracking-tight">Add Standing</span>
                                                        <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                                                            Group Ranking
                                                        </span>
                                                    </div>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => addTeamListNode(teams, getCenterPos())}
                                                    className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 transition-all group"
                                                >
                                                    <div className="w-8 h-8 bg-blue-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                                        <Users className="h-4 w-4 text-blue-500" />
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="text-[11px] font-black tracking-tight">Teams List</span>
                                                        <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                                                            Participating Teams
                                                        </span>
                                                    </div>
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-muted-foreground space-y-1.5 border-t pt-3">
                                            <div className="flex justify-between">
                                                <span>Elements</span>
                                                <span className="text-foreground font-bold">{nodes.length}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Connections</span>
                                                <span className="text-foreground font-bold">{edges.length}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col min-h-0 text-[10px] text-muted-foreground border-t pt-3">
                                            <div className="flex items-center gap-2 mb-4">
                                                <List className="h-4 w-4 text-primary" />
                                                <h3 className="text-[11px] font-black tracking-widest text-foreground uppercase">
                                                    Participating Teams
                                                </h3>
                                            </div>

                                            {teams.length === 0 ? (
                                                <div className="text-center py-4 border border-dashed rounded-sm bg-muted/20">
                                                    <span className="text-[10px] text-muted-foreground font-bold">No teams registered</span>
                                                </div>
                                            ) : (
                                                <div className="grid gap-2">
                                                    {teams.map((team) => (
                                                        <div
                                                            key={team.id}
                                                            draggable
                                                            onDragStart={(event) => onDragStart(event, team.name)}
                                                            className="flex items-center gap-3 p-3 bg-muted/40 border border-border/50 rounded-sm cursor-grab active:cursor-grabbing hover:bg-primary/5 hover:border-primary/30 transition-all group"
                                                        >
                                                            <div className="w-6 h-6 rounded-full border bg-background flex items-center justify-center shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
                                                                {team.logo_url ? (
                                                                    <img
                                                                        src={team.logo_url}
                                                                        alt={team.name}
                                                                        width={24}
                                                                        height={24}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Users className="h-3 w-3 text-muted-foreground/40" />
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] font-black truncate flex-1 tracking-tight">
                                                                {team.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-sm">
                                                <p className="text-[10px] text-primary/70 font-bold leading-relaxed">
                                                    <Zap className="h-3 w-3 inline mr-1 mb-1" />
                                                    Pro Tip: Drag a team from this list and drop it onto a &quot;TBD&quot; slot to assign it!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        )}

                        <div className="flex-1 relative">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={readonly ? undefined : onNodesChange}
                                onEdgesChange={readonly ? undefined : onEdgesChange}
                                onConnect={readonly ? undefined : onConnectWithSave}
                                onNodeDragStart={readonly ? undefined : onNodeDragStart}
                                onNodeDragStop={readonly ? undefined : onDragStop}
                                onSelectionDragStop={readonly ? undefined : onDragStop}
                                nodeTypes={nodeTypes}
                                fitView
                                minZoom={0.1}
                                maxZoom={1.5}
                                nodesDraggable={!readonly}
                                nodesConnectable={!readonly}
                                elementsSelectable={false}
                                onNodeClick={(_, node) => selectNode(node.id)}
                                onPaneClick={() => selectNode(null)}
                                panOnDrag={!readonly}
                                panOnScroll={!readonly}
                                zoomOnScroll={!readonly}
                                zoomOnPinch={!readonly}
                                zoomOnDoubleClick={!readonly}
                                deleteKeyCode={readonly ? null : ["Backspace", "Delete"]}
                                autoPanOnConnect={!readonly}
                                autoPanOnNodeDrag={!readonly}
                                colorMode="light"
                                connectionMode={ConnectionMode.Loose}
                                connectionRadius={50}
                                connectionLineStyle={{ stroke: "#00c692", strokeWidth: 2 }}
                                connectionLineType={ConnectionLineType.Step}
                                snapToGrid
                                snapGrid={[10, 10]}
                                defaultEdgeOptions={{
                                    type: "default",
                                    style: {
                                        stroke: "#00c692",
                                        strokeWidth: 2,
                                    },
                                }}
                            >
                                <Background color="#333" variant={BackgroundVariant.Dots} gap={20} size={1} style={{ opacity: 1 }} />
                                <Controls className="!bg-card !border-border !rounded-none !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button:hover]:!bg-muted" />
                                <MiniMap
                                    className="!bg-card !border-border !shadow-none"
                                    nodeColor="hsl(var(--primary))"
                                    maskColor="hsl(var(--card) / 0.5)"
                                    style={{
                                        background: "hsl(var(--card))",
                                        height: 120,
                                    }}
                                    zoomable
                                    pannable
                                />
                            </ReactFlow>
                        </div>

                        {!readonly && <NodeSettings />}
                    </>
                )}
            </div>
        </div>
    );
}

export function BracketCanvas(props: BracketCanvasProps) {
    return (
        <ReactFlowProvider>
            <BracketCanvasInternal {...props} />
        </ReactFlowProvider>
    );
}
