"use client";

import { NodeTools } from "./node-tools";
import Image from "next/image";

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
    Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Loader2, Plus, Users, X, Save,
    Settings, MapPin, ShieldAlert,
    Calendar, ChevronLeft, ChevronRight, Link2, ExternalLink, Megaphone,
    Calendar as CalendarIcon, Lock, Unlock, Share2, Trophy, RotateCw, Inbox
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addDays, subDays, addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { formatDate } from "@/lib/date";
import { saveBracketCanvas } from "@/actions/tournaments/bracket";
import { updateTournament } from "@/actions/tournaments/general";
import { approveRegistration, rejectRegistration, approveRoster, rejectRoster } from "@/actions/tournaments/registration";
import { RosterDialog } from "@/features/tournaments/teams/roster-manager";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { BracketCanvasData, Match, Tournament, TournamentTeam, TournamentStatus, TournamentCategory, Team } from "@/types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MatchManager } from "@/features/tournaments/matches/match-manager";
import { TournamentSettings } from "@/features/tournaments/settings/tournament-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GroupNode } from "./group-node";
import { MatchNode } from "./match-node";
import { StandingNode } from "./standing-node";
import { TeamListNode } from "./team-list-node";
import { AnnouncementNode } from "./announcement-node";
import { SponsorNode } from "./sponsor-node";
import { RegistrationNode } from "./registration-node";
import { NodeSettings } from "./node-settings";
import { Announcements } from "@/features/tournaments/management/announcements";
import { CreateCategoryForm } from "@/features/tournaments/management/create-category-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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

const nodeTypes = {
    matchNode: MatchNode,
    groupNode: GroupNode,
    standingNode: StandingNode,
    teamListNode: TeamListNode,
    announcementNode: AnnouncementNode,
    sponsorNode: SponsorNode,
    registrationNode: RegistrationNode,
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
    userPlan?: string;
}

