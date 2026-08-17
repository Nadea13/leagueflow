"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createMasterPlayer, getMasterPlayerStats, searchMasterPlayers, claimMasterPlayer } from "@/actions/common/user";
import { Link } from "@/i18n/routing";
import {
    Trophy, Calendar, Search, HelpCircle,
    AlertCircle, UserCheck, Activity, Edit, Link as LinkIcon, Loader2,
    ChevronLeft, ChevronRight,
    Venus, Mars,
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, setYear } from "date-fns";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getSports } from "@/actions/manager/team";
import { Sport, Tournament } from "@/types";
import { getSportIcon } from "@/components/shared/sport-icons";
import { cn } from "@/lib/utils";
import { Tab } from "@/components/ui/tab";
import { LogoUploader } from "@/components/shared/logo-uploader";
import { updateGlobalPlayerPhoto } from "@/actions/tournaments/master-player";
import { EditVerifyProfileDialog } from "@/features/teams/edit-verify-profile-dialog";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export interface MasterPlayer {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    first_name_th?: string | null;
    middle_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    middle_name_en?: string | null;
    last_name_en?: string | null;
    gender?: 'male' | 'female' | string | null;
    birthday?: string | null;
    tel?: string | null;
    profile_img?: string | null;
    verified?: boolean;
    status?: string;
    favorite_sport_id?: string | null;
    preferred_hand?: string | null;
    preferred_foot?: string | null;
}

interface PlayerStats {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    saves: number;
    injuries: number;
    history: {
        tournamentName: string;
        teamName: string;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        saves: number;
        injuries: number;
    }[];
}

interface DashboardClientProps {
    initialTournaments: Tournament[];
    initialMasterPlayer: MasterPlayer | null;
}

