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
    Edge,
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    Loader2, Plus, Users, X,
    Settings, ShieldAlert,
    Calendar, ChevronLeft, ChevronRight, ExternalLink, Megaphone,
    Calendar as CalendarIcon, Lock, Unlock, Share2, Trophy, Inbox, MoreVertical, Building2, ClipboardEdit, Heart
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
import { withdrawTournamentTeam } from "@/actions/tournaments/registration";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { BracketCanvasData, Match, Tournament, TournamentTeam, TournamentStatus, TournamentCategory, Team } from "@/types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MatchManager } from "@/features/tournaments/matches/match-manager";
import { TournamentSettings } from "@/features/tournaments/settings/tournament-settings";
import { Tab, TabOption } from "@/components/ui/tab";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GroupNode } from "./group-node";
import { MatchNode } from "./match-node";
import { StandingNode } from "./standing-node";
import { TeamListNode } from "./team-list-node";
import { NodeSettings } from "./node-settings";
import { CreateCategoryForm } from "@/features/tournaments/management/create-category-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
};

function DeletableEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    const { deleteElements } = useReactFlow();

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            {selected && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan z-50"
                    >
                        <button
                            type="button"
                            className="w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteElements({ edges: [{ id }] });
                            }}
                            title="Delete connection"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}