interface InboxItem {
    id: string;
    registration_status: string | null;
    payment_status: string | null;
    roster_status: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    created_at: string;
    tournament_category_id: string | number;
    unlock_requested?: boolean;
    team: {
        id: string;
        name: string;
        logo_img: string | null;
    } | null;
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
    userPlan,
}: CanvasProps) {
    const locale = useLocale();
    const { toast } = useToast();
    const t = useTranslations("Tournament");
    const tSettings = useTranslations("Settings");

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-console-header",
                    popover: {
                        title: t("tour_console_welcome_title"),
                        description: t("tour_console_welcome_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-console-name",
                    popover: {
                        title: t("tour_console_name_title"),
                        description: t("tour_console_name_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-console-category",
                    popover: {
                        title: t("tour_console_category_title"),
                        description: t("tour_console_category_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-console-add-components") ? [{
                    element: "#tour-console-add-components",
                    popover: {
                        title: t("tour_console_add_title"),
                        description: t("tour_console_add_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : []),
                ...(document.getElementById("tour-console-canvas-wrapper") ? [{
                    element: "#tour-console-canvas-wrapper",
                    popover: {
                        title: t("tour_console_canvas_title"),
                        description: t("tour_console_canvas_desc"),
                        side: "top" as const,
                        align: "start" as const
                    }
                }] : []),
                ...(document.getElementById("tour-console-sidebar-buttons") ? [{
                    element: "#tour-console-sidebar-buttons",
                    popover: {
                        title: t("tour_console_sidebar_title"),
                        description: t("tour_console_sidebar_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_console_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_console_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    // Dialog state for unsaved changes warning
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'navigate'; href: string } | { type: 'close' } | null>(null);

    // Lifted Filter States
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterStage, setFilterStage] = useState<string>("all");
    const [viewDate, setViewDate] = useState(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const [activeMatches, setActiveMatches] = useState<Match[]>([]);

    const fetchMatches = useCallback(async (categoryId: string) => {
        if (!categoryId) return;
        console.log("[Canvas Internal] fetchMatches called for category:", categoryId);
        const supabase = createClient();
        const { data, error } = await supabase
            .from("matches")
            .select(`
                *,
                home_team:teams!matches_home_team_id_fkey(name, logo_img),
                away_team:teams!matches_away_team_id_fkey(name, logo_img)
            `)
            .eq("tournament_category_id", categoryId)
            .is("deleted_at", null)
            .order("round", { ascending: true });

        if (error) {
            console.error("[Canvas Internal] Failed to fetch matches:", error);
            return;
        }

        if (data) {
            const mappedMatches = (data as Match[]).map(match => {
                let match_date = match.match_date;
                let match_time = match.match_time;
                if (match.scheduled_at) {
                    const parts = match.scheduled_at.split('T');
                    match_date = parts[0];
                    match_time = parts[1]?.substring(0, 5) || null;
                }

                const home_team = match.home_team ? {
                    id: match.home_team.id || "",
                    name: match.home_team.name || "",
                    logo_url: (match.home_team as { logo_img?: string | null }).logo_img || match.home_team.logo_url || undefined
                } : undefined;

                const away_team = match.away_team ? {
                    id: match.away_team.id || "",
                    name: match.away_team.name || "",
                    logo_url: (match.away_team as { logo_img?: string | null }).logo_img || match.away_team.logo_url || undefined
                } : undefined;

                return {
                    ...match,
                    match_date,
                    match_time,
                    home_team,
                    away_team
                };
            });

            // Sort mapped matches by date and time in JavaScript
            mappedMatches.sort((a, b) => {
                if (a.match_date && b.match_date) {
                    if (a.match_date !== b.match_date) {
                        return a.match_date.localeCompare(b.match_date);
                    }
                    if (a.match_time && b.match_time) {
                        return a.match_time.localeCompare(b.match_time);
                    }
                }
                return 0;
            });

            console.log("[Canvas Internal] fetchMatches mapped matches count:", mappedMatches.length, "data:", mappedMatches);
            setActiveMatches(mappedMatches);
        }
    }, []);


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
        return new Set(activeMatches.map(m => m.match_date).filter(Boolean));
    }, [activeMatches]);

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
        addRegistrationNode,
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
    }, [initialTeamsData, setStoreTeams]);
    const [activeSidebar, setActiveSidebar] = useState<'teams' | 'settings' | 'schedule'>('teams');
    const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'categories' | 'registration' | 'location' | 'staff' | 'danger'>('general');
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(tournamentName);
    const [tempName, setTempName] = useState(tournamentName);
    const { screenToFlowPosition } = useReactFlow();
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<TournamentStatus>(tournament?.status || 'draft');
    const [isLocked, setIsLocked] = useState(readonly || tournament?.status === 'finished');


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
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingAction({ type: 'navigate', href });
                        setShowUnsavedDialog(true);
                    }
                }
            }
        };

        document.addEventListener('click', handleAnchorClick, true);
        return () => {
            document.removeEventListener('click', handleAnchorClick, true);
        };
    }, [isDirty, readonly, isLocked]);

    const handleConfirmLeave = () => {
        setShowUnsavedDialog(false);
        if (pendingAction?.type === 'navigate') {
            router.push(pendingAction.href);
        } else if (pendingAction?.type === 'close') {
            if (onClose) onClose();
        }
        setPendingAction(null);
    };

    const handleCancelLeave = () => {
        setShowUnsavedDialog(false);
        setPendingAction(null);
    };

    const router = useRouter();

    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [inboxOpen, setInboxOpen] = useState(false);
    const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
    const [isInboxLoading, setIsInboxLoading] = useState(false);

     const fetchInboxItems = useCallback(async () => {
        if (categories.length === 0) return;
        setIsInboxLoading(true);
        try {
            const supabase = createClient();
             const { data, error } = await supabase
                .from("tournament_teams")
                .select(`
                    id,
                    registration_status,
                    payment_status,
                    roster_status,
                    contact_name,
                    contact_phone,
                    created_at,
                    tournament_category_id,
                    unlock_requested,
                    team:teams (
                        id,
                        name,
                        logo_img
                    )
                `)
                .in("tournament_category_id", categories.map(c => c.id))
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            if (!error && data) {
                const formattedItems: InboxItem[] = data.map((item) => {
                    const teamData = Array.isArray(item.team) ? item.team[0] : item.team;
                    return {
                        id: item.id,
                        registration_status: item.registration_status,
                        payment_status: item.payment_status,
                        roster_status: (item as { roster_status: string | null }).roster_status || null,
                        contact_name: item.contact_name,
                        contact_phone: item.contact_phone,
                        created_at: item.created_at,
                        tournament_category_id: item.tournament_category_id,
                        unlock_requested: (item as { unlock_requested?: boolean | null }).unlock_requested || false,
                        team: teamData ? {
                            id: teamData.id,
                            name: teamData.name,
                            logo_img: teamData.logo_img
                        } : null
                    };
                });
                setInboxItems(formattedItems);
            }
        } catch (err) {
            console.error("Error fetching inbox items:", err);
        } finally {
            setIsInboxLoading(false);
        }
    }, [categories]);

    useEffect(() => {
        if (categories.length > 0) {
            fetchInboxItems();
        }
    }, [categories, fetchInboxItems]);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    // Read persisted category from URL (?category=id), fallback to null (first category)
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
        searchParams.get("category")
    );
    const [ageCategories, setAgeCategories] = useState<{ id: number; category_name: string }[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const toCategoryId = useCallback((id: unknown) => String(id), []);

    useEffect(() => {
        if (initialMatchesData && initialMatchesData.length > 0 && activeCategoryId) {
            const filtered = initialMatchesData.filter(
                m => String(m.tournament_category_id) === String(activeCategoryId)
            );
            const mapped = filtered.map(match => {
                let match_date = match.match_date;
                let match_time = match.match_time;
                if (match.scheduled_at) {
                    const parts = match.scheduled_at.split('T');
                    match_date = parts[0];
                    match_time = parts[1]?.substring(0, 5) || null;
                }
                return {
                    ...match,
                    match_date,
                    match_time
                };
            });

            // Sort mapped matches by date and time in JavaScript
            mapped.sort((a, b) => {
                if (a.match_date && b.match_date) {
                    if (a.match_date !== b.match_date) {
                        return a.match_date.localeCompare(b.match_date);
                    }
                    if (a.match_time && b.match_time) {
                        return a.match_time.localeCompare(b.match_time);
                    }
                }
                return 0;
            });

            setActiveMatches(mapped);
        }
    }, [initialMatchesData, activeCategoryId]);

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
            setStoreCategoryId(resolvedCategoryId);
            fetchTeams(resolvedCategoryId);
            fetchMatches(resolvedCategoryId);
        }

        return catData ?? [];
    }, [tournamentId, hydrate, toCategoryId, searchParams, activeCategoryId, fetchMatches, fetchTeams, setStoreCategoryId]);

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
        fetchMatches(urlCategoryId);
    }, [searchParams, categories, activeCategoryId, hydrate, setStoreCategoryId, fetchTeams, toCategoryId, fetchMatches]);
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
                markClean();
                if (result.data) {
                    hydrate(result.data);
                    // Update local categories list
                    setCategories(prev => prev.map(c =>
                        c.id === activeCategoryId
                            ? { ...c, canvas_data: result.data ?? null }
                            : c
                    ));
                }
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
        fetchMatches(normalizedCategoryId);
        // Persist to URL without adding a history entry
        const params = new URLSearchParams(searchParams.toString());
        params.set("category", normalizedCategoryId);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [activeCategoryId, isDirty, handleSave, categories, hydrate, fetchTeams, setStoreCategoryId, searchParams, pathname, toCategoryId, fetchMatches, router]);

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
            setPendingAction({ type: 'close' });
            setShowUnsavedDialog(true);
        } else {
            if (onClose) onClose();
        }
    }, [isDirty, readonly, onClose]);

    const onDragStop = useCallback(() => {
        setIsDragging(false);
    }, []);

    const isValidConnection = useCallback((connection: Edge | Connection) => {
        const sourceConnected = edges.some(
            (edge) =>
                edge.source === connection.source &&
                edge.sourceHandle === (connection.sourceHandle ?? null)
        );
        const targetConnected = edges.some(
            (edge) =>
                edge.target === connection.target &&
                edge.targetHandle === (connection.targetHandle ?? null)
        );
        return !sourceConnected && !targetConnected;
    }, [edges]);

    const onConnectWithSave = useCallback((params: Connection) => {
        onConnect(params);
    }, [onConnect]);




    const handleCopyLinkRegister = useCallback(() => {
        const categoryQuery = activeCategoryId ? `?category=${activeCategoryId}` : "";
        const url = `${window.location.origin}/${locale}/registration/${tournamentId}${categoryQuery}`;
        navigator.clipboard.writeText(url);
        toast({
            title: locale === 'th' ? "คัดลอกลิงก์แล้ว" : "Link Copied",
            description: locale === 'th' ? "คัดลอกลิงก์ทัวร์นาเมนต์ไปยังคลิปบอร์ดแล้ว" : "Tournament link copied to clipboard.",
        });
    }, [tournamentId, locale, toast, activeCategoryId]);

    const handleOpenLinkRegister = useCallback(() => {
        const categoryQuery = activeCategoryId ? `?category=${activeCategoryId}` : "";
        const url = `${window.location.origin}/${locale}/registration/${tournamentId}${categoryQuery}`;
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


    return (
        <div className={cn("flex flex-col h-full w-full border bg-card rounded-xl")}>
            {/* Mobile Portrait Orientation Warning */}
            <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center lg:hidden portrait:flex landscape:hidden">
                <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-bounce">
                        <RotateCw className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                        {locale === 'th' ? 'กรุณาหมุนหน้าจอเป็นแนวนอน' : 'Please rotate your device'}
                    </h2>
                    <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto leading-relaxed">
                        {locale === 'th'
                            ? 'ระบบบอร์ดจัดการแข่งขันออกแบบมาสำหรับใช้งานในแนวนอนบนอุปกรณ์มือถือเพื่อความสะดวกในการจัดการ'
                            : 'The bracket manager is designed for landscape mode on mobile devices for the best editing experience.'}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between p-2 lg:p-4 border-b gap-1" id="tour-console-header">
                <div className="flex items-center gap-2 lg:gap-4">
                    <div className="flex items-center gap-1 lg:gap-2">
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
                                id="tour-console-name"
                                className={cn(
                                    "lg:text-lg text-base font-bold tracking-tight cursor-pointer hover:text-primary transition-colors",
                                    readonly && "cursor-default hover:text-foreground"
                                )}
                                onClick={() => !readonly && setIsEditingName(true)}
                            >
                                {currentName}
                            </span>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={startTour}
                            className="h-6 w-6"                        >
                            <HelpCircle className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                            variant={isLocked ? "default" : "outline"}
                            size="icon"
                            onClick={() => setIsLocked(!isLocked)}
                            disabled={currentStatus === 'finished' || readonly}
                            className={cn(
                                "transition-all",
                                isLocked
                                    ? "bg-warning"
                                    : "text-warning"
                            )}
                        >
                            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>

                        {/* Category Select Selector */}
                        <div id="tour-console-category">
                            <Select
                                value={activeCategoryId || ""}
                                onValueChange={(val) => {
                                    if (val === "create_new") {
                                        const isProUser = userPlan === "monthly" || userPlan === "yearly" || userPlan === "manager_pro" || userPlan === "pro" || userPlan === "pro_yearly" || userPlan === "customs";
                                        if (!isProUser && categories.length >= 1) {
                                            toast({
                                                title: "Error",
                                                description: locale === 'th'
                                                    ? "ผู้ใช้ทั่วไปสามารถสร้างรุ่นการแข่งขันได้สูงสุด 1 รุ่นเท่านั้น กรุณาอัพเกรดเป็นแพ็คเกจ Pro"
                                                    : "Starter plan users can create only 1 tournament category. Please upgrade to a Pro plan.",
                                                variant: "destructive"
                                            });
                                            return;
                                        }
                                        setIsCreateOpen(true);
                                    } else {
                                        handleCategorySwitch(val);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder={locale === 'th' ? "เลือกรุ่นการแข่งขัน" : "Select Category"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.length === 0 ? (
                                        <SelectItem value="none" disabled className="text-muted-foreground text-xs font-semibold">
                                            {locale === 'th' ? "ยังไม่ได้ตั้งค่าประเภทการแข่งขัน" : "No categories configured yet"}
                                        </SelectItem>
                                    ) : (
                                        categories.map((cat) => {
                                            const catName = getCategoryDisplayName(cat);
                                            return (
                                                <SelectItem
                                                    key={cat.id}
                                                    value={toCategoryId(cat.id)}
                                                    className="cursor-pointer text-xs font-bold"
                                                >
                                                    {catName} ({cat.max_teams} Teams)
                                                </SelectItem>
                                            );
                                        })
                                    )}
                                    {!readonly && (
                                        <SelectItem
                                            value="create_new"
                                            className="cursor-pointer text-xs font-bold text-primary focus:text-primary focus:bg-primary/10 flex items-center gap-1.5"
                                        >
                                            + {locale === 'th' ? "สร้างประเภทการแข่งขัน..." : "Create Category..."}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 lg:gap-2">
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-10 w-10">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="flex items-center gap-1 lg:gap-2">
                        {!readonly && (
                            <Button
                                onClick={() => handleSave(true)}
                                disabled={!isDirty || isSaving}
                                variant={isDirty ? "default" : "outline"}
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                <span>{locale === 'th' ? "บันทึก" : "Save"}</span>
                            </Button>
                        )}
                        {!readonly && (
                            <div className="flex items-center gap-1 lg:gap-2" id="tour-console-sidebar-buttons">

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
                                    <DialogContent className="bg-card rounded-xl sm:max-w-[500px] p-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                        <DialogHeader className="p-2 lg:p-4 pb-0 border-b">
                                            <DialogTitle className="text-2xl font-black tracking-tighter text-foreground flex items-center">
                                                {locale === 'th' ? "ประกาศใหม่" : "New Announcement"}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <Announcements
                                            tournamentId={tournamentId}
                                            isEditable={!readonly}
                                            mode="form"
                                            onSuccess={() => setIsAnnouncementOpen(false)}
                                        />
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={inboxOpen} onOpenChange={(val) => {
                                    setInboxOpen(val);
                                    if (val) fetchInboxItems();
                                }}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="relative text-foreground transition-all"
                                        >
                                            <Inbox className="h-4 w-4" />
                                            {inboxItems.filter(item => item.registration_status === 'pending' || item.roster_status === 'pending').length > 0 && (
                                                <span className="absolute top-2 right-2 bg-destructive rounded-full h-2 w-2"/>
                                            )}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card rounded-xl sm:max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden">
                                        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
                                            <DialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                                                <span>กล่องข้อความ / รายการแจ้งเตือน</span>
                                            </DialogTitle>
                                        </DialogHeader>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                            {isInboxLoading ? (
                                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                    <span className="text-xs text-muted-foreground/60">กำลังโหลดรายการแจ้งเตือน...</span>
                                                </div>
                                            ) : inboxItems.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                                                    <Inbox className="h-10 w-10 text-muted-foreground/20" />
                                                    <h3 className="font-bold text-foreground text-sm">ไม่มีข้อความใหม่</h3>
                                                    <p className="text-xs text-muted-foreground max-w-xs">
                                                        ยังไม่มีทีมลงสมัครหรือทำรายการใด ๆ ในทัวร์นาเมนต์นี้
                                                    </p>
                                                </div>
                                            ) : (
                                                inboxItems.map((item) => {
                                                    const isPendingReg = item.registration_status === 'pending';
                                                    const hasRoster = item.contact_name || item.contact_phone;
                                                    const category = categories.find(c => String(c.id) === String(item.tournament_category_id));
                                                    const categoryName = category?.age_categories?.category_name || "ทั่วไป";

                                                    return (
                                                        <div key={item.id} className="border rounded-lg p-3 space-y-3 bg-card/50 hover:bg-muted/10 transition-colors">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="h-9 w-9 rounded-full border overflow-hidden flex items-center justify-center bg-background">
                                                                        {item.team?.logo_img ? (
                                                                            <Image
                                                                                src={item.team.logo_img}
                                                                                alt={item.team.name}
                                                                                width={36}
                                                                                height={36}
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <Users className="h-4 w-4 text-muted-foreground/60" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-sm text-foreground">{item.team?.name || "ไม่ทราบชื่อทีม"}</h4>
                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                            รุ่นการแข่งขัน: {categoryName} • {new Date(item.created_at).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US')}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <span className={cn(
                                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                                    isPendingReg
                                                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                                        : item.registration_status === 'approved'
                                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                            : "bg-destructive/10 text-destructive border-destructive/20"
                                                                )}>
                                                                    {isPendingReg ? "รอดำเนินการ" : item.registration_status === 'approved' ? "อนุมัติแล้ว" : "ปฏิเสธ"}
                                                                </span>
                                                            </div>

                                                            {/* Notification Details & Actions */}
                                                            <div className="bg-muted/30 p-2.5 rounded-md text-xs space-y-2">
                                                                {isPendingReg ? (
                                                                    <p className="text-foreground">
                                                                        📢 <strong>ยื่นใบสมัครใหม่</strong> ต้องการขอเข้าร่วมการแข่งขันในรุ่นนี้
                                                                    </p>
                                                                ) : item.unlock_requested ? (
                                                                    <p className="text-foreground">
                                                                        🔑 <strong>ขอปลดล็อกรายชื่อ/ข้อมูลทีม</strong> ต้องการแก้ไขข้อมูลและนักกีฬา
                                                                    </p>
                                                                ) : hasRoster ? (
                                                                    <p className="text-foreground">
                                                                        {item.roster_status === 'pending' ? (
                                                                            <>📋 <strong>ส่งรายชื่อนักกีฬาแล้ว (รออนุมัติ)</strong></>
                                                                        ) : item.roster_status === 'approved' ? (
                                                                            <>✅ <strong>อนุมัติรายชื่อแล้ว</strong></>
                                                                        ) : item.roster_status === 'rejected' ? (
                                                                            <>❌ <strong>ปฏิเสธรายชื่อแล้ว (รอแก้ไข)</strong></>
                                                                        ) : (
                                                                            <>📋 <strong>ส่งรายชื่อนักกีฬาแล้ว</strong></>
                                                                        )} ผู้ติดต่อ: {item.contact_name} ({item.contact_phone})
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-muted-foreground">
                                                                        ทีมนี้ได้ลงทะเบียนสำเร็จแล้ว แต่ยังไม่ได้ส่งรายชื่อนักกีฬา
                                                                    </p>
                                                                )}

                                                                {/* Action Buttons */}
                                                                <div className="flex gap-2 justify-end pt-1">
                                                                    {isPendingReg && (
                                                                        <>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                type="button"
                                                                                className="h-8 text-xs border-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                                onClick={async () => {
                                                                                    const res = await rejectRegistration(item.id, tournamentId);
                                                                                    if (res.success) {
                                                                                        toast({ title: "ปฏิเสธการลงทะเบียนเรียบร้อยแล้ว" });
                                                                                        fetchInboxItems();
                                                                                    } else {
                                                                                        toast({ title: "เกิดข้อผิดพลาด", description: res.error, variant: "destructive" });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                ปฏิเสธ
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="default"
                                                                                type="button"
                                                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                                onClick={async () => {
                                                                                    const res = await approveRegistration(item.id, tournamentId);
                                                                                    if (res.success) {
                                                                                        toast({ title: "อนุมัติการลงทะเบียนเรียบร้อยแล้ว" });
                                                                                        fetchInboxItems();
                                                                                    } else {
                                                                                        toast({ title: "เกิดข้อผิดพลาด", description: res.error, variant: "destructive" });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                อนุมัติใบสมัคร
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                    {item.unlock_requested ? (
                                                                        <>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                type="button"
                                                                                className="h-8 text-xs border-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                                onClick={async () => {
                                                                                    const { rejectRosterUnlock } = await import("@/actions/tournaments/registration");
                                                                                    const res = await rejectRosterUnlock(item.id, tournamentId);
                                                                                    if (res.success) {
                                                                                        toast({ title: "ปฏิเสธคำขอปลดล็อกเรียบร้อยแล้ว" });
                                                                                        fetchInboxItems();
                                                                                    } else {
                                                                                        toast({ title: "เกิดข้อผิดพลาด", description: res.error, variant: "destructive" });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                ปฏิเสธคำขอ
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="default"
                                                                                type="button"
                                                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                                onClick={async () => {
                                                                                    const { approveRosterUnlock } = await import("@/actions/tournaments/registration");
                                                                                    const res = await approveRosterUnlock(item.id, tournamentId);
                                                                                    if (res.success) {
                                                                                        toast({ title: "อนุมัติคำขอปลดล็อกเรียบร้อยแล้ว" });
                                                                                        fetchInboxItems();
                                                                                    } else {
                                                                                        toast({ title: "เกิดข้อผิดพลาด", description: res.error, variant: "destructive" });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                อนุมัติปลดล็อก
                                                                            </Button>
                                                                        </>
                                                                    ) : hasRoster && (
                                                                         <>
                                                                             <RosterDialog
                                                                                 team={{
                                                                                     id: item.id,
                                                                                     name: item.team?.name || "",
                                                                                     logo_url: item.team?.logo_img,
                                                                                     contact_name: item.contact_name,
                                                                                     contact_phone: item.contact_phone,
                                                                                     sport: 'football'
                                                                                 } as unknown as TournamentTeam}
                                                                                 tournamentId={tournamentId}
                                                                                 readOnly={item.roster_status === 'approved'}
                                                                                 trigger={
                                                                                     <Button size="sm" variant="outline" type="button" className="h-8 text-xs">
                                                                                         ตรวจสอบรายชื่อนักกีฬา
                                                                                     </Button>
                                                                                 }
                                                                             />
                                                                             {item.roster_status === 'pending' && (
                                                                                 <>
                                                                                     <Button
                                                                                         size="sm"
                                                                                         variant="outline"
                                                                                         type="button"
                                                                                         className="h-8 text-xs border-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                                         onClick={async () => {
                                                                                             const res = await rejectRoster(item.id, tournamentId);
                                                                                             if (res.success) {
                                                                                                 toast({ title: "ปฏิเสธรายชื่อเรียบร้อยแล้ว" });
                                                                                                 fetchInboxItems();
                                                                                             } else {
                                                                                                 toast({ title: "เกิดข้อผิดพลาด", description: res.error, variant: "destructive" });
                                                                                             }
                                                                                         }}
                                                                                     >
                                                                                         ปฏิเสธรายชื่อ
                                                                                     </Button>
                                                                                     <Button
                                                                                         size="sm"
                                                                                         variant="default"
                                                                                         type="button"
                                                                                         className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                                         onClick={async () => {
                                                                                             const res = await approveRoster(item.id, tournamentId);
                                                                                             if (res.success) {
                                                                                                 toast({ title: "อนุมัติรายชื่อเรียบร้อยแล้ว" });
                                                                                                 fetchInboxItems();
                                                                                             } else {
                                                                                                 toast({ title: "เกิดข้อผิดพลาด", description: res.error, variant: "destructive" });
                                                                                             }
                                                                                         }}
                                                                                     >
                                                                                         อนุมัติรายชื่อ
                                                                                     </Button>
                                                                                 </>
                                                                             )}
                                                                         </>
                                                                     )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
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
                                        <div>
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60">
                                                {locale === 'th' ? "หน้าทัวร์นาเมนต์ (สาธารณะ)" : "Tournament View (Public)"}
                                            </div>
                                            <DropdownMenuItem
                                                onClick={handleCopyLink}
                                                className="cursor-pointer text-xs rounded focus:bg-primary/10 focus:text-primary flex items-center gap-1.5"
                                            >
                                                <Link2 className="h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "คัดลอกลิงก์" : "Copy Link"}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={handleOpenLink}
                                                className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary flex items-center gap-1.5"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "เปิดลิงก์" : "Open Link"}</span>
                                            </DropdownMenuItem>
                                        </div>

                                        <div>
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60">
                                                {locale === 'th' ? "หน้าลงทะเบียนทีม" : "Team Registration"}
                                            </div>
                                            <DropdownMenuItem
                                                onClick={handleCopyLinkRegister}
                                                className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary flex items-center gap-1.5"
                                            >
                                                <Link2 className="h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "คัดลอกลิงก์ลงทะเบียน" : "Copy Reg. Link"}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={handleOpenLinkRegister}
                                                className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary flex items-center gap-1.5"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "เปิดลิงก์ลงทะเบียน" : "Open Reg. Link"}</span>
                                            </DropdownMenuItem>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant={activeSidebar === 'schedule' ? "default" : "outline"}
                                    size="icon"
                                    onClick={() => setActiveSidebar(activeSidebar === 'schedule' ? 'teams' : 'schedule')}
                                    className={cn(
                                        "transition-all",
                                        activeSidebar === 'schedule'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <Calendar className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant={activeSidebar === 'settings' ? "default" : "outline"}
                                    size="icon"
                                    onClick={() => setActiveSidebar(activeSidebar === 'settings' ? 'teams' : 'settings')}
                                    className={cn(
                                        "transition-all",
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
                        <div className="flex flex-1 overflow-hidden bg-card">
                            {/* Left Controls Sidebar (w-64 like settings) */}
                            <div className="w-64 border-r flex flex-col p-2 lg:p-3 gap-2 shrink-0 z-10">
                                <div>
                                    <div className="space-y-4">
                                        {/* Date Filter */}
                                        <div className="space-y-1">
                                            <Label>{locale === 'th' ? "เลือกวันที่" : "Date Selection"}</Label>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center border bg-muted/5 rounded-sm">
                                                    <button
                                                        onClick={() => setSelectedDate(null)}
                                                        className={cn(
                                                            "px-2 py-3 text-[10px] font-black tracking-tighter transition-all border-r rounded-l-sm",
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
                                                                <Button variant="ghost" className="gap-2 hover:bg-muted transition-all">
                                                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                                                    <div className="flex flex-col items-start overflow-hidden">
                                                                        <span className="text-[10px] font-black tracking-tight truncate">
                                                                            {selectedDate ? formatDate(selectedDate, "d MMM yyyy", locale) : (locale === 'th' ? "วันนี้" : "TODAY")}
                                                                        </span>
                                                                    </div>
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80 p-0 bg-card rounded-lg shadow-2xl" align="start" side="right" sideOffset={10}>
                                                                <div className="p-3 border-b flex items-center justify-between bg-muted/20">
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
                                            <Label>{locale === 'th' ? "ตัวกรองรอบการแข่งขัน" : "Stage Filter"}</Label>
                                            <Select value={filterStage} onValueChange={setFilterStage}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={locale === 'th' ? "รอบการแข่งขัน" : "Stage"} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card shadow-2xl">
                                                    <SelectItem value="all" className="font-black text-[10px] tracking-widest">
                                                        {locale === 'th' ? "ทั้งหมด" : "ALL"}
                                                    </SelectItem>
                                                    <SelectItem value="group" className="font-black text-[10px] tracking-widest">
                                                        {locale === 'th' ? "กลุ่ม" : "GROUP STAGE"}
                                                    </SelectItem>
                                                    <SelectItem value="knockout" className="font-black text-[10px] tracking-widest">
                                                        {locale === 'th' ? "น็อคเอาท์" : "KNOCKOUT STAGE"}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-2 lg:p-4">
                                    <MatchManager
                                        matches={activeMatches}
                                        teams={teams as unknown as Team[]}
                                        tournamentId={tournament.id}
                                        format={tournament.format}
                                        startDate={tournament.start_date}
                                        endDate={tournament.end_date}
                                        hideControls={true}
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
                            <aside className="w-64 border-r flex flex-col shrink-0 py-4 px-2 lg:px-4 space-y-1">
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
                                    <span className="text-sm font-medium whitespace-nowrap">{tSettings("general_info")}</span>
                                </button>

                                <button
                                    onClick={() => setActiveSettingsTab('categories')}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded-sm transition-all relative group tracking-wide w-full text-left font-medium text-sm",
                                        activeSettingsTab === 'categories'
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <Trophy className={cn("h-4 w-4 transition-transform group-hover:text-primary", activeSettingsTab === 'categories' ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium whitespace-nowrap">{tSettings("categories")}</span>
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
                                    <span className="text-sm font-medium whitespace-nowrap">{tSettings("location")}</span>
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
                                    <span className="text-sm font-medium whitespace-nowrap">{tSettings("staff")}</span>
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
                                    <span className="text-sm font-medium whitespace-nowrap">{tSettings("danger_zone")}</span>
                                </button>
                            </aside>

                            {/* Settings Content Area */}
                            <main className="flex-1 overflow-y-auto custom-scrollbar p-2 lg:p-4 bg-muted/5">
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
                            {!readonly && !isLocked && activeSidebar !== 'schedule' && (
                                <div className="absolute top-4 right-4 z-50" id="tour-console-add-components">
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
                                                onAddRegistration={() => addRegistrationNode(tournamentId, getCenterPos())}
                                            />
                                            <div className="p-2 border-t mt-1 flex items-center justify-between">
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
                            <div className="w-full h-full" id="tour-console-canvas-wrapper">
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    proOptions={{ hideAttribution: true }}
                                    onNodesChange={readonly ? undefined : onNodesChange}
                                    onEdgesChange={readonly ? undefined : onEdgesChange}
                                    onConnect={readonly ? undefined : onConnectWithSave}
                                    isValidConnection={isValidConnection}
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
                        </div>

                        {!readonly && !isLocked && <NodeSettings />}
                    </>
                )}
            </div>

            {/* Create Category Dialog */}
            <CreateCategoryForm
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
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
                        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                    }
                }}
            />

            {/* Unsaved Changes Warning Dialog */}
            <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="p-2 lg:p-4 border-b">
                            {locale === 'th' ? 'คุณแน่ใจหรือไม่?' : 'Are you sure?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 lg:p-4">
                            {locale === 'th'
                                ? "คุณยังไม่ได้บันทึกการเปลี่ยนแปลงบนบอร์ด! ข้อมูลที่แก้ไขจะหายไป คุณแน่ใจหรือไม่ว่าต้องการออกจากหน้านี้โดยไม่บันทึก?"
                                : "You have unsaved changes on the canvas! Your modifications will be lost. Are you sure you want to leave without saving?"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-2 lg:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                        <AlertDialogCancel onClick={handleCancelLeave} className="mt-0">
                            {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmLeave}>
                            {locale === 'th' ? 'ยืนยันออกจากหน้า' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
