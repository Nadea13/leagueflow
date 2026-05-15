"use client";

import { NodeTools } from "./node-tools";

import { useCallback, useEffect, useState, useMemo } from "react";
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    ConnectionMode,
    Controls,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Loader2, Plus, RefreshCw, RotateCcw, Save, Users, X, Zap,
    List, ListOrdered, Settings, Info, MapPin, Hammer, ShieldAlert,
    Calendar, Settings2, CalendarCheck, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Link2, ExternalLink, Megaphone,
    Calendar as CalendarIcon, ClipboardEdit, Lock, Unlock
} from "lucide-react";
import { Link } from "@/i18n/routing";
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
import { AnnouncementNode } from "./announcement-node";
import { NodeSettings } from "./node-settings";
import { Announcements } from "@/components/tournaments/management/announcements";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const nodeTypes = {
    matchNode: MatchNode,
    byeNode: ByeNode,
    groupNode: GroupNode,
    standingNode: StandingNode,
    teamListNode: TeamListNode,
    announcementNode: AnnouncementNode,
};

interface CanvasProps {
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

function CanvasInternal({
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
}: CanvasProps) {
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
        addAnnouncementNode,
        hydrate,
        updateNodeData,
        selectNode,
        setActiveNodeId,
        markClean,
        getCanvasData,
        fetchTeams,
        teams,
        setTeams: setStoreTeams,
        reset,
    } = useBracketStore();

    // Initial sync
    useEffect(() => {
        if (initialTeamsData && initialTeamsData.length > 0) {
            setStoreTeams(initialTeamsData as any);
        }
    }, [initialTeamsData, setStoreTeams]);
    const [activeSidebar, setActiveSidebar] = useState<'teams' | 'settings' | 'schedule'>('teams');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'registration' | 'rules' | 'venue' | 'collaborators' | 'danger'>('general');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(tournamentName);
    const [tempName, setTempName] = useState(tournamentName);
    const { screenToFlowPosition } = useReactFlow();
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(readonly);

    // Sync isLocked with readonly prop if it changes
    useEffect(() => {
        setIsLocked(readonly);
    }, [readonly]);

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

    useEffect(() => {
        if (tournamentId) {
            fetchTeams(tournamentId);
        }
    }, [tournamentId, fetchTeams]);

    const onDragStart = (event: React.DragEvent, teamName: string) => {
        event.dataTransfer.setData("application/reactflow-team", teamName);
        event.dataTransfer.effectAllowed = "move";
    };

    const [isSaving, setIsSaving] = useState(false);

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

    const handleCopyLinkRegister = useCallback(() => {
        const url = `${window.location.origin}/${locale}/register/${tournamentId}`;
        navigator.clipboard.writeText(url);
        toast({
            title: locale === 'th' ? "คัดลอกลิงก์แล้ว" : "Link Copied",
            description: locale === 'th' ? "คัดลอกลิงก์ทัวร์นาเมนต์ไปยังคลิปบอร์ดแล้ว" : "Tournament link copied to clipboard.",
        });
    }, [tournamentId, locale, toast]);

    const handleOpenLinkRegister = useCallback(() => {
        const url = `${window.location.origin}/${locale}/register/${tournamentId}`;
        window.open(url, '_blank');
    }, [tournamentId, locale]);

    const handleCopyLink = useCallback(() => {
        const url = `${window.location.origin}/${locale}/${tournamentId}`;
        navigator.clipboard.writeText(url);
        toast({
            title: locale === 'th' ? "คัดลอกลิงก์แล้ว" : "Link Copied",
            description: locale === 'th' ? "คัดลอกลิงก์ทัวร์นาเมนต์ไปยังคลิปบอร์ดแล้ว" : "Tournament link copied to clipboard.",
        });
    }, [tournamentId, locale, toast]);