const edgeTypes = {
    default: DeletableEdge,
    bezier: DeletableEdge,
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
    slip_img?: string | null;
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
    const { screenToFlowPosition } = useReactFlow();

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
    const [filterTeam, setFilterTeam] = useState<string>("all");
    const [viewDate, setViewDate] = useState(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const [activeMatches, setActiveMatches] = useState<Match[]>([]);

    useEffect(() => {
        if (tournament?.sport) {
            useBracketStore.getState().setSport(tournament.sport);
        }
    }, [tournament?.sport]);

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
        onReconnect,
        addMatchNode,
        addGroupNode,
        addStandingNode,
        addTeamListNode,
        hydrate,
        selectNode,
        activeNodeId,
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
    const [activeSidebar, setActiveSidebar] = useState<'teams' | 'settings' | 'schedule' | 'registration'>('teams');
    type SettingsTab = 'general' | 'categories' | 'location' | 'bank' | 'staff' | 'danger';
    const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general');

    const handleOpenRegistrationSettings = useCallback(() => {
        const currentActiveId = useBracketStore.getState().activeNodeId;
        if (currentActiveId === 'registration-setting-node') {
            setActiveNodeId(null);
            selectNode(null);
        } else {
            setActiveNodeId('registration-setting-node');
            selectNode('registration-setting-node');
        }
    }, [setActiveNodeId, selectNode]);

    const handleOpenAnnouncementSettings = useCallback(() => {
        const currentActiveId = useBracketStore.getState().activeNodeId;
        if (currentActiveId === 'announcement-setting-node') {
            setActiveNodeId(null);
            selectNode(null);
        } else {
            setActiveNodeId('announcement-setting-node');
            selectNode('announcement-setting-node');
        }
    }, [setActiveNodeId, selectNode]);

    const handleOpenSponsorSettings = useCallback(() => {
        const currentActiveId = useBracketStore.getState().activeNodeId;
        if (currentActiveId === 'sponsor-setting-node') {
            setActiveNodeId(null);
            selectNode(null);
        } else {
            setActiveNodeId('sponsor-setting-node');
            selectNode('sponsor-setting-node');
        }
    }, [setActiveNodeId, selectNode]);

    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
    const [_isInboxLoading, setIsInboxLoading] = useState(false);
    const [withdrawingItem, setWithdrawingItem] = useState<InboxItem | null>(null);
    const [withdrawConfirmText, setWithdrawConfirmText] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);

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
                    slip_img,
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
                        slip_img: (item as { slip_img?: string | null }).slip_img || null,
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

    const handleOpenInboxSettings = useCallback(() => {
        const currentActiveId = useBracketStore.getState().activeNodeId;
        if (currentActiveId === 'inbox-setting-node') {
            setActiveNodeId(null);
            selectNode(null);
        } else {
            setActiveNodeId('inbox-setting-node');
            selectNode('inbox-setting-node');
            fetchInboxItems();
        }
    }, [setActiveNodeId, selectNode, fetchInboxItems]);

    const settingsTabOptions = useMemo<TabOption<SettingsTab>[]>(() => {
        const options: TabOption<SettingsTab>[] = [
            { value: 'general', label: tSettings("general_info"), icon: Settings },
            { value: 'categories', label: tSettings("categories"), icon: Trophy },
            { value: 'bank', label: tSettings("bank_info"), icon: Building2 },
        ];

        const possessesStaffAccess = Boolean(
            userPlan && (
                userPlan === "event" ||
                userPlan === "cup" ||
                userPlan === "cup_yearly" ||
                userPlan === "monthly" ||
                userPlan === "pro" ||
                userPlan === "yearly" ||
                userPlan === "pro_yearly" ||
                userPlan === "manager_pro" ||
                userPlan === "customs"
            )
        );

        if (possessesStaffAccess) {
            options.push({ value: 'staff', label: tSettings("staff"), icon: Users });
        }

        options.push({ value: 'danger', label: tSettings("danger_zone"), icon: ShieldAlert });

        return options;
    }, [tSettings, userPlan]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(tournamentName);
    const [tempName, setTempName] = useState(tournamentName);
    const [currentStatus, setCurrentStatus] = useState<TournamentStatus>(tournament?.status || 'draft');
    const [isLocked, setIsLocked] = useState(readonly || tournament?.status === 'finished');
    const [isCategoryLoading, setIsCategoryLoading] = useState(false);
    const [userInvitationRole, setUserInvitationRole] = useState<string | null>(null);

    // Fetch user's invitation role for this tournament
    useEffect(() => {
        let isSubscribed = true;
        async function checkRole() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !tournamentId) return;

            // Check if owner first
            const { data: tour } = await supabase
                .from("tournaments")
                .select("organizer_id")
                .eq("id", tournamentId)
                .maybeSingle();

            if (tour && tour.organizer_id === user.id) {
                if (isSubscribed) setUserInvitationRole("organizer");
                return;
            }

            // Check invitation role in tournament_invitations
            const { data: invite } = await supabase
                .from("tournament_invitations")
                .select("role")
                .eq("tournament_id", tournamentId)
                .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
                .eq("status", "accepted")
                .is("deleted_at", null)
                .maybeSingle();

            if (isSubscribed) {
                setUserInvitationRole(invite?.role || null);
            }
        }
        checkRole();
        return () => {
            isSubscribed = false;
        };
    }, [tournamentId]);


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

    const handleWithdrawTeam = async () => {
        if (!withdrawingItem || !withdrawingItem.team) return;
        if (withdrawConfirmText !== withdrawingItem.team.name) {
            toast({
                title: locale === 'th' ? "ชื่อทีมไม่ถูกต้อง" : "Invalid team name",
                description: locale === 'th' ? "กรุณากรอกชื่อทีมให้ถูกต้องเพื่อยืนยัน" : "Please enter the correct team name to confirm.",
                variant: "destructive"
            });
            return;
        }

        setIsWithdrawing(true);
        try {
            const res = await withdrawTournamentTeam(withdrawingItem.id);
            if (res.success) {
                toast({
                    title: locale === 'th' ? "ถอนทีมสำเร็จ" : "Team withdrawn",
                    description: res.message || (locale === 'th' ? "ถอนทีมออกจากการแข่งขันแล้ว" : "The team has been withdrawn from the tournament.")
                });
                setWithdrawingItem(null);
                setWithdrawConfirmText("");
                fetchInboxItems();
                // Re-fetch bracket store teams so sidebar + canvas update in real-time
                if (activeCategoryId) {
                    useBracketStore.getState().fetchTeams(activeCategoryId);
                }
            } else {
                toast({
                    title: locale === 'th' ? "เกิดข้อผิดพลาด" : "Error",
                    description: res.error,
                    variant: "destructive"
                });
            }
        } catch (err) {
            toast({
                title: locale === 'th' ? "เกิดข้อผิดพลาด" : "Error",
                description: err instanceof Error ? err.message : "Failed to withdraw team",
                variant: "destructive"
            });
        } finally {
            setIsWithdrawing(false);
        }
    };

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
    const filteredInboxItems = useMemo(() => {
        if (!activeCategoryId) return inboxItems;
        return inboxItems.filter(item => String(item.tournament_category_id) === String(activeCategoryId));
    }, [inboxItems, activeCategoryId]);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    const [_lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
                setLastSavedAt(new Date());
                if (result.data) {
                    // Update local categories list cache without re-hydrating react-flow nodes (which destroys active input focus)
                    setCategories(prev => prev.map(c =>
                        c.id === activeCategoryId
                            ? { ...c, canvas_data: result.data ?? null }
                            : c
                    ));
                }
                if (showToast) {
                    toast({
                        title: locale === 'th' ? "บันทึกเรียบร้อย" : "Saved",
                        description: locale === 'th' ? "บันทึกข้อมูล Canvas เรียบร้อยแล้ว" : "Bracket canvas and matches saved successfully.",
                    });
                }
                return;
            }

            if (showToast) {
                toast({
                    title: locale === 'th' ? "เกิดข้อผิดพลาด" : "Error",
                    description: result.error || "Failed to save bracket canvas.",
                    variant: "destructive",
                });
            }
        } catch {
            if (showToast) {
                toast({
                    title: locale === 'th' ? "เกิดข้อผิดพลาด" : "Error",
                    description: "An unexpected error occurred.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsSaving(false);
        }
    }, [getCanvasData, isDirty, isSaving, markClean, readonly, toast, tournamentId, activeCategoryId, locale]);

    // Auto-save effect: save seamlessly in background like Figma/Canva
    // 1. Debounce timer is set to a snappy 800ms after user stops typing/dragging.
    // 2. Triggers INSTANT auto-save as soon as user blurs (clicks out of) an input field.
    useEffect(() => {
        if (!isDirty || isSaving || readonly) return;

        const timer = setTimeout(() => {
            handleSave(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [isDirty, isSaving, readonly, handleSave, nodes, edges]);

    // Save immediately on focusout (when user finishes typing and clicks outside or presses Tab/Enter)
    useEffect(() => {
        if (readonly) return;

        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')) {
                if (isDirty && !isSaving) {
                    handleSave(false);
                }
            }
        };

        window.addEventListener('focusout', handleFocusOut);
        return () => window.removeEventListener('focusout', handleFocusOut);
    }, [isDirty, isSaving, readonly, handleSave]);

    const handleCategorySwitch = useCallback(async (newCategoryId: string) => {
        const normalizedCategoryId = toCategoryId(newCategoryId);
        if (normalizedCategoryId === activeCategoryId) return;
        
        setIsCategoryLoading(true);
        if (isDirty) {
            await handleSave(false);
        }
        // Hydrate canvas from local cache and fetch teams for the new category
        const cached = categories.find(c => toCategoryId(c.id) === normalizedCategoryId);
        hydrate(cached?.canvas_data ?? null);
        setActiveCategoryId(normalizedCategoryId);
        setStoreCategoryId(normalizedCategoryId);
        
        try {
            await Promise.all([
                fetchTeams(normalizedCategoryId),
                fetchMatches(normalizedCategoryId)
            ]);
        } catch (error) {
            console.error("Error fetching category data:", error);
        } finally {
            setIsCategoryLoading(false);
        }
        
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
        return connection.source !== connection.target;
    }, []);

    const onConnectWithSave = useCallback((params: Connection) => {
        onConnect(params);
    }, [onConnect]);

    const onReconnectWithSave = useCallback((oldEdge: Edge, newConnection: Connection) => {
        onReconnect(oldEdge, newConnection);
    }, [onReconnect]);

    const onReconnectEnd = useCallback((event: MouseEvent | TouchEvent, edge: Edge) => {
        const targetIsHandle = (event.target as HTMLElement)?.classList?.contains('react-flow__handle');
        if (!targetIsHandle) {
            useBracketStore.getState().takeSnapshot();
            onEdgesChange([{ id: edge.id, type: 'remove' }]);
        }
    }, [onEdgesChange]);




    const handleOpenLinkRegister = useCallback(() => {
        const categoryQuery = activeCategoryId ? `?category=${activeCategoryId}` : "";
        const url = `${window.location.origin}/${locale}/registrations/${tournamentId}${categoryQuery}`;
        window.open(url, '_blank');
    }, [tournamentId, locale, activeCategoryId]);

    const handleOpenLink = useCallback(() => {
        const url = `${window.location.origin}/${locale}/tournaments/${tournamentId}`;
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
        <div className={cn("flex flex-col h-full w-full border bg-card rounded-sm")}>
            {/* Mobile Portrait Orientation Warning removed - full portrait mobile layout enabled */}

            <div className="flex items-center justify-between p-2 lg:p-4 border-b gap-1" id="tour-console-header">
                <div className="flex items-center gap-2 lg:gap-4">
                    <div className="flex items-center">
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
                            onClick={startTour}                    >
                            <HelpCircle className="h-4 w-4" />
                        </Button>

                        {userInvitationRole !== 'staff' && userInvitationRole !== 'referee' && (
                            <Button
                                variant={isLocked ? "default" : "ghost"}
                                size="icon"
                                onClick={() => setIsLocked(!isLocked)}
                                disabled={currentStatus === 'finished' || readonly}
                                className={cn(
                                    "transition-all",
                                    isLocked
                                        ? "bg-warning hover:bg-warning/80"
                                        : "text-warning"
                                )}
                            >
                                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                        )}

                        {/* Category Select Selector */}
                        <div id="tour-console-category">
                            <Select
                                value={activeCategoryId || ""}
                                onValueChange={(val) => {
                                    if (val === "create_new") {
                                        const isUnlimitedPlan = userPlan === "yearly" || userPlan === "pro_yearly" || userPlan === "cup_yearly" || userPlan === "customs";
                                        const isEventPlan = userPlan === "event" || userPlan === "monthly" || userPlan === "pro" || userPlan === "manager_pro" || userPlan === "cup";
                                        const maxAllowedCategories = isUnlimitedPlan ? Infinity : (isEventPlan ? 3 : 1);

                                        if (categories.length >= maxAllowedCategories) {
                                            toast({
                                                title: "Error",
                                                description: locale === 'th'
                                                    ? isEventPlan
                                                        ? "แพ็คเกจ Event สามารถสร้างรุ่นการแข่งขันได้สูงสุด 3 รุ่นต่อทัวร์นาเมนต์เท่านั้น"
                                                        : "ผู้ใช้ทั่วไปสามารถสร้างรุ่นการแข่งขันได้สูงสุด 1 รุ่นเท่านั้น กรุณาอัพเกรดแพ็คเกจ"
                                                    : isEventPlan
                                                        ? "Event plan allows up to 3 categories per tournament."
                                                        : "Free plan users can create only 1 tournament category. Please upgrade your plan.",
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
                                    {!readonly && userInvitationRole !== 'staff' && userInvitationRole !== 'referee' && (
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
                    <div className="flex items-center">
                        {!readonly && (
                            <>
                                {/* Desktop Sidebar & Tool Buttons */}
                                <div className="hidden md:flex items-center" id="tour-console-sidebar-buttons">

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-foreground transition-all"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-card shadow-2xl rounded-sm">
                                        <DropdownMenuItem
                                            onClick={handleOpenLink}
                                            className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary flex items-center gap-1.5"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            <span>{locale === 'th' ? "เปิดหน้าทัวร์นาเมนต์" : "Open Tournament Page"}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleOpenLinkRegister}
                                            className="cursor-pointer text-xs rounded font-medium focus:bg-primary/10 focus:text-primary flex items-center gap-1.5"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            <span>{locale === 'th' ? "เปิดหน้าลงทะเบียน" : "Open Registration Page"}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant={activeNodeId === 'inbox-setting-node' ? "default" : "ghost"}
                                    size="icon"
                                    onClick={handleOpenInboxSettings}
                                    title={locale === 'th' ? "กล่องข้อความ" : "Inbox"}
                                    className={cn(
                                        "relative transition-all",
                                        activeNodeId === 'inbox-setting-node'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <Inbox className="h-4 w-4" />
                                    {filteredInboxItems.some(item => 
                                        item.registration_status === 'pending' || 
                                        item.unlock_requested || 
                                        (item.roster_status === 'pending' && (item.contact_name || item.contact_phone))
                                    ) && (
                                        <span className="absolute top-2 right-2 bg-destructive rounded-full h-2 w-2" />
                                    )}
                                </Button>

                                <Button
                                    variant={activeNodeId === 'announcement-setting-node' ? "default" : "ghost"}
                                    size="icon"
                                    onClick={handleOpenAnnouncementSettings}
                                    title={locale === 'th' ? "ประกาศ" : "Announcements"}
                                    className={cn(
                                        "transition-all",
                                        activeNodeId === 'announcement-setting-node'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <Megaphone className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant={activeNodeId === 'registration-setting-node' ? "default" : "ghost"}
                                    size="icon"
                                    onClick={handleOpenRegistrationSettings}
                                    title={locale === 'th' ? "ตั้งค่าการลงทะเบียน" : "Registration Settings"}
                                    className={cn(
                                        "transition-all",
                                        activeNodeId === 'registration-setting-node'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <ClipboardEdit className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant={activeNodeId === 'sponsor-setting-node' ? "default" : "ghost"}
                                    size="icon"
                                    onClick={handleOpenSponsorSettings}
                                    title={locale === 'th' ? "ผู้สนับสนุน" : "Sponsors"}
                                    className={cn(
                                        "transition-all",
                                        activeNodeId === 'sponsor-setting-node'
                                            ? "bg-primary"
                                            : "text-foreground"
                                    )}
                                >
                                    <Heart className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant={activeSidebar === 'schedule' ? "default" : "ghost"}
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

                                {userInvitationRole !== 'staff' && userInvitationRole !== 'referee' && (
                                    <Button
                                        variant={activeSidebar === 'settings' ? "default" : "ghost"}
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
                                )}
                            </div>

                            {/* Mobile Menu (...) Dropdown or Close (X) button */}
                            <div className="flex md:hidden items-center" id="tour-console-mobile-menu">
                                {(activeSidebar === 'schedule' || activeSidebar === 'settings' || Boolean(activeNodeId)) ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setActiveSidebar('teams');
                                            setActiveNodeId(null);
                                            selectNode(null);
                                        }}
                                        className="text-foreground transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="relative text-foreground"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                                {filteredInboxItems.some(item => 
                                                    item.registration_status === 'pending' || 
                                                    item.unlock_requested || 
                                                    (item.roster_status === 'pending' && (item.contact_name || item.contact_phone))
                                                ) && (
                                                    <span className="absolute top-2 right-2 bg-destructive rounded-full h-2 w-2" />
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 bg-card shadow-2xl rounded-sm p-1">
                                            <DropdownMenuItem
                                                onClick={handleOpenAnnouncementSettings}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-2"
                                            >
                                                <Megaphone className="h-4 w-4" />
                                                <span>{locale === 'th' ? "ประกาศ" : "Announcement"}</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={handleOpenInboxSettings}
                                                className="cursor-pointer text-xs font-semibold flex items-center justify-between py-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Inbox className="h-4 w-4" />
                                                    <span>{locale === 'th' ? "กล่องข้อความ" : "Inbox"}</span>
                                                </div>
                                                {filteredInboxItems.some(item => 
                                                    item.registration_status === 'pending' || 
                                                    item.unlock_requested || 
                                                    (item.roster_status === 'pending' && (item.contact_name || item.contact_phone))
                                                ) && (
                                                    <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">New</span>
                                                )}
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={handleOpenRegistrationSettings}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-2"
                                            >
                                                <ClipboardEdit className="h-4 w-4" />
                                                <span>{locale === 'th' ? "ตั้งค่าการลงทะเบียน" : "Registration Settings"}</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={handleOpenSponsorSettings}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-2"
                                            >
                                                <Heart className="h-4 w-4" />
                                                <span>{locale === 'th' ? "ผู้สนับสนุน" : "Sponsors"}</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={() => setActiveSidebar('schedule')}
                                                className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-2"
                                            >
                                                <Calendar className="h-4 w-4" />
                                                <span>{locale === 'th' ? "ตารางการแข่งขัน" : "Schedule"}</span>
                                            </DropdownMenuItem>

                                            {userInvitationRole !== 'staff' && userInvitationRole !== 'referee' && (
                                                <DropdownMenuItem
                                                    onClick={() => setActiveSidebar('settings')}
                                                    className="cursor-pointer text-xs font-semibold flex items-center gap-2 py-2"
                                                >
                                                    <Settings className="h-4 w-4" />
                                                    <span>{locale === 'th' ? "ตั้งค่าทัวร์นาเมนต์" : "Settings"}</span>
                                                </DropdownMenuItem>
                                            )}

                                            <div className="border-t my-1" />

                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60">
                                                {locale === 'th' ? "ลิงก์และการแชร์" : "Links & Share"}
                                            </div>

                                            <DropdownMenuItem
                                                onClick={handleOpenLink}
                                                className="cursor-pointer text-xs flex items-center gap-2 py-1.5"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "เปิดหน้าทัวร์นาเมนต์" : "Open Tournament Page"}</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={handleOpenLinkRegister}
                                                className="cursor-pointer text-xs flex items-center gap-2 py-1.5"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                <span>{locale === 'th' ? "เปิดหน้าลงทะเบียน" : "Open Registration Page"}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </>
                    )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {isCategoryLoading ? (
                    <>
                        {/* Main Flow Editor Area Skeleton */}
                        <div className="flex-1 relative flex items-center justify-center bg-muted/5 overflow-hidden animate-pulse">
                            {/* Grid Background Lines (Dot Pattern style representation) */}
                            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] opacity-50" />
                            
                            {/* Floating Nodes Skeletons */}
                            <div className="relative w-full h-full flex items-center justify-center gap-12 p-8">
                                {/* Round 1 Column */}
                                <div className="space-y-16">
                                    {[...Array(2)].map((_, idx) => (
                                        <div key={idx} className="w-64 border rounded-sm p-3 bg-card space-y-2 relative shadow-sm">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-4 w-12 rounded-sm" />
                                                <Skeleton className="h-4 w-20 rounded-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center p-1 bg-muted/20 rounded-sm">
                                                    <Skeleton className="h-4 w-24 rounded-sm" />
                                                    <Skeleton className="h-4 w-6 rounded-sm" />
                                                </div>
                                                <div className="flex justify-between items-center p-1 bg-muted/20 rounded-sm">
                                                    <Skeleton className="h-4 w-24 rounded-sm" />
                                                    <Skeleton className="h-4 w-6 rounded-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Round 2 Column */}
                                <div className="space-y-32">
                                    <div className="w-64 border rounded-sm p-3 bg-card space-y-2 relative shadow-sm">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-12 rounded-sm" />
                                            <Skeleton className="h-4 w-20 rounded-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center p-1 bg-muted/20 rounded-sm">
                                                <Skeleton className="h-4 w-24 rounded-sm" />
                                                <Skeleton className="h-4 w-6 rounded-sm" />
                                            </div>
                                            <div className="flex justify-between items-center p-1 bg-muted/20 rounded-sm">
                                                <Skeleton className="h-4 w-24 rounded-sm" />
                                                <Skeleton className="h-4 w-6 rounded-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {activeSidebar === 'schedule' && tournament ? (
                            <div className="absolute inset-0 z-20 flex flex-col">
                                <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-card">
                                    {/* Mobile Schedule Controls Bar */}
                                    <div className="flex md:hidden flex-row overflow-x-auto border-b p-2 gap-2 bg-card shrink-0 custom-scrollbar items-center whitespace-nowrap z-10">
                                        {/* Date Filter */}
                                        <div className="flex items-center border bg-muted/5 rounded-sm shrink-0">
                                            <button
                                                onClick={() => setSelectedDate(null)}
                                                className={cn(
                                                    "px-2 py-1.5 text-[10px] font-black tracking-tighter transition-all border-r rounded-l-sm",
                                                    selectedDate === null
                                                        ? "bg-primary text-black"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {locale === 'th' ? "ทั้งหมด" : "ALL"}
                                            </button>
                                            <div className="flex items-center justify-between px-1 gap-1">
                                                <button onClick={goToPrevDay} className="p-1 hover:text-primary text-muted-foreground transition-colors">
                                                    <ChevronLeft className="h-3.5 w-3.5" />
                                                </button>
                                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5 hover:bg-muted transition-all">
                                                            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                                            <span className="text-[10px] font-black tracking-tight truncate">
                                                                {selectedDate ? formatDate(selectedDate, "d MMM yyyy", locale) : (locale === 'th' ? "วันนี้" : "TODAY")}
                                                            </span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-0 bg-card rounded-lg shadow-2xl" align="start" side="bottom" sideOffset={5}>
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
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Stage Filter */}
                                        <Select value={filterStage} onValueChange={setFilterStage}>
                                            <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
                                                <SelectValue placeholder={locale === 'th' ? "รอบการแข่งขัน" : "Stage"} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card shadow-2xl">
                                                <SelectItem value="all" className="font-black text-[10px] tracking-widest">
                                                    {locale === 'th' ? "ทั้งหมด" : "ALL"}
                                                </SelectItem>
                                                <SelectItem value="group" className="font-black text-[10px] tracking-widest">
                                                    {locale === 'th' ? "รอบแบ่งกลุ่ม (ทั้งหมด)" : "GROUP STAGE (ALL)"}
                                                </SelectItem>
                                                {nodes
                                                    .filter(n => n.type === 'groupNode')
                                                    .map(node => {
                                                        const label = (node.data as { label?: string })?.label || "Group";
                                                        return (
                                                            <SelectItem 
                                                                key={node.id} 
                                                                value={label} 
                                                                className="font-black text-[10px] tracking-widest pl-4"
                                                            >
                                                                - {label}
                                                            </SelectItem>
                                                        );
                                                    })
                                                }
                                                <SelectItem value="knockout" className="font-black text-[10px] tracking-widest">
                                                    {locale === 'th' ? "รอบน็อคเอาท์" : "KNOCKOUT STAGE"}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Team Filter */}
                                        <Select value={filterTeam} onValueChange={setFilterTeam}>
                                            <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
                                                <SelectValue placeholder={locale === 'th' ? "เลือกทีม" : "Select Team"} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card shadow-2xl">
                                                <SelectItem value="all" className="font-black text-[10px] tracking-widest">
                                                    {locale === 'th' ? "แสดงทั้งหมด" : "SHOW ALL"}
                                                </SelectItem>
                                                {teams.map(team => (
                                                    <SelectItem key={team.id} value={team.id} className="font-black text-[10px] tracking-widest">
                                                        {team.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Desktop Controls Sidebar */}
                                    <div className="hidden md:flex w-64 border-r flex-col p-2 lg:p-3 gap-2 shrink-0 z-10">
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
                                                                {locale === 'th' ? "รอบแบ่งกลุ่ม (ทั้งหมด)" : "GROUP STAGE (ALL)"}
                                                            </SelectItem>
                                                            {nodes
                                                                .filter(n => n.type === 'groupNode')
                                                                .map(node => {
                                                                    const label = (node.data as { label?: string })?.label || "Group";
                                                                    return (
                                                                        <SelectItem 
                                                                            key={node.id} 
                                                                            value={label} 
                                                                            className="font-black text-[10px] tracking-widest pl-4"
                                                                        >
                                                                            - {label}
                                                                        </SelectItem>
                                                                    );
                                                                })
                                                            }
                                                            <SelectItem value="knockout" className="font-black text-[10px] tracking-widest">
                                                                {locale === 'th' ? "รอบน็อคเอาท์" : "KNOCKOUT STAGE"}
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Team Filter */}
                                                <div className="space-y-2">
                                                    <Label>{locale === 'th' ? "ตัวกรองทีม" : "Team Filter"}</Label>
                                                    <Select value={filterTeam} onValueChange={setFilterTeam}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder={locale === 'th' ? "เลือกทีม" : "Select Team"} />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card shadow-2xl">
                                                            <SelectItem value="all" className="font-black text-[10px] tracking-widest">
                                                                {locale === 'th' ? "แสดงทั้งหมด" : "SHOW ALL"}
                                                            </SelectItem>
                                                            {teams.map(team => (
                                                                <SelectItem key={team.id} value={team.id} className="font-black text-[10px] tracking-widest">
                                                                    {team.name}
                                                                </SelectItem>
                                                            ))}
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
                                                matches={filterTeam === "all"
                                                    ? activeMatches
                                                    : activeMatches.filter(m => {
                                                        const selTeam = teams.find(t => t.id === filterTeam);
                                                        const targetIds = selTeam 
                                                            ? [selTeam.id, selTeam.team_id].filter(Boolean) as string[]
                                                            : [filterTeam];
                                                        return targetIds.includes(m.home_team_id || "") || 
                                                               targetIds.includes(m.away_team_id || "") ||
                                                               (m.home_team?.id && targetIds.includes(m.home_team.id)) ||
                                                               (m.away_team?.id && targetIds.includes(m.away_team.id));
                                                    })
                                                }
                                                teams={teams as unknown as Team[]}
                                                tournamentId={tournament.id}
                                                format={tournament.format}
                                                startDate={tournament.start_date}
                                                endDate={tournament.end_date}
                                                externalFilterStage={filterStage}
                                                externalSelectedDate={selectedDate}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {activeSidebar === 'settings' && tournament && userInvitationRole !== 'staff' && userInvitationRole !== 'referee' ? (
                            <div className="absolute inset-0 z-20 flex flex-col">
                                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                                    {/* Mobile Settings Tabs Bar using Tab component */}
                                    <div className="md:hidden border-b p-2 bg-card shrink-0 overflow-x-auto custom-scrollbar">
                                        <Tab
                                            options={settingsTabOptions}
                                            value={activeSettingsTab}
                                            onChange={(val) => setActiveSettingsTab(val)}
                                            orientation="horizontal"
                                            className="border-none p-0 flex-nowrap min-w-max"
                                        />
                                    </div>

                                    {/* Desktop Settings Sidebar using Tab component */}
                                    <aside className="hidden md:flex w-64 border-r flex-col shrink-0 p-3 bg-card">
                                        <Tab
                                            options={settingsTabOptions}
                                            value={activeSettingsTab}
                                            onChange={(val) => setActiveSettingsTab(val)}
                                            orientation="vertical"
                                            className="w-full border-none p-0 gap-1.5"
                                            itemClassName="justify-start py-2.5 px-3 text-xs rounded-sm"
                                        />
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
                                <div className="flex-1 relative flex overflow-hidden">
                                    {!readonly && !isLocked && activeSidebar !== 'schedule' && !activeNodeId && (
                                        <div className="absolute top-4 right-4 z-50" id="tour-console-add-components">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button>
                                                        <Plus className="h-4 w-4" />
                                                        New
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
                                            onReconnect={readonly || isLocked ? undefined : onReconnectWithSave}
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
                                            edgeTypes={edgeTypes}
                                            onReconnectEnd={readonly || isLocked ? undefined : onReconnectEnd}
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
                    </>
                )}
            </div>

            {/* Create Category Dialog */}
            <CreateCategoryForm
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                tournamentId={tournamentId}
                sport={tournament?.sport}
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

            <Dialog open={!!withdrawingItem} onOpenChange={(open) => {
                if (!open) {
                    setWithdrawingItem(null);
                    setWithdrawConfirmText("");
                }
            }}>
                <DialogContent showCloseButton={false} className="bg-card border rounded-sm shadow-2xl max-w-md p-0">
                    <DialogHeader className="border-b p-2 md:p-4 relative pr-10">
                        <DialogTitle>
                            {locale === 'th' ? "ถอนทีมออกจากการแข่งขัน" : "Withdraw Team from Tournament"}
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-2 top-2"
                            onClick={() => {
                                setWithdrawingItem(null);
                                setWithdrawConfirmText("");
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>
                    <div className="p-2 lg:p-4 space-y-1 lg:space-y-2">
                        <DialogDescription>
                            {locale === 'th'
                                ? "คุณแน่ใจหรือไม่ที่จะถอนทีมนี้ออกจากการแข่งขัน? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
                                : "Are you sure you want to withdraw this team from the tournament? This action cannot be undone."}
                        </DialogDescription>
                        <div className="space-y-1 lg:space-y-2">
                            <DialogDescription className="font-bold">
                                {locale === 'th'
                                    ? `กรุณากรอกชื่อทีม "${withdrawingItem?.team?.name}" เพื่อยืนยันการถอนทีม`
                                    : `Please type "${withdrawingItem?.team?.name}" to confirm.`}
                            </DialogDescription>
                            <Input
                                value={withdrawConfirmText}
                                onChange={(e) => setWithdrawConfirmText(e.target.value)}
                                autoComplete="off"
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>
                    <div className="p-2 md:p-4 border-t gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isWithdrawing || withdrawConfirmText !== withdrawingItem?.team?.name}
                            onClick={handleWithdrawTeam}
                            className="w-full"
                        >
                            {isWithdrawing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {locale === 'th' ? "ยืนยันการถอนทีม" : "Confirm Withdraw"}
                        </Button>
                    </div>
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
