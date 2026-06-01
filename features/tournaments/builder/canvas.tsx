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
    Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Loader2, Plus, Users, X, Save,
    Settings, MapPin, ShieldAlert,
    Calendar, Settings2, ChevronLeft, ChevronRight, ChevronDown, Link2, ExternalLink, Megaphone,
    Calendar as CalendarIcon, ClipboardEdit, Lock, Unlock, Share2, Trophy
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addDays, subDays, addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { formatDate } from "@/lib/date";
import { saveBracketCanvas } from "@/actions/tournaments/bracket";
import { updateTournament } from "@/actions/tournaments/general";
import { createTournamentCategory } from "@/actions/dashboard";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { BracketCanvasData, Match, Tournament, TournamentTeam, TournamentStatus, TournamentCategory, Team } from "@/types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MatchManager } from "@/features/tournaments/matches/match-manager";
import { TournamentSettings } from "@/features/tournaments/settings/tournament-settings";
import { ExportToImageButton } from "@/components/ui/export-to-image-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GroupNode } from "./group-node";
import { MatchNode } from "./match-node";
import { StandingNode } from "./standing-node";
import { TeamListNode } from "./team-list-node";
import { AnnouncementNode } from "./announcement-node";
import { SponsorNode } from "./sponsor-node";
import { NodeSettings } from "./node-settings";
import { Announcements } from "@/features/tournaments/management/announcements";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const nodeTypes = {
    matchNode: MatchNode,
    groupNode: GroupNode,
    standingNode: StandingNode,
    teamListNode: TeamListNode,
    announcementNode: AnnouncementNode,
    sponsorNode: SponsorNode,
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

function CanvasInternal({
    tournamentId,
    tournamentName,
    readonly = false,
    onClose,
    tournament,
    hasFixtures = false,
    teams: initialTeamsData = [],
    matches: initialMatchesData = [],
}: CanvasProps) {
    const tMatch = useTranslations("Match");
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
        addGroupNode,
        addStandingNode,
        addTeamListNode,
        addAnnouncementNode,
        addSponsorNode,
        hydrate,
        selectNode,
        setActiveNodeId,
        markClean,
        getCanvasData,
        fetchTeams,
        teams,
        setTeams: setStoreTeams,
        setActiveCategoryId: setStoreCategoryId,
    } = useBracketStore();

    // Sync server-provided teams as initial state (before category-specific fetch runs)
    useEffect(() => {
        if (initialTeamsData && initialTeamsData.length > 0) {
            setStoreTeams(initialTeamsData);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [activeSidebar, setActiveSidebar] = useState<'teams' | 'settings' | 'schedule'>('teams');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'registration' | 'location' | 'staff' | 'danger'>('general');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(tournamentName);
    const [tempName, setTempName] = useState(tournamentName);
    const { screenToFlowPosition } = useReactFlow();
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<TournamentStatus>(tournament?.status || 'draft');
    const [isLocked, setIsLocked] = useState(readonly || tournament?.status === 'finished');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // Sync isLocked with readonly prop or finished status if it changes
    useEffect(() => {
        if (currentStatus === 'finished') {
            setIsLocked(true);
        } else {
            setIsLocked(readonly);
        }
    }, [readonly, currentStatus]);

    // Warning popup when reloading/closing tab with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty && !readonly) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, readonly]);

    // Intercept client-side Next.js route navigation clicks
    useEffect(() => {
        if (readonly || isLocked || !isDirty) return;

        const handleAnchorClick = (e: MouseEvent) => {
            let target = e.target as HTMLElement | null;
            while (target && target.tagName !== 'A') {
                target = target.parentElement;
            }

            if (target instanceof HTMLAnchorElement) {
                const href = target.getAttribute('href');
                if (href) {
                    const currentPath = window.location.pathname;
                    let targetPath = '';
                    try {
                        const url = new URL(href, window.location.origin);
                        if (url.origin === window.location.origin) {
                            targetPath = url.pathname;
                        }
                    } catch {
                        // ignore
                    }

                    if (targetPath && targetPath !== currentPath) {
                        const confirmClose = window.confirm(
                            locale === 'th'
                                ? "คุณยังไม่ได้บันทึกการเปลี่ยนแปลงบนบอร์ด! ข้อมูลที่แก้ไขจะหายไป คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้โดยไม่บันทึก?"
                                : "You have unsaved changes on the canvas! Your modifications will be lost. Are you sure you want to leave without saving?"
                        );
                        if (!confirmClose) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                }
            }
        };

        document.addEventListener('click', handleAnchorClick, true);
        return () => {
            document.removeEventListener('click', handleAnchorClick, true);
        };
    }, [isDirty, readonly, isLocked, locale]);

    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const router = useRouter();

    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    // Read persisted category from URL (?category=id), fallback to null (first category)
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
        searchParams.get("category")
    );
    const [ageCategories, setAgeCategories] = useState<{ id: number; category_name: string }[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const toCategoryId = useCallback((id: unknown) => String(id), []);

    // Fetch categories and age categories.
    // Pass targetCategoryId to switch to a specific category after loading (e.g. after creating one).
    const loadCategories = useCallback(async (targetCategoryId?: string) => {
        const supabase = createClient();
        const { data: catData } = await supabase
            .from("tournament_categories")
            .select(`
                *,
                age_categories(category_name)
            `)
            .eq("tournament_id", tournamentId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true });

        if (catData && catData.length > 0) {
            setCategories(catData);

            const fallbackCategoryId = toCategoryId(catData[0].id);
            const requestedCategoryId = targetCategoryId ?? searchParams.get("category") ?? activeCategoryId;
            const matchedCategory = requestedCategoryId
                ? catData.find((c: TournamentCategory) => toCategoryId(c.id) === requestedCategoryId)
                : null;
            const resolvedCategoryId = matchedCategory ? toCategoryId(matchedCategory.id) : fallbackCategoryId;
            const resolvedCategory = matchedCategory ?? catData[0];

            hydrate(resolvedCategory?.canvas_data ?? null);
            setActiveCategoryId(resolvedCategoryId);
        }

        return catData ?? [];
    }, [tournamentId, hydrate, toCategoryId, searchParams, activeCategoryId]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        const urlCategoryId = searchParams.get("category");
        if (!urlCategoryId || categories.length === 0 || urlCategoryId === activeCategoryId) {
            return;
        }

        const matchedCategory = categories.find((category) => toCategoryId(category.id) === urlCategoryId);
        if (!matchedCategory) {
            return;
        }

        hydrate(matchedCategory.canvas_data ?? null);
        setActiveCategoryId(urlCategoryId);
        setStoreCategoryId(urlCategoryId);
        fetchTeams(urlCategoryId);
    }, [searchParams, categories, activeCategoryId, hydrate, setStoreCategoryId, fetchTeams, toCategoryId]);
    useEffect(() => {
        async function loadAgeCategories() {
            const supabase = createClient();
            const { data } = await supabase
                .from("age_categories")
                .select("id, category_name")
                .is("deleted_at", null)
                .order("id", { ascending: true });
            if (data) {
                setAgeCategories(data);
            }
        }
        loadAgeCategories();
    }, []);

    // (Hydration is now handled directly in loadCategories and handleCategorySwitch)

    const getCategoryDisplayName = useCallback((cat: TournamentCategory) => {
        const ageName = cat.age_categories?.category_name;
        const gender = cat.gender_type === 'open' ? (locale === 'th' ? 'รุ่นทั่วไป' : 'Open')
            : cat.gender_type === 'male' ? (locale === 'th' ? 'ชาย' : 'Male')
                : cat.gender_type === 'female' ? (locale === 'th' ? 'หญิง' : 'Female')
                    : (locale === 'th' ? 'ผสม' : 'Mixed');
        return `${ageName} (${gender})`;
    }, [locale]);

    useEffect(() => {
        if (tournament?.status) {
            setCurrentStatus(tournament.status);
        }
    }, [tournament?.status]);

    const handleStatusChange = async (newStatus: string) => {
        setIsStatusUpdating(true);
        const formData = new FormData();
        formData.append("status", newStatus);
        formData.append("form_type", "general");

        try {
            const res = await updateTournament(tournamentId, null, formData);
            if (res.success) {
                setCurrentStatus(newStatus as TournamentStatus);
                toast({
                    title: "Success",
                    description: "Tournament status updated successfully",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to update tournament status",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsStatusUpdating(false);
        }
    };

    const getCenterPos = () => {
        return screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
    };

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

    // Re-fetch teams whenever activeCategoryId changes
    useEffect(() => {
        if (activeCategoryId) {
            fetchTeams(activeCategoryId);
            setStoreCategoryId(activeCategoryId);
        }
    }, [activeCategoryId, fetchTeams, setStoreCategoryId]);

    const [isSaving, setIsSaving] = useState(false);

    // initialCanvasData is intentionally NOT used to hydrate here.
    // Each category's canvas_data is loaded independently via loadCategories.

    const handleSave = useCallback(async (showToast = false) => {
        if (!isDirty || isSaving || readonly) return;

        setIsSaving(true);
        try {
            const canvasData = getCanvasData();
            const result = await saveBracketCanvas(tournamentId, canvasData, activeCategoryId || undefined);
            if (result.success) {
                if (result.data) {
                    hydrate(result.data);
                    // Update local categories list
                    setCategories(prev => prev.map(c =>
                        c.id === activeCategoryId
                            ? { ...c, canvas_data: result.data ?? null }
                            : c
                    ));
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
    }, [getCanvasData, hydrate, isDirty, isSaving, markClean, readonly, toast, tournamentId, activeCategoryId]);

    const handleCategorySwitch = useCallback(async (newCategoryId: string) => {
        const normalizedCategoryId = toCategoryId(newCategoryId);
        if (normalizedCategoryId === activeCategoryId) return;
        if (isDirty) {
            await handleSave(false);
        }
        // Hydrate canvas from local cache and fetch teams for the new category
        const cached = categories.find(c => toCategoryId(c.id) === normalizedCategoryId);
        hydrate(cached?.canvas_data ?? null);
        setActiveCategoryId(normalizedCategoryId);
        setStoreCategoryId(normalizedCategoryId);
        fetchTeams(normalizedCategoryId);
        // Persist to URL without adding a history entry
        const params = new URLSearchParams(searchParams.toString());
        params.set("category", normalizedCategoryId);
        window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }, [activeCategoryId, isDirty, handleSave, categories, hydrate, fetchTeams, setStoreCategoryId, searchParams, pathname, toCategoryId]);

    const [_isDragging, setIsDragging] = useState(false);

    // Keyboard shortcuts for undo, redo, copy, paste, cut
    useEffect(() => {
        if (readonly || isLocked) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (
                activeEl &&
                (activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    activeEl.getAttribute('contenteditable') === 'true')
            ) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifierKey = isMac ? e.metaKey : e.ctrlKey;

            if (modifierKey) {
                const key = e.key.toLowerCase();

                if (key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        useBracketStore.getState().redo();
                    } else {
                        useBracketStore.getState().undo();
                    }
                } else if (key === 'y') {
                    e.preventDefault();
                    useBracketStore.getState().redo();
                } else if (key === 'c') {
                    e.preventDefault();
                    useBracketStore.getState().copyNodes();
                } else if (key === 'v') {
                    e.preventDefault();
                    useBracketStore.getState().pasteNodes();
                } else if (key === 'x') {
                    e.preventDefault();
                    useBracketStore.getState().cutNodes();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [readonly, isLocked]);

    // Event-based state triggers
    const onNodeDragStart = useCallback(() => {
        setIsDragging(true);
        useBracketStore.getState().takeSnapshot();
    }, []);

    const handleClose = useCallback(() => {
        if (isDirty && !readonly) {
            const confirmClose = window.confirm(
                locale === 'th'
                    ? "คุณยังไม่ได้บันทึกการเปลี่ยนแปลงบนบอร์ด! ข้อมูลที่แก้ไขจะหายไป คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้โดยไม่บันทึก?"
                    : "You have unsaved changes on the canvas! Your modifications will be lost. Are you sure you want to leave without saving?"
            );
            if (!confirmClose) return;
        }
        if (onClose) onClose();
    }, [isDirty, readonly, onClose, locale]);

    const onDragStop = useCallback(() => {
        setIsDragging(false);
    }, []);

    const onConnectWithSave = useCallback((params: Connection) => {
        onConnect(params);
    }, [onConnect]);




    const handleCopyLinkRegister = useCallback(() => {
        const categoryQuery = activeCategoryId ? `?category=${activeCategoryId}` : "";
        const url = `${window.location.origin}/${locale}/register/${tournamentId}${categoryQuery}`;
        navigator.clipboard.writeText(url);
        toast({
            title: locale === 'th' ? "คัดลอกลิงก์แล้ว" : "Link Copied",
            description: locale === 'th' ? "คัดลอกลิงก์ทัวร์นาเมนต์ไปยังคลิปบอร์ดแล้ว" : "Tournament link copied to clipboard.",
        });
    }, [tournamentId, locale, toast, activeCategoryId]);

    const handleOpenLinkRegister = useCallback(() => {
        const categoryQuery = activeCategoryId ? `?category=${activeCategoryId}` : "";
        const url = `${window.location.origin}/${locale}/register/${tournamentId}${categoryQuery}`;
        window.open(url, '_blank');
    }, [tournamentId, locale, activeCategoryId]);

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
    const activeCategory = categories.find(c => toCategoryId(c.id) === activeCategoryId);
    const activeCategoryName = activeCategory ? getCategoryDisplayName(activeCategory) : null;

    return (
        <div className={cn("flex flex-col h-full w-full border bg-background rounded-xl")}>
            <div className="flex items-center justify-between p-2 md:p-4 border-b">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-1 md:gap-2">
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
                                autoFocus
                            />
                        ) : (
                            <span
                                className={cn(
                                    "text-lg font-bold tracking-tight cursor-pointer hover:text-primary transition-colors",
                                    readonly && "cursor-default hover:text-foreground"
                                )}
                                onClick={() => !readonly && setIsEditingName(true)}
                            >
                                {currentName}
                            </span>
                        )}
                        <Button
                            variant={isLocked ? "default" : "outline"}
                            onClick={() => setIsLocked(!isLocked)}
                            disabled={currentStatus === 'finished' || readonly}
                            className={cn(
                                "transition-all w-10",
                                isLocked
                                    ? "bg-warning text-white"
                                    : "text-warning"
                            )}
                        >
                            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>

                        {/* Category Dropdown Selector */}
                        <DropdownMenu onOpenChange={setIsCategoryOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-1.5 font-bold text-xs tracking-tight border-slate-200 dark:border-foreground/10 bg-background hover:bg-slate-50 dark:hover:bg-foreground/5 h-10 px-3"
                                >
                                    <span>
                                        {activeCategoryName ? activeCategoryName : (locale === 'th' ? "เลือกรุ่นการแข่งขัน" : "Select Category")}
                                    </span>
                                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground ml-1 transition-transform duration-200", isCategoryOpen && "rotate-180")} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64 bg-card shadow-2xl rounded-sm">
                                <DropdownMenuLabel className="text-xs font-bold tracking-wider">
                                    {locale === 'th' ? "ประเภทการแข่งขัน" : "Tournament Categories"}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="border-border/10" />

                                {categories.length === 0 ? (
                                    <div className="px-2 py-3 text-xs text-muted-foreground font-semibold text-center">
                                        {locale === 'th' ? "ยังไม่ได้ตั้งค่าประเภทการแข่งขัน" : "No categories configured yet"}
                                    </div>
                                ) : (
                                    categories.map((cat) => {
                                        const catName = getCategoryDisplayName(cat);
                                        const isActive = toCategoryId(cat.id) === activeCategoryId;
                                        return (
                                            <DropdownMenuItem
                                                key={cat.id}
                                                onClick={() => handleCategorySwitch(toCategoryId(cat.id))}
                                                className={cn(
                                                    "cursor-pointer text-xs rounded focus:bg-primary/10 focus:text-primary flex items-center justify-between font-bold",
                                                    isActive && "text-primary bg-primary/5"
                                                )}
                                            >
                                                <span>{catName}</span>
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 scale-90">
                                                    {cat.max_teams} Teams
                                                </Badge>
                                            </DropdownMenuItem>
                                        );
                                    })
                                )}

                                {!readonly && (
                                    <>
                                        <DropdownMenuSeparator className="border-border/10" />
                                        <DropdownMenuItem
                                            onClick={() => setIsCreateOpen(true)}
                                            className="cursor-pointer text-xs rounded focus:bg-primary/10 focus:text-primary font-bold text-primary flex items-center gap-1.5"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>{locale === 'th' ? "สร้างประเภทการแข่งขัน..." : "Create Category..."}</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Select
                            value={currentStatus}
                            onValueChange={handleStatusChange}
                            disabled={isStatusUpdating}
                        >
                            <SelectTrigger
                                className={cn(
                                    "",
                                    currentStatus === 'ongoing' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" :
                                        currentStatus === 'finished' ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" :
                                            currentStatus === 'upcoming' ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" :
                                                "bg-muted/50 text-muted-foreground border-muted-foreground/20 hover:bg-muted"
                                )}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border/50 text-[10px] font-black tracking-widest">
                                <SelectItem value="draft" className="text-muted-foreground font-black text-[10px] tracking-widest cursor-pointer">
                                    {locale === 'th' ? "แบบร่าง" : "Draft"}
                                </SelectItem>
                                <SelectItem value="upcoming" className="text-amber-500 font-black text-[10px] tracking-widest cursor-pointer">
                                    {locale === 'th' ? "เร็วๆ นี้" : "Upcoming"}
                                </SelectItem>
                                <SelectItem value="ongoing" className="text-emerald-500 font-black text-[10px] tracking-widest cursor-pointer">
                                    {locale === 'th' ? "กำลังดำเนินการ" : "Ongoing"}
                                </SelectItem>
                                <SelectItem value="finished" className="text-primary font-black text-[10px] tracking-widest cursor-pointer">
                                    {locale === 'th' ? "เสร็จสิ้น" : "FINISHED"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-10 w-10">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="flex items-center gap-1 md:gap-2">
                        {!readonly && (
                            <Button
                                onClick={() => handleSave(true)}
                                disabled={!isDirty || isSaving}
                                variant={isDirty ? "default" : "outline"}
                                className={cn(
                                    "h-10 px-4 font-black text-xs tracking-wider transition-all gap-2",
                                    isDirty && "bg-chart-5 hover:bg-chart-5/90 text-white"
                                )}
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                <span>{locale === 'th' ? "บันทึก" : "SAVE"}</span>
                            </Button>
                        )}
                        {!readonly && (
                            <div className="flex items-center gap-1 md:gap-2">

                                <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-node-4 transition-all"
                                        >
                                            <Megaphone className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] p-0 border-border/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
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

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-foreground transition-all"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-card shadow-2xl rounded-sm">
                                        <DropdownMenuLabel className="text-xs font-black tracking-widest">
                                            {locale === 'th' ? "แชร์ทัวร์นาเมนต์" : "Share Tournament"}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="border-border/10" />

                                        <div className="p-1">
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60">
                                                {locale === 'th' ? "หน้าทัวร์นาเมนต์ (สาธารณะ)" : "Tournament View (Public)"}
                                            </div>
                                            <DropdownMenuItem
                                                onClick={handleCopyLink}
                                                className="cursor-pointer text-xs rounded focus:bg-primary/10 focus:text-primary"
                                            >
                                                <Link2 className="mr-2 h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "คัดลอกลิงก์" : "Copy Link"}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={handleOpenLink}
                                                className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary"
                                            >
                                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "เปิดลิงก์" : "Open Link"}</span>
                                            </DropdownMenuItem>
                                        </div>


                                        <div className="p-1">
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60">
                                                {locale === 'th' ? "หน้าลงทะเบียนทีม" : "Team Registration"}
                                            </div>
                                            <DropdownMenuItem
                                                onClick={handleCopyLinkRegister}
                                                className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary"
                                            >
                                                <Link2 className="mr-2 h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "คัดลอกลิงก์ลงทะเบียน" : "Copy Reg. Link"}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={handleOpenLinkRegister}
                                                className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary"
                                            >
                                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "เปิดลิงก์ลงทะเบียน" : "Open Reg. Link"}</span>
                                            </DropdownMenuItem>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant={activeSidebar === 'schedule' ? "default" : "outline"}
                                    onClick={() => setActiveSidebar(activeSidebar === 'schedule' ? 'teams' : 'schedule')}
                                    className={cn(
                                        "transition-all w-10",
                                        activeSidebar === 'schedule'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <Calendar className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant={activeSidebar === 'settings' ? "default" : "outline"}
                                    onClick={() => setActiveSidebar(activeSidebar === 'settings' ? 'teams' : 'settings')}
                                    className={cn(
                                        "transition-all w-10",
                                        activeSidebar === 'settings'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
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
                                                                                        "h-9 flex flex-col items-center justify-center relative transition-all",
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
                                                                        className="w-full text-[10px] font-black tracking-widest h-9 hover:bg-primary hover:text-black hover:border-primary transition-all"
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
                                                <SelectTrigger className="w-full h-10 border-border/40 bg-muted/5 focus:ring-0 font-black text-[10px] tracking-widest">
                                                    <SelectValue placeholder={tMatch("round")} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card border-border/10 shadow-2xl">
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
                                        className="w-full justify-start gap-3 h-11 px-3 border-none shadow-none bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                                    />
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-2 md:p-4">
                                    <MatchManager
                                        matches={initialMatchesData}
                                        teams={teams as unknown as Team[]}
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
                            <aside className="w-64 border-r bg-background flex flex-col shrink-0 py-4 px-2 lg:px-4 space-y-1">
                                <button
                                    onClick={() => setActiveSettingsTab('general')}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-sm transition-all relative group tracking-wide w-full text-left font-medium text-sm",
                                        activeSettingsTab === 'general'
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Settings className={cn("h-4 w-4 transition-transform group-hover:text-primary", activeSettingsTab === 'general' ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium whitespace-nowrap">General</span>
                                </button>
                                <button
                                    onClick={() => setActiveSettingsTab('registration')}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-sm transition-all relative group tracking-wide w-full text-left font-medium text-sm",
                                        activeSettingsTab === 'registration'
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <ClipboardEdit className={cn("h-4 w-4 transition-transform group-hover:text-primary", activeSettingsTab === 'registration' ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium whitespace-nowrap">Registration</span>
                                </button>

                                <button
                                    onClick={() => setActiveSettingsTab('location')}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-sm transition-all relative group tracking-wide w-full text-left font-medium text-sm",
                                        activeSettingsTab === 'location'
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <MapPin className={cn("h-4 w-4 transition-transform group-hover:text-primary", activeSettingsTab === 'location' ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium whitespace-nowrap">Location</span>
                                </button>

                                <button
                                    onClick={() => setActiveSettingsTab('staff')}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-sm transition-all relative group tracking-wide w-full text-left font-medium text-sm",
                                        activeSettingsTab === 'staff'
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Users className={cn("h-4 w-4 transition-transform group-hover:text-primary", activeSettingsTab === 'staff' ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium whitespace-nowrap">Staff</span>
                                </button>

                                <button
                                    onClick={() => setActiveSettingsTab('danger')}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-sm transition-all relative group tracking-wide w-full text-left font-medium text-sm",
                                        activeSettingsTab === 'danger'
                                            ? "bg-destructive/10 text-destructive"
                                            : "text-destructive/60 hover:text-destructive"
                                    )}
                                >
                                    <ShieldAlert className={cn("h-4 w-4 transition-transform group-hover:text-destructive", activeSettingsTab === 'danger' ? "text-destructive" : "text-destructive/60")} />
                                    <span className="text-sm font-medium whitespace-nowrap">Danger</span>
                                </button>
                            </aside>

                            {/* Settings Content Area */}
                            <main className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4 bg-muted/5">
                                <div className="max-w-3xl mx-auto">
                                    <TournamentSettings
                                        tournament={tournament}
                                        hasFixtures={hasFixtures}
                                        teams={initialTeamsData}
                                        activeTab={activeSettingsTab}
                                        activeCategoryId={activeCategoryId}
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
                                            >
                                                <Plus className="h-4 w-4" />
                                                NEW
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            side="bottom"
                                            align="end"
                                            className="w-64 p-0 bg-card shadow-2xl mt-1 rounded-sm"
                                            sideOffset={5}
                                        >
                                            <div className="p-2 border-b">
                                                <span className="text-xs font-bold tracking-wider">Add Components</span>
                                            </div>
                                            <NodeTools
                                                onAddMatch={() => addMatchNode(getCenterPos())}
                                                onAddGroup={() => addGroupNode(getCenterPos())}
                                                onAddStanding={() => addStandingNode(getCenterPos())}
                                                onAddTeamList={() => addTeamListNode(teams, getCenterPos())}
                                                onAddAnnouncement={() => addAnnouncementNode(tournamentId, readonly, getCenterPos())}
                                                onAddSponsor={() => addSponsorNode(tournamentId, readonly, getCenterPos())}
                                            />
                                            <div className="p-2 border-t border-border/10 mt-1 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-muted-foreground font-bold">Elements</span>
                                                    <span className="text-[11px] font-black">{nodes.length}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] text-muted-foreground font-bold">Connections</span>
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
                                proOptions={{ hideAttribution: true }}
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
                                fitView={false}
                                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
                                <Background color="#555" variant={BackgroundVariant.Dots} gap={16} size={1} style={{ opacity: 1 }} />
                                <Controls
                                    showInteractive={false}
                                    className="!bg-card !border-border !!shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button:hover]:!bg-muted"
                                />
                            </ReactFlow>
                        </div>

                        {!readonly && !isLocked && <NodeSettings />}
                    </>
                )}
            </div>

            {/* Create Category Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[450px] p-6 border-border/50 bg-background/95 backdrop-blur-md">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-primary animate-bounce" />
                            {locale === 'th' ? "สร้างประเภทการแข่งขันใหม่" : "Create New Category"}
                        </DialogTitle>
                    </DialogHeader>

                    <CreateCategoryMiniForm
                        tournamentId={tournamentId}
                        ageCategories={ageCategories}
                        onSuccess={async (newCatId) => {
                            setIsCreateOpen(false);
                            await loadCategories(newCatId || undefined);
                            if (newCatId) {
                                setStoreCategoryId(newCatId);
                                fetchTeams(newCatId);
                                // Persist new category to URL
                                const params = new URLSearchParams(searchParams.toString());
                                params.set("category", newCatId);
                                window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
                            }
                        }}
                    />
                </DialogContent>
            </Dialog>
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

function CreateCategoryMiniForm({
    tournamentId,
    ageCategories,
    onSuccess
}: {
    tournamentId: string;
    ageCategories: { id: number; category_name: string }[];
    onSuccess: (id: string) => void;
}) {
    const locale = useLocale();
    const { toast } = useToast();
    const [ageCategoryId, setAgeCategoryId] = useState<string>("");
    const [genderType, setGenderType] = useState<string>("open");
    const [maxTeams, setMaxTeams] = useState<string>("8");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (ageCategories && ageCategories.length > 0 && !ageCategoryId) {
            setAgeCategoryId(ageCategories[0].id.toString());
        }
    }, [ageCategories, ageCategoryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ageCategoryId) {
            toast({
                title: "Error",
                description: "Please select an age category.",
                variant: "destructive"
            });
            return;
        }

        setIsPending(true);
        try {
            const res = await createTournamentCategory(
                tournamentId,
                parseInt(ageCategoryId),
                genderType,
                parseInt(maxTeams)
            );
            if (res.success) {
                toast({
                    title: locale === 'th' ? "สร้างสำเร็จ" : "Created Successfully",
                    description: locale === 'th' ? "สร้างประเภทการแข่งขันเรียบร้อยแล้ว" : "New category has been created."
                });

                const supabase = createClient();
                const { data } = await supabase
                    .from("tournament_categories")
                    .select("id")
                    .eq("tournament_id", tournamentId)
                    .eq("age_category_id", parseInt(ageCategoryId))
                    .eq("gender_type", genderType)
                    .is("deleted_at", null)
                    .single();

                if (data) {
                    onSuccess(data.id);
                } else {
                    onSuccess("");
                }
            } else {
                toast({
                    title: "Error",
                    description: res.error || "Failed to create category",
                    variant: "destructive"
                });
            }
        } catch (err) {
            const error = err as Error;
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground">
                    {locale === 'th' ? "รุ่นอายุ" : "Age Category"}
                </Label>
                <Select value={ageCategoryId} onValueChange={setAgeCategoryId}>
                    <SelectTrigger className="w-full h-10 border-border/50">
                        <SelectValue placeholder={locale === 'th' ? "เลือกรุ่นอายุ" : "Select Age Category"} />
                    </SelectTrigger>
                    <SelectContent>
                        {ageCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.category_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground">
                    {locale === 'th' ? "ประเภทเพศ" : "Gender Group"}
                </Label>
                <Select value={genderType} onValueChange={setGenderType}>
                    <SelectTrigger className="w-full h-10 border-border/50">
                        <SelectValue placeholder={locale === 'th' ? "เลือกประเภทเพศ" : "Select Gender Group"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open">{locale === 'th' ? "รุ่นทั่วไป (ไม่จำกัดเพศ)" : "Open (All Genders)"}</SelectItem>
                        <SelectItem value="male">{locale === 'th' ? "ชาย" : "Male"}</SelectItem>
                        <SelectItem value="female">{locale === 'th' ? "หญิง" : "Female"}</SelectItem>
                        <SelectItem value="mixed">{locale === 'th' ? "คู่ผสม / ผสม" : "Mixed"}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold tracking-widest text-muted-foreground">
                    {locale === 'th' ? "จำนวนทีมสูงสุด" : "Team Limit"}
                </Label>
                <Select value={maxTeams} onValueChange={setMaxTeams}>
                    <SelectTrigger className="w-full h-10 border-border/50">
                        <SelectValue placeholder={locale === 'th' ? "เลือกจำนวนทีม" : "Select Team Limit"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="4">4 Teams</SelectItem>
                        <SelectItem value="8">8 Teams</SelectItem>
                        <SelectItem value="16">16 Teams</SelectItem>
                        <SelectItem value="32">32 Teams</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isPending} className="font-bold">
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {locale === 'th' ? "กำลังสร้าง..." : "Creating..."}
                        </>
                    ) : (
                        locale === 'th' ? "สร้างรุ่นการแข่งขัน" : "Create Category"
                    )}
                </Button>
            </div>
        </form>
    );
}