    const handleOpenLink = useCallback(() => {
        const url = `${window.location.origin}/${locale}/${tournamentId}`;
        window.open(url, '_blank');
    }, [tournamentId, locale]);

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
        <div className={cn("flex flex-col h-full w-full border bg-background")}>
            <div className="flex items-center justify-between p-2 md:p-4 border-b">
                <div className="flex items-center gap-2">
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
                                className="h-8 text-sm font-bold"
                                autoFocus
                            />
                        ) : (
                            <span
                                className={cn(
                                    "font-bold tracking-tight cursor-pointer hover:text-primary transition-colors",
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
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "h-8 px-3 text-[10px] font-black tracking-widest rounded-none border transition-all",
                                        tournament?.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                            tournament?.status === 'completed' ? "bg-primary/10 text-primary border-primary/20" :
                                                "bg-muted/50 text-muted-foreground border-muted-foreground/20"
                                    )}
                                >
                                    {tournament?.status === 'active' ? (locale === 'th' ? "กำลังดำเนินการ" : "ACTIVE") :
                                        tournament?.status === 'completed' ? (locale === 'th' ? "เสร็จสิ้น" : "COMPLETE") :
                                            (locale === 'th' ? "แบบร่าง" : "DRAFT")}
                                </Badge>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    className="h-8 text-[10px] font-black tracking-widest border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                </Button>

                                <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all rounded-none"
                                        >
                                            <Megaphone className="h-3.5 w-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] p-0 rounded-none border-border/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                        <div className="p-4 md:p-6 pb-0">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3">
                                                    <Megaphone className="h-6 w-6 text-primary" />
                                                    {locale === 'th' ? "ประกาศใหม่" : "New Announcement"}
                                                </DialogTitle>
                                            </DialogHeader>
                                        </div>
                                        <Announcements
                                            tournamentId={tournamentId}
                                            isEditable={!readonly}
                                            mode="form"
                                            onSuccess={() => setIsAnnouncementOpen(false)}
                                        />
                                    </DialogContent>
                                </Dialog>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyLinkRegister}
                                    className="h-8 w-8 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-none"
                                >
                                    <Link2 className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleOpenLinkRegister}
                                    className="h-8 w-8 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-none"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyLink}
                                    className="h-8 w-8 border-primary/20 text-chart-5 hover:bg-primary/10 hover:border-primary/30 transition-all rounded-none"
                                >
                                    <Link2 className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleOpenLink}
                                    className="h-8 w-8 border-primary/20 text-chart-5 hover:bg-primary/10 hover:border-primary/30 transition-all rounded-none"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant={activeSidebar === 'schedule' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setActiveSidebar(activeSidebar === 'schedule' ? 'teams' : 'schedule')}
                                    className={cn(
                                        "h-8 text-[10px] font-black tracking-widest transition-all px-3",
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
                                        "h-8 text-[10px] font-black tracking-widest transition-all",
                                        activeSidebar === 'settings'
                                            ? "bg-primary text-black hover:bg-primary/90"
                                            : "border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    <Settings className="h-3 w-3" />
                                </Button>

                                <Button
                                    variant={isLocked ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setIsLocked(!isLocked)}
                                    className={cn(
                                        "h-8 text-[10px] font-black tracking-widest transition-all px-3",
                                        isLocked
                                            ? "bg-amber-500 text-white hover:bg-amber-600"
                                            : "border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30"
                                    )}
                                >
                                    {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {activeSidebar === 'schedule' && tournament ? (
                    <div className="absolute inset-0 z-20 flex flex-col">
                        <div className="flex flex-1 overflow-hidden bg-background">
                            {/* Left Controls Sidebar (w-64 like settings) */}
                            <div className="w-64 border-r flex flex-col p-2 md:p-3 gap-2 shrink-0 z-10">
                                <div className="flex items-center justify-between gap-3 p-2 bg-muted/20 border border-border/5">
                                    <div className="flex items-center gap-3">
                                        <Settings2 className={cn("h-4 w-4 transition-colors", isEditMode ? "text-primary" : "text-muted-foreground")} />
                                        <span className={cn("text-[11px] font-black tracking-widest transition-colors", isEditMode ? "text-primary" : "text-muted-foreground")}>
                                            Edit Mode
                                        </span>
                                    </div>
                                    <Switch
                                        checked={isEditMode}
                                        onCheckedChange={setIsEditMode}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <div>
                                    <div className="space-y-4">
                                        {/* Date Filter */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black tracking-widest text-muted-foreground/60">Date Selection</Label>
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
                                                                    <span className="text-xs font-black tracking-widest">
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
                                                                        className="w-full text-[10px] font-black tracking-widest h-9 rounded-none hover:bg-primary hover:text-black hover:border-primary transition-all"
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
                                            <Label className="text-[9px] font-black tracking-widest text-muted-foreground/60">Stage Filter</Label>
                                            <Select value={filterStage} onValueChange={setFilterStage}>
                                                <SelectTrigger className="w-full h-10 rounded-none border-border/40 bg-muted/5 focus:ring-0 font-black text-[10px] tracking-widest">
                                                    <SelectValue placeholder={tMatch("round")} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-border/10 rounded-none shadow-2xl">
                                                    <SelectItem value="all" className="font-black text-[10px] tracking-widest">{tMatch("round")} ({tMatch("all")})</SelectItem>
                                                    <SelectItem value="group" className="font-black text-[10px] tracking-widest">{tMatch("group")}</SelectItem>
                                                    {['A', 'B', 'C', 'D'].map(l => (
                                                        <SelectItem key={l} value={`Group ${l}`} className="font-black text-[10px] tracking-widest">{tMatch("group")} {l}</SelectItem>
                                                    ))}
                                                    <SelectItem value="round_of_16" className="font-black text-[10px] tracking-widest">{tMatch("round_of_16")}</SelectItem>
                                                    <SelectItem value="quarter_final" className="font-black text-[10px] tracking-widest">{tMatch("quarter_final")}</SelectItem>
                                                    <SelectItem value="semi_final" className="font-black text-[10px] tracking-widest">{tMatch("semi_final")}</SelectItem>
                                                    <SelectItem value="final" className="font-black text-[10px] tracking-widest">{tMatch("final")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="">
                                    <ExportToImageButton
                                        targetId="fixtures-canvas"
                                        filename="fixtures"
                                        label="EXPORT TO IMAGE"
                                        className="w-full justify-start gap-3 h-11 px-3 border-none shadow-none bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-none"
                                    />
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-2 md:p-4">
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
                    <div className="absolute inset-0 z-20 flex flex-col">
                        <div className="flex flex-1 overflow-hidden">
                            {/* Settings Sidebar */}
                            <aside className="w-64 border-r bg-background flex flex-col shrink-0 p-4 gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('general')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] tracking-wider",
                                        activeSettingsTab === 'general' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Info className="h-4 w-4" />
                                    General Info
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('registration')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] tracking-wider",
                                        activeSettingsTab === 'registration' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <ClipboardEdit className="h-4 w-4" />
                                    Registration
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveSettingsTab('rules')}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] tracking-wider",
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
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] tracking-wider",
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
                                        "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] tracking-wider",
                                        activeSettingsTab === 'collaborators' ? "bg-primary text-black hover:bg-primary/90" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                    Collaborators
                                </Button>

                                <div className="">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setActiveSettingsTab('danger')}
                                        className={cn(
                                            "w-full justify-start gap-3 h-10 px-3 transition-all font-bold text-[11px] tracking-wider",
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
                        <div className="flex-1 relative">
                            {!readonly && !isLocked && (
                                <div className="absolute top-4 right-4 z-50">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="default"
                                                className=""
                                            >
                                                <Plus className="h-4 w-4" />
                                                NEW
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            side="bottom"
                                            align="end"
                                            className="w-64 p-1 bg-card border-border/50 shadow-2xl rounded-none mt-2"
                                            sideOffset={5}
                                        >
                                            <div className="p-2 border-b border-border/10 mb-1">
                                                <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Add Components</span>
                                            </div>
                                            <NodeTools
                                                onAddMatch={() => addMatchNode(getCenterPos())}
                                                onAddBye={() => addByeNode(getCenterPos())}
                                                onAddGroup={() => addGroupNode(getCenterPos())}
                                                onAddStanding={() => addStandingNode(getCenterPos())}
                                                onAddTeamList={() => addTeamListNode(teams, getCenterPos())}
                                                onAddAnnouncement={() => addAnnouncementNode(tournamentId, readonly, getCenterPos())}
                                            />
                                            <div className="p-2 border-t border-border/10 mt-1 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Elements</span>
                                                    <span className="text-[11px] font-black">{nodes.length}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Connections</span>
                                                    <span className="text-[11px] font-black">{edges.length}</span>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={readonly ? undefined : onNodesChange}
                                onEdgesChange={readonly ? undefined : onEdgesChange}
                                onConnect={readonly ? undefined : onConnectWithSave}
                                onNodeDragStart={readonly ? undefined : onNodeDragStart}
                                onNodeDragStop={readonly ? undefined : onDragStop}
                                onSelectionDragStop={readonly ? undefined : onDragStop}
                                onNodeClick={(_, node) => {
                                    if (isLocked) return;
                                    setActiveNodeId(node.id);
                                    selectNode(node.id);
                                }}
                                onPaneClick={() => {
                                    if (isLocked) return;
                                    setActiveNodeId(null);
                                    selectNode(null);
                                }}
                                onEdgeClick={() => {
                                    if (isLocked) return;
                                    setActiveNodeId(null);
                                    selectNode(null);
                                }}
                                nodeTypes={nodeTypes}
                                fitView
                                minZoom={0.1}
                                maxZoom={1.5}
                                nodesDraggable={!readonly && !isLocked}
                                nodesConnectable={!readonly && !isLocked}
                                elementsSelectable={!readonly && !isLocked}
                                panOnDrag={!readonly}
                                panOnScroll={!readonly}
                                zoomOnScroll={!readonly}
                                zoomOnPinch={!readonly}
                                zoomOnDoubleClick={!readonly}
                                deleteKeyCode={readonly || isLocked ? null : ["Backspace", "Delete"]}
                                autoPanOnConnect={!readonly && !isLocked}
                                autoPanOnNodeDrag={!readonly && !isLocked}
                                colorMode="light"
                                connectionMode={ConnectionMode.Loose}
                                connectionRadius={50}
                                connectionLineStyle={{ stroke: "#00c692", strokeWidth: 2 }}
                                connectionLineType={ConnectionLineType.Bezier}
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
                                <Background color="#333" variant={BackgroundVariant.Dots} gap={40} size={4} style={{ opacity: 1 }} />
                                <Controls 
                                    showInteractive={false}
                                    className="!bg-card !border-border !rounded-none !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button:hover]:!bg-muted" 
                                />
                            </ReactFlow>
                        </div>

                        {!readonly && !isLocked && <NodeSettings />}
                    </>
                )}
            </div>
        </div>
    );
}

export function Canvas(props: CanvasProps) {
    return (
        <ReactFlowProvider>
            <CanvasInternal {...props} />
        </ReactFlowProvider>
    );
}