export function DashboardClient({ initialTournaments, initialMasterPlayer }: DashboardClientProps) {
    const locale = useLocale();
    const isThai = locale === 'th';
    const t = useTranslations("Dashboard");
    const tCommon = useTranslations("Common");

    const [searchQuery, setSearchQuery] = useState("");
    const [masterPlayer, setMasterPlayer] = useState<MasterPlayer | null>(initialMasterPlayer);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null);
    const loadingStats = masterPlayer?.id ? statsPlayerId !== masterPlayer.id : false;

    useEffect(() => {
        let active = true;
        if (masterPlayer?.id) {
            getMasterPlayerStats(masterPlayer.id).then((res) => {
                if (active) {
                    if (res.success && res.data) {
                        setStats(res.data);
                    } else {
                        setStats(null);
                    }
                    setStatsPlayerId(masterPlayer.id);
                }
            });
        }
        return () => {
            active = false;
        };
    }, [masterPlayer?.id]);

    // Form inputs state
    const [firstNameTh, setFirstNameTh] = useState("");
    const [middleNameTh, setMiddleNameTh] = useState("");
    const [lastNameTh, setLastNameTh] = useState("");
    const [firstNameEn, setFirstNameEn] = useState("");
    const [middleNameEn, setMiddleNameEn] = useState("");
    const [lastNameEn, setLastNameEn] = useState("");
    const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
    const [createPreviewUrl, setCreatePreviewUrl] = useState<string | null>(null);
    const [gender, setGender] = useState("male");
    const [birthday, setBirthday] = useState("");
    const [dobViewDate, setDobViewDate] = useState<Date>(() => new Date(2000, 0, 1));

    const dobCalendarDays = useMemo(() => {
        const monthStart = startOfMonth(dobViewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [dobViewDate]);

    const birthYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const list = [];
        for (let y = currentYear; y >= 1940; y--) list.push(y);
        return list;
    }, []);
    const [tel, setTel] = useState("");
    const [favoriteSportId, setFavoriteSportId] = useState("");
    const [preferredHand, setPreferredHand] = useState("right");
    const [preferredFoot, setPreferredFoot] = useState("right");

    const isCreateHandRightSelected = preferredHand === "right" || preferredHand === "both";
    const isCreateHandLeftSelected = preferredHand === "left" || preferredHand === "both";

    const toggleCreateHand = (side: "right" | "left") => {
        if (side === "right") {
            if (isCreateHandRightSelected) {
                setPreferredHand(isCreateHandLeftSelected ? "left" : "");
            } else {
                setPreferredHand(isCreateHandLeftSelected ? "both" : "right");
            }
        } else {
            if (isCreateHandLeftSelected) {
                setPreferredHand(isCreateHandRightSelected ? "right" : "");
            } else {
                setPreferredHand(isCreateHandRightSelected ? "both" : "left");
            }
        }
    };

    const isCreateFootRightSelected = preferredFoot === "right" || preferredFoot === "both";
    const isCreateFootLeftSelected = preferredFoot === "left" || preferredFoot === "both";

    const toggleCreateFoot = (side: "right" | "left") => {
        if (side === "right") {
            if (isCreateFootRightSelected) {
                setPreferredFoot(isCreateFootLeftSelected ? "left" : "");
            } else {
                setPreferredFoot(isCreateFootLeftSelected ? "both" : "right");
            }
        } else {
            if (isCreateFootLeftSelected) {
                setPreferredFoot(isCreateFootRightSelected ? "right" : "");
            } else {
                setPreferredFoot(isCreateFootRightSelected ? "both" : "left");
            }
        }
    };

    const [sportsList, setSportsList] = useState<Sport[]>([]);

    useEffect(() => {
        async function loadSports() {
            const res = await getSports();
            if (res.success && res.data) {
                setSportsList(res.data);
            }
        }
        loadSports();
    }, []);

    // Edit profile & Claim profile state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [activeFormTab, setActiveFormTab] = useState<"create" | "claim">("create");
    const [claimSearchQuery, setClaimSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<MasterPlayer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [claimingPlayerId, setClaimingPlayerId] = useState<string | null>(null);

    const handleSearchClaimablePlayers = async (q: string) => {
        setClaimSearchQuery(q);
        if (!q.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const res = await searchMasterPlayers(q);
        setIsSearching(false);
        if (res.success && res.data) {
            // Filter to only players without user_id (unclaimed)
            setSearchResults((res.data as MasterPlayer[]).filter(mp => !(mp as MasterPlayer & { user_id?: string }).user_id));
        } else {
            setSearchResults([]);
        }
    };

    const handleClaimPlayer = async (targetPlayer: MasterPlayer) => {
        setError(null);
        setSuccess(false);
        setClaimingPlayerId(targetPlayer.id);

        startTransition(async () => {
            const res = await claimMasterPlayer(targetPlayer.id);
            setClaimingPlayerId(null);
            if (res.success && res.data) {
                setSuccess(true);
                setMasterPlayer(res.data as MasterPlayer);
            } else {
                setError(res.error || "Failed to claim player profile");
            }
        });
    };

    const handleOpenEdit = () => {
        setIsEditDialogOpen(true);
    };

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-all-tournaments-header",
                    popover: {
                        title: t("tour_welcome_title"),
                        description: t("tour_welcome_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-search-input",
                    popover: {
                        title: t("tour_search_title"),
                        description: t("tour_search_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-tournaments-list",
                    popover: {
                        title: t("tour_tournaments_title"),
                        description: t("tour_tournaments_desc"),
                        side: "top" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-player-card",
                    popover: {
                        title: t("tour_profile_title"),
                        description: t("tour_profile_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-edit-profile-btn") ? [{
                    element: "#tour-edit-profile-btn",
                    popover: {
                        title: t("tour_profile_edit_title"),
                        description: t("tour_profile_edit_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : []),
                ...(document.getElementById("tour-sidebar-nav") ? [{
                    element: "#tour-sidebar-nav",
                    popover: {
                        title: t("tour_sidebar_title"),
                        description: t("tour_sidebar_desc"),
                        side: "right" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_dashboard_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_dashboard_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    // Filter tournaments based on search query
    const filteredTournaments = initialTournaments.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const hasRequiredName = isThai
            ? (firstNameTh && lastNameTh)
            : (firstNameEn && lastNameEn);

        if (!hasRequiredName || !gender || !birthday) {
            setError(t("required_fields_error"));
            return;
        }

        const formData = new FormData();
        formData.append("firstNameTh", firstNameTh);
        formData.append("middleNameTh", middleNameTh);
        formData.append("lastNameTh", lastNameTh);
        formData.append("firstNameEn", firstNameEn);
        formData.append("middleNameEn", middleNameEn);
        formData.append("lastNameEn", lastNameEn);
        formData.append("gender", gender);
        formData.append("birthday", birthday);
        formData.append("tel", tel);
        formData.append("favoriteSportId", favoriteSportId);
        formData.append("preferredHand", preferredHand);
        formData.append("preferredFoot", preferredFoot);

        startTransition(async () => {
            const res = await createMasterPlayer(formData);
            if (res.success && res.data) {
                let updatedMasterPlayer = res.data as MasterPlayer;
                if (createPhotoFile && updatedMasterPlayer.id) {
                    const photoFormData = new FormData();
                    photoFormData.append("photo", createPhotoFile);
                    const photoRes = await updateGlobalPlayerPhoto(updatedMasterPlayer.id, photoFormData);
                    if (photoRes.success && photoRes.data) {
                        const photoData = photoRes.data as unknown as { profile_img?: string };
                        if (photoData.profile_img) {
                            updatedMasterPlayer = {
                                ...updatedMasterPlayer,
                                profile_img: photoData.profile_img
                            };
                        }
                    }
                }
                setSuccess(true);
                setMasterPlayer(updatedMasterPlayer);
            } else {
                setError(res.error || t("registration_error"));
            }
        });
    };

    return (
        <div className="animate-in fade-in duration-300">
            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-4 items-start">

                {/* Left Column: Tournament Listing (8 cols) */}
                <div className="lg:col-span-8 space-y-2 md:space-y-4 order-2 lg:order-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 bg-background">
                        <div className="flex items-center gap-1 md:gap-2">
                            <Header level={2}>{t("all_tournaments")}</Header>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={startTour}
                            >
                                <HelpCircle className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Search input */}
                        <div className="relative w-full md:w-128">
                            <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
                            <Input
                                type="search"
                                name="q"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                id="tour-search-input"
                                className="bg-card"
                                placeholder={isThai ? "พิมพ์ชื่อการแข่งขัน..." : "Search tournaments..."}
                            />
                        </div>
                    </div>

                    {/* Tournaments Grid */}
                    {loadingStats ? (
                        <div className="flex flex-col gap-2 md:gap-4">
                            {[...Array(2)].map((_, idx) => (
                                <div key={idx} className="bg-card border rounded-sm p-2 md:p-4 flex gap-2 md:gap-4">
                                    <div className="flex gap-2 md:gap-4 flex-1">
                                        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                                        <div className="flex flex-col gap-2 justify-center flex-1">
                                            <Skeleton className="h-5 w-1/3 rounded-sm" />
                                            <Skeleton className="h-4 w-1/4 rounded-sm" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0 items-center">
                                        <Skeleton className="h-8 w-8 rounded-sm" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3.5 w-12 rounded-sm" />
                                            <Skeleton className="h-4 w-28 rounded-sm" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTournaments.length === 0 ? (
                        <EmptyState
                            title={t("no_tournaments_found")}
                            description={t("no_tournaments_found_desc")}
                            icon={Trophy}
                            className="bg-card rounded-sm border"
                        />
                    ) : (
                        <div className="flex flex-col gap-2 md:gap-4 group" id="tour-tournaments-list">
                            {filteredTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/dashboard/registrations/${tournament.id}`} className="block">
                                    <Card
                                        className="flex flex-col h-full bg-card border rounded-sm transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer"
                                    >
                                        <CardContent className="flex justify-between py-2 md:py-4 relative z-10">
                                            <div className="flex items-center gap-1 md:gap-2 overflow-hidden">
                                                <Avatar className="h-12 w-12 border rounded-full group-hover:border-primary/30 transition-all shrink-0 p-1 bg-muted/30">
                                                    <AvatarImage src={tournament.logo_img ?? undefined} alt={tournament.name ?? ""} className="object-contain rounded-full" />
                                                    <AvatarFallback className="bg-primary/5 text-primary font-black rounded-full">{tournament.name ? tournament.name.substring(0, 2).toUpperCase() : ""}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-1">
                                                    <CardTitle className="text-lg font-black leading-none tracking-tight group-hover:text-primary transition-colors truncate">
                                                        {tournament.name}
                                                    </CardTitle>
                                                    <CardDescription className="capitalize">
                                                        {t("status")}: {tCommon(tournament.status || 'draft')}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-4">
                                                <div className="flex gap-2">
                                                    <div className="h-8 w-8 bg-muted border border-border flex items-center justify-center rounded-sm text-primary">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">{t("schedule")}</p>
                                                        <p className="text-xs font-bold truncate">
                                                            {tournament.start_date && tournament.end_date ? (
                                                                `${new Date(tournament.start_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })} - ${new Date(tournament.end_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`
                                                            ) : (
                                                                t("not_specified")
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Master Player Card (4 cols) */}
                <div className="lg:col-span-4 space-y-2 md:space-y-4 order-1 lg:order-2">
                    <div className="bg-card border rounded-sm" id="tour-player-card">
                        {loadingStats ? (
                            /* Player ID Card Skeleton */
                            <div className="relative overflow-hidden">
                                {/* License Header Skeleton */}
                                <div className="flex items-center justify-between border-b p-2 md:p-4">
                                    <Header level={3}>{t("player_verify")}</Header>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-8 rounded-sm" />
                                        <Skeleton className="h-5 w-16 rounded-sm" />
                                    </div>
                                </div>

                                {/* Main Body Skeleton */}
                                <div className="flex flex-col items-center space-y-3 p-2 md:p-4">
                                    <Skeleton className="h-20 w-20 rounded-full" />
                                    <div className="space-y-2 flex flex-col items-center">
                                        <Skeleton className="h-5 w-36 rounded-sm" />
                                        <Skeleton className="h-4.5 w-16 rounded-sm" />
                                    </div>
                                </div>

                                {/* Details list Skeleton */}
                                <div className="border-t">
                                    <div className="flex items-center justify-between p-2 md:p-4 border-b">
                                        <Skeleton className="h-4 w-16 rounded-sm" />
                                        <Skeleton className="h-4 w-12 rounded-sm" />
                                    </div>
                                    <div className="flex items-center justify-between p-2 md:p-4 border-b">
                                        <Skeleton className="h-4 w-16 rounded-sm" />
                                        <Skeleton className="h-4 w-28 rounded-sm" />
                                    </div>
                                    <div className="flex items-center justify-between p-2 md:p-4">
                                        <Skeleton className="h-4 w-16 rounded-sm" />
                                        <Skeleton className="h-4 w-24 rounded-sm" />
                                    </div>
                                </div>
                            </div>
                        ) : masterPlayer ? (
                            /* Player ID Card */
                            <div className="relative overflow-hidden">
                                {/* License Header */}
                                <div className="flex items-center justify-between border-b p-2 md:p-4">
                                    <Header level={3}>{t("player_verify")}</Header>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={handleOpenEdit}
                                            id="tour-edit-profile-btn"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Badge className={`${masterPlayer.verified
                                            ? "bg-primary"
                                            : "bg-warning"
                                            }`}>
                                            {masterPlayer.verified ? (
                                                <>
                                                    <UserCheck className="h-3 w-3" />
                                                    {t("verified")}
                                                </>
                                            ) : (
                                                <>
                                                    <Activity className="h-3 w-3 animate-pulse" />
                                                    {t("pending")}
                                                </>
                                            )}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Main Body */}
                                <div className="flex flex-col items-center text-center space-y-1 md:space-y-2 p-2 md:p-4 relative z-10">
                                    <div className="relative">
                                        <Avatar className="h-20 w-20 border relative z-10 rounded-full">
                                            {masterPlayer.profile_img && <AvatarImage src={masterPlayer.profile_img} alt="Avatar" className="object-cover" />}
                                            <AvatarFallback className="font-black text-2xl">
                                                {`${(masterPlayer.first_name_en || masterPlayer.first_name_th || "?")[0]}${(masterPlayer.last_name_en || masterPlayer.last_name_th || "?")[0]}`}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    <div className="space-y-1 md:space-y-2">
                                        <Header level={4}>
                                            {isThai
                                                ? `${masterPlayer.first_name_th || masterPlayer.first_name_en || ""} ${masterPlayer.last_name_th || masterPlayer.last_name_en || ""}`
                                                : `${masterPlayer.first_name_en || masterPlayer.first_name_th || ""} ${masterPlayer.last_name_en || masterPlayer.last_name_th || ""}`}
                                        </Header>
                                        <div className="flex flex-wrap items-center justify-center gap-1 lg:gap-2">
                                            {masterPlayer.preferred_hand && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {isThai ? "มือ" : "Hand"}: {masterPlayer.preferred_hand === 'right' ? (isThai ? 'ขวา' : 'Right') : masterPlayer.preferred_hand === 'left' ? (isThai ? 'ซ้าย' : 'Left') : (isThai ? 'สองข้าง' : 'Both')}
                                                </Badge>
                                            )}
                                            {masterPlayer.preferred_foot && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {isThai ? "เท้า" : "Foot"}: {masterPlayer.preferred_foot === 'right' ? (isThai ? 'ขวา' : 'Right') : masterPlayer.preferred_foot === 'left' ? (isThai ? 'ซ้าย' : 'Left') : (isThai ? 'สองข้าง' : 'Both')}
                                                </Badge>
                                            )}
                                            {masterPlayer.favorite_sport_id && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {sportsList.find(s => s.id === masterPlayer.favorite_sport_id)?.sport_name || (isThai ? "กีฬาที่ชอบ" : "Favorite Sport")}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Details / Stats section */}
                                <div className="border-t relative z-10 p-2 md:p-4 space-y-1 md:space-y-2">
                                    {/* Stats Grid */}
                                    {stats ? (
                                        <>
                                            <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
                                                <div className="p-2 rounded-sm border transition-all">
                                                    <Label className="block text-[10px] md:text-xs text-muted-foreground">{t("goals")}</Label>
                                                    <span className="text-base md:text-lg font-bold">{stats.goals}</span>
                                                </div>
                                                <div className="p-2 rounded-sm border transition-all">
                                                    <Label className="block text-[10px] md:text-xs text-muted-foreground">{t("assists")}</Label>
                                                    <span className="text-base md:text-lg font-bold">{stats.assists}</span>
                                                </div>
                                                <div className="p-2 rounded-sm border transition-all">
                                                    <Label className="block text-[10px] md:text-xs text-muted-foreground">{t("saves")}</Label>
                                                    <span className="text-base md:text-lg font-bold">{stats.saves}</span>
                                                </div>
                                                <div className="p-2 rounded-sm border transition-all">
                                                    <Label className="block text-[10px] md:text-xs text-warning">{t("yellow")}</Label>
                                                    <span className="text-base md:text-lg font-bold">{stats.yellowCards}</span>
                                                </div>
                                                <div className="p-2 rounded-sm border transition-all">
                                                    <Label className="block text-[10px] md:text-xs text-destructive">{t("red")}</Label>
                                                    <span className="text-base md:text-lg font-bold">{stats.redCards}</span>
                                                </div>
                                                <div className="p-2 rounded-sm border transition-all">
                                                    <Label className="block text-[10px] md:text-xs text-muted-foreground">{t("injuries")}</Label>
                                                    <span className="text-base md:text-lg font-bold">{stats.injuries}</span>
                                                </div>
                                            </div>

                                            {/* Tournament History Table */}
                                            <div className="space-y-2 pt-2">
                                                {stats.history.length === 0 ? (
                                                    <EmptyState
                                                        description={t("no_history")}
                                                        className="bg-card rounded-sm border min-h-[80px]"
                                                    />
                                                ) : (
                                                    <div className="border rounded-lg overflow-hidden">
                                                        <table className="w-full text-[10px] text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b bg-muted/10">
                                                                    <th className="p-2 font-bold text-muted-foreground">{t("tournament_team")}</th>
                                                                    <th className="p-2 font-bold text-muted-foreground text-center" title="Goals">G</th>
                                                                    <th className="p-2 font-bold text-muted-foreground text-center" title="Assists">A</th>
                                                                    <th className="p-2 font-bold text-muted-foreground text-center" title="Saves">SV</th>
                                                                    <th className="p-2 font-bold text-muted-foreground text-center" title="Yellow Cards">Y</th>
                                                                    <th className="p-2 font-bold text-muted-foreground text-center" title="Red Cards">R</th>
                                                                    <th className="p-2 font-bold text-muted-foreground text-center" title="Injuries">INJ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {stats.history.map((h, idx) => (
                                                                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                                                                        <td className="p-2 font-medium">
                                                                            <div className="font-bold line-clamp-1">{h.tournamentName}</div>
                                                                            <div className="text-muted-foreground text-[9px]">{h.teamName}</div>
                                                                        </td>
                                                                        <td className="p-2 text-center">{h.goals}</td>
                                                                        <td className="p-2 text-center">{h.assists}</td>
                                                                        <td className="p-2 text-center">{h.saves}</td>
                                                                        <td className="p-2 text-center text-amber-500">{h.yellowCards}</td>
                                                                        <td className="p-2 text-center text-rose-500">{h.redCards}</td>
                                                                        <td className="p-2 text-center">{h.injuries}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 text-center text-xs text-muted-foreground">{t("unable_load_stats")}</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Create or Claim Master Player Card / Form */
                            <div className="relative overflow-hidden">
                                <div className="p-2 border-b bg-muted/10">
                                    <Tab
                                        options={[
                                            { value: "create", label: t("create_profile"), icon: UserCheck },
                                            { value: "claim", label: isThai ? "เชื่อมโยงโปรไฟล์นักกีฬา" : "Claim Player Profile", icon: LinkIcon },
                                        ]}
                                        value={activeFormTab}
                                        onChange={setActiveFormTab}
                                        fullWidth
                                    />
                                </div>

                                <div className="space-y-2 md:space-y-4">
                                    {error && (
                                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 m-4 animate-shake">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {success && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-xl text-xs flex items-start gap-2 m-4">
                                            <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{t("profile_created_success")}</span>
                                        </div>
                                    )}

                                    {activeFormTab === "create" ? (
                                        <form onSubmit={handleCreateProfile}>
                                            <div className="space-y-1 md:space-y-2 p-2 md:p-4">
                                                {/* Photo Uploader */}
                                                <div className="flex flex-col items-center justify-center space-y-1 pb-2">
                                                    <LogoUploader
                                                        id="create-profile-photo"
                                                        initialUrl={createPreviewUrl}
                                                        onFileChange={(file) => {
                                                            setCreatePhotoFile(file);
                                                            if (file) {
                                                                setCreatePreviewUrl(URL.createObjectURL(file));
                                                            } else {
                                                                setCreatePreviewUrl(null);
                                                            }
                                                        }}
                                                        onRemove={() => {
                                                            setCreatePhotoFile(null);
                                                            setCreatePreviewUrl(null);
                                                        }}
                                                        disabled={isPending}
                                                    />
                                                </div>
                                                {/* Thai Name */}
                                                <div className="space-y-1">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="space-y-1">
                                                            <Label>{t("first_name_th")} {isThai && <span className="text-destructive">*</span>}</Label>
                                                            <Input
                                                                id="firstNameTh"
                                                                type="text"
                                                                value={firstNameTh}
                                                                onChange={(e) => setFirstNameTh(e.target.value)}
                                                                placeholder={isThai ? "เช่น สมชาย" : "e.g. Somchai"}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("middle_name_th")}</Label>
                                                            <Input
                                                                id="middleNameTh"
                                                                type="text"
                                                                value={middleNameTh}
                                                                onChange={(e) => setMiddleNameTh(e.target.value)}
                                                                placeholder={isThai ? "ชื่อกลาง (ถ้ามี)" : "Middle name (optional)"}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("last_name_th")} {isThai && <span className="text-destructive">*</span>}</Label>
                                                            <Input
                                                                id="lastNameTh"
                                                                type="text"
                                                                value={lastNameTh}
                                                                onChange={(e) => setLastNameTh(e.target.value)}
                                                                placeholder={isThai ? "เช่น ใจดี" : "e.g. Jaidee"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* English Name */}
                                                <div className="space-y-1">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="space-y-1">
                                                            <Label>{t("first_name_en")} {!isThai && <span className="text-destructive">*</span>}</Label>
                                                            <Input
                                                                id="firstNameEn"
                                                                type="text"
                                                                value={firstNameEn}
                                                                onChange={(e) => setFirstNameEn(e.target.value)}
                                                                placeholder={isThai ? "เช่น Somchai" : "e.g. Somchai"}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("middle_name_en")}</Label>
                                                            <Input
                                                                id="middleNameEn"
                                                                type="text"
                                                                value={middleNameEn}
                                                                onChange={(e) => setMiddleNameEn(e.target.value)}
                                                                placeholder={isThai ? "Middle name (optional)" : "Middle name (optional)"}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("last_name_en")} {!isThai && <span className="text-destructive">*</span>}</Label>
                                                            <Input
                                                                id="lastNameEn"
                                                                type="text"
                                                                value={lastNameEn}
                                                                onChange={(e) => setLastNameEn(e.target.value)}
                                                                placeholder={isThai ? "เช่น Jaidee" : "e.g. Jaidee"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label>{t("phone_number")}</Label>
                                                    <Input
                                                        id="tel"
                                                        type="tel"
                                                        value={tel}
                                                        onChange={(e) => setTel(e.target.value)}
                                                        placeholder={isThai ? "เช่น 081-234-5678" : "e.g. 081-234-5678"}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label>{t("gender")} <span className="text-destructive">*</span></Label>
                                                    <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setGender("male")}
                                                            className={cn(
                                                                "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                gender === "male"
                                                                    ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                                                gender === "male" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                            )}>
                                                                <Mars className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ชาย" : "Male"}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setGender("female")}
                                                            className={cn(
                                                                "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                gender === "female"
                                                                    ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                                                gender === "female" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                            )}>
                                                                <Venus className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "หญิง" : "Female"}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label>{t("date_of_birth")} <span className="text-destructive">*</span></Label>
                                                    <div className="p-1 lg:p-2 border rounded-sm">
                                                        <div className="space-y-1 lg:space-y-2 select-none">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDobViewDate(subMonths(dobViewDate, 1))}
                                                                    className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                                                >
                                                                    <ChevronLeft className="h-4 w-4" />
                                                                </button>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs font-bold tracking-tight">
                                                                        {dobViewDate.toLocaleString(isThai ? 'th-TH' : 'en-US', { month: 'long' })}
                                                                    </span>
                                                                    <select
                                                                        value={dobViewDate.getFullYear()}
                                                                        onChange={(e) => setDobViewDate(setYear(dobViewDate, parseInt(e.target.value)))}
                                                                        className="text-xs font-bold bg-transparent border-none focus:outline-none cursor-pointer"
                                                                    >
                                                                        {birthYears.map((y: number) => (
                                                                            <option key={y} value={y} className="bg-card text-foreground">
                                                                                {isThai ? y + 543 : y}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDobViewDate(addMonths(dobViewDate, 1))}
                                                                    className="flex items-center justify-center p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                                                >
                                                                    <ChevronRight className="h-4 w-4" />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-7 text-center">
                                                                {(isThai ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => (
                                                                    <div key={i} className="text-xs font-bold text-muted-foreground">{d}</div>
                                                                ))}
                                                            </div>

                                                            <div className="grid grid-cols-7">
                                                                {dobCalendarDays.map((day: Date, idx: number) => {
                                                                    if (!day) return <div key={`empty-${idx}`} />;
                                                                    const dateStr = format(day, 'yyyy-MM-dd');
                                                                    const isSelected = birthday === dateStr;
                                                                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                                                    return (
                                                                        <button
                                                                            key={dateStr}
                                                                            type="button"
                                                                            onClick={() => setBirthday(dateStr)}
                                                                            className={cn(
                                                                                "h-8 w-full flex items-center justify-center text-xs rounded-sm transition-all relative",
                                                                                isSelected && "bg-primary/10 text-primary border border-primary/50 font-bold z-10",
                                                                                !isSelected && "hover:bg-muted text-foreground",
                                                                                isToday && !isSelected && "border text-muted-foreground"
                                                                            )}
                                                                        >
                                                                            {format(day, 'd')}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="flex items-center justify-between text-[11px] pt-1 lg:pt-2 border-t">
                                                                <span className="text-muted-foreground font-medium">
                                                                    {birthday
                                                                        ? (isThai ? `วันที่เลือก: ${formatDate(birthday, "d MMM yyyy", locale)}` : `Selected: ${formatDate(birthday, "d MMM yyyy", locale)}`)
                                                                        : (isThai ? "คลิกเพื่อเลือกวันเกิด" : "Click date to select")}
                                                                </span>
                                                                {birthday && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setBirthday("")}
                                                                        className="text-destructive font-bold hover:underline"
                                                                    >
                                                                        {isThai ? "ล้างค่า" : "Clear"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label>{isThai ? "กีฬาที่ชอบ" : "Favorite Sport"}</Label>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 lg:gap-2">
                                                        {sportsList.map((sport) => {
                                                            const isSelected = favoriteSportId === sport.id;
                                                            return (
                                                                <button
                                                                    key={sport.id}
                                                                    type="button"
                                                                    onClick={() => setFavoriteSportId(isSelected ? "" : sport.id)}
                                                                    className={cn(
                                                                        "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                        isSelected
                                                                            ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                            : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "p-2 rounded-full transition-colors",
                                                                        isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                                    )}>
                                                                        {getSportIcon(sport.sport_name, "h-4 w-4")}
                                                                    </div>
                                                                    <span className="text-xs font-bold truncate w-full transition-colors">{sport.sport_name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label>{isThai ? "มือที่ถนัด" : "Preferred Hand"}</Label>
                                                        <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCreateHand("left")}
                                                                className={cn(
                                                                    "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                    isCreateHandLeftSelected
                                                                        ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                                                    isCreateHandLeftSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                                )}>
                                                                    <span className="text-sm">✋</span>
                                                                </div>
                                                                <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างซ้าย" : "Left"}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCreateHand("right")}
                                                                className={cn(
                                                                    "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                    isCreateHandRightSelected
                                                                        ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                                                    isCreateHandRightSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                                )}>
                                                                    <span className="text-sm">✋</span>
                                                                </div>
                                                                <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างขวา" : "Right"}</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label>{isThai ? "เท้าที่ถนัด" : "Preferred Foot"}</Label>
                                                        <div className="grid grid-cols-2 gap-1 lg:gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCreateFoot("left")}
                                                                className={cn(
                                                                    "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                    isCreateFootLeftSelected
                                                                        ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                                                    isCreateFootLeftSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                                )}>
                                                                    <span className="text-sm">🦶</span>
                                                                </div>
                                                                <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างซ้าย" : "Left"}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCreateFoot("right")}
                                                                className={cn(
                                                                    "group flex flex-col items-center justify-center p-1 lg:p-2 rounded-sm border text-center transition-all cursor-pointer gap-1.5",
                                                                    isCreateFootRightSelected
                                                                        ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                                                                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-primary hover:bg-muted/30"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "p-2 rounded-full transition-colors leading-none flex items-center justify-center w-8 h-8",
                                                                    isCreateFootRightSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                                )}>
                                                                    <span className="text-sm">🦶</span>
                                                                </div>
                                                                <span className="text-xs font-bold truncate w-full transition-colors">{isThai ? "ข้างขวา" : "Right"}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                            <div className="border-t p-2 md:p-4">
                                                <Button
                                                    type="submit"
                                                    disabled={isPending}
                                                    className="w-full"
                                                >
                                                    {t("create_card")}
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        /* Claim Player Search & Form */
                                        <div className="p-2 md:p-4 space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-bold">{isThai ? "ค้นหาโปรไฟล์นักกีฬาที่มีอยู่ในระบบ" : "Search Existing Player Profile"}</Label>
                                                <div className="relative">
                                                    <Input
                                                        placeholder={isThai ? "พิมพ์ชื่อนักกีฬา (ภาษาไทย/อังกฤษ)..." : "Type player name (Thai/English)..."}
                                                        value={claimSearchQuery}
                                                        onChange={(e) => handleSearchClaimablePlayers(e.target.value)}
                                                        className="pl-9 h-9 text-xs"
                                                    />
                                                    {isSearching && (
                                                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {isThai
                                                        ? "หากเคยมีผู้จัดการทีมหรือผู้จัดแข่งขันสร้างโปรไฟล์นักกีฬาของคุณไว้ก่อนหน้านี้ สามารถค้นหาชื่อเพื่อเชื่อมโยงกับบัญชีของคุณได้ที่นี่"
                                                        : "If your profile was previously created by a team manager or tournament organizer, search for your name to claim ownership."}
                                                </p>
                                            </div>

                                            <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
                                                {claimSearchQuery.trim() && searchResults.length === 0 && !isSearching && (
                                                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-sm">
                                                        {isThai
                                                            ? `ไม่พบโปรไฟล์นักกีฬาที่ยังไม่มีผู้ครอบครองสำหรับ "${claimSearchQuery}"`
                                                            : `No unclaimed player profiles found matching "${claimSearchQuery}"`}
                                                    </div>
                                                )}

                                                {searchResults.map((player) => {
                                                    const nameTh = `${player.first_name_th || ''} ${player.middle_name_th || ''} ${player.last_name_th || ''}`.trim()
                                                    const nameEn = `${player.first_name_en || ''} ${player.middle_name_en || ''} ${player.last_name_en || ''}`.trim()
                                                    const displayName = nameTh || nameEn || (isThai ? "ไม่มีชื่อนักกีฬา" : "Unnamed Player")
                                                    const isClaiming = claimingPlayerId === player.id

                                                    return (
                                                        <div
                                                            key={player.id}
                                                            className="flex items-center justify-between p-3 rounded-sm border bg-background hover:border-primary/50 transition-all text-xs"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-9 w-9 border rounded-full shrink-0">
                                                                    {player.profile_img && <AvatarImage src={player.profile_img} alt={displayName} className="object-cover" />}
                                                                    <AvatarFallback className="font-bold text-xs">
                                                                        {displayName.charAt(0).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-foreground">{displayName}</span>
                                                                    {nameEn && nameTh && (
                                                                        <span className="text-[10px] text-muted-foreground">{nameEn}</span>
                                                                    )}
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {isThai ? "วันเกิด:" : "DOB:"} {player.birthday || '-'} | {isThai ? "โทร:" : "Phone:"} {player.tel || '-'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <Button
                                                                size="sm"
                                                                disabled={isPending || isClaiming}
                                                                onClick={() => handleClaimPlayer(player)}
                                                                className="h-8 text-xs font-bold gap-1 shrink-0"
                                                            >
                                                                {isClaiming ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <LinkIcon className="h-3.5 w-3.5" />
                                                                )}
                                                                {isClaiming ? (isThai ? "กำลังเชื่อมโยง..." : "Claiming...") : (isThai ? "เชื่อมโยงโปรไฟล์" : "Claim Profile")}
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Dialog */}
            <EditVerifyProfileDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                masterPlayer={masterPlayer}
                onSave={(updatedPlayer) => setMasterPlayer(updatedPlayer)}
            />
        </div>
    );
}
