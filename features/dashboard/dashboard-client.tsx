"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createMasterPlayer, getMasterPlayerStats, searchMasterPlayers, claimMasterPlayer } from "@/actions/common/user";
import { Link } from "@/i18n/routing";
import {
    Trophy, User, Calendar, Phone, Search, HelpCircle,
    AlertCircle, UserCheck, Activity, Edit, Link as LinkIcon, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tournament } from "@/types";
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
    initialTournaments: Partial<Tournament>[];
    initialMasterPlayer: MasterPlayer | null;
}

export function DashboardClient({ initialTournaments, initialMasterPlayer }: DashboardClientProps) {
    const locale = useLocale();
    const isThai = locale === 'th';
    const t = useTranslations("Dashboard");
    const tCommon = useTranslations("Common");

    const [searchQuery, setSearchQuery] = useState("");
    const [masterPlayer, setMasterPlayer] = useState(initialMasterPlayer);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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
    const [gender, setGender] = useState("male");
    const [birthday, setBirthday] = useState("");
    const [tel, setTel] = useState("");

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

        startTransition(async () => {
            const res = await createMasterPlayer(formData);
            if (res.success) {
                setSuccess(true);
                setMasterPlayer(res.data as MasterPlayer);
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
                                <Link key={tournament.id} href={`/dashboard/registration/${tournament.id}`} className="block">
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
                                        <Badge variant="outline">
                                            {masterPlayer.status}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Details list */}
                                <div className="border-t relative z-10">
                                    <div className="flex items-center justify-between text-xs border-b p-2 md:p-4">
                                        <Label className="gap-1 md:gap-2">
                                            <User className="h-4 w-4 text-primary" />
                                            {t("gender")}
                                        </Label>
                                        <Label>
                                            {t(masterPlayer.gender || 'other')}
                                        </Label>
                                    </div>
                                    <div className="flex items-center justify-between text-xs border-b border-border p-2 md:p-4">
                                        <Label className="gap-1 md:gap-2">
                                            <Calendar className="h-4 w-4 text-primary" />
                                            {t("birthday")}
                                        </Label>
                                        <Label>
                                            {masterPlayer.birthday ? new Date(masterPlayer.birthday).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "-"}
                                        </Label>
                                    </div>
                                    <div className="flex items-center justify-between text-xs p-2 md:p-4">
                                        <Label className="gap-1 md:gap-2">
                                            <Phone className="h-4 w-4 text-primary" />
                                            {t("phone")}
                                        </Label>
                                        <Label>
                                            {masterPlayer.tel || "-"}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Create or Claim Master Player Card / Form */
                            <div className="relative overflow-hidden">
                                <div className="flex border-b">
                                    <button
                                        type="button"
                                        onClick={() => setActiveFormTab("create")}
                                        className={`flex-1 py-3 px-4 text-xs font-bold transition-colors text-center border-r ${
                                            activeFormTab === "create"
                                                ? "bg-primary/10 text-primary border-b-2 border-b-primary"
                                                : "text-muted-foreground hover:text-foreground bg-muted/20"
                                        }`}
                                    >
                                        {t("create_profile")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveFormTab("claim")}
                                        className={`flex-1 py-3 px-4 text-xs font-bold transition-colors text-center flex items-center justify-center gap-1.5 ${
                                            activeFormTab === "claim"
                                                ? "bg-primary/10 text-primary border-b-2 border-b-primary"
                                                : "text-muted-foreground hover:text-foreground bg-muted/20"
                                        }`}
                                    >
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        Claim Player Profile
                                    </button>
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
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("middle_name_th")}</Label>
                                                            <Input
                                                                id="middleNameTh"
                                                                type="text"
                                                                value={middleNameTh}
                                                                onChange={(e) => setMiddleNameTh(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("last_name_th")} {isThai && <span className="text-destructive">*</span>}</Label>
                                                            <Input
                                                                id="lastNameTh"
                                                                type="text"
                                                                value={lastNameTh}
                                                                onChange={(e) => setLastNameTh(e.target.value)}
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
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("middle_name_en")}</Label>
                                                            <Input
                                                                id="middleNameEn"
                                                                type="text"
                                                                value={middleNameEn}
                                                                onChange={(e) => setMiddleNameEn(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label>{t("last_name_en")} {!isThai && <span className="text-destructive">*</span>}</Label>
                                                            <Input
                                                                id="lastNameEn"
                                                                type="text"
                                                                value={lastNameEn}
                                                                onChange={(e) => setLastNameEn(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1 md:gap-2">
                                                    <div className="space-y-1 flex flex-col justify-end">
                                                        <Label>{t("gender")} <span className="text-destructive">*</span></Label>
                                                        <Select value={gender} onValueChange={setGender}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder={t("select_gender")} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="male">{t("male")}</SelectItem>
                                                                <SelectItem value="female">{t("female")}</SelectItem>
                                                                <SelectItem value="other">{t("other")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>{t("date_of_birth")} <span className="text-destructive">*</span></Label>
                                                        <Input
                                                            id="birthday"
                                                            type="date"
                                                            required
                                                            value={birthday}
                                                            onChange={(e) => setBirthday(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label>{t("phone_number")}</Label>
                                                    <Input
                                                        id="tel"
                                                        type="tel"
                                                        value={tel}
                                                        onChange={(e) => setTel(e.target.value)}
                                                    />
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
                                                <Label className="text-xs font-bold">Search Existing Player Profile</Label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Type player name (Thai/English)..."
                                                        value={claimSearchQuery}
                                                        onChange={(e) => handleSearchClaimablePlayers(e.target.value)}
                                                        className="pl-9 h-9 text-xs"
                                                    />
                                                    {isSearching && (
                                                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">
                                                    If your profile was previously created by a team manager or tournament organizer, search for your name to claim ownership.
                                                </p>
                                            </div>

                                            <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
                                                {claimSearchQuery.trim() && searchResults.length === 0 && !isSearching && (
                                                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-sm">
                                                        No unclaimed player profiles found matching &quot;{claimSearchQuery}&quot;
                                                    </div>
                                                )}

                                                {searchResults.map((player) => {
                                                    const nameTh = `${player.first_name_th || ''} ${player.middle_name_th || ''} ${player.last_name_th || ''}`.trim()
                                                    const nameEn = `${player.first_name_en || ''} ${player.middle_name_en || ''} ${player.last_name_en || ''}`.trim()
                                                    const displayName = nameTh || nameEn || "Unnamed Player"
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
                                                                        DOB: {player.birthday || '-'} | Phone: {player.tel || '-'}
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
                                                                Claim Player
                                                            </Button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {masterPlayer && (
                        <div className="bg-card border rounded-sm overflow-hidden shadow-sm flex flex-col animate-in fade-in duration-200">
                            <div className="p-2 md:p-4 border-b flex items-center justify-between">
                                <Header level={3}>{t("player_statistics")}</Header>
                            </div>

                            {loadingStats ? (
                                <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                                    {/* Stats Grid Skeleton */}
                                    <div className="grid grid-cols-3 gap-1 md:gap-2">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="p-2 rounded-sm border flex flex-col items-center justify-center space-y-2 h-[58px]">
                                                <Skeleton className="h-3 w-12 rounded-sm" />
                                                <Skeleton className="h-4 w-6 rounded-sm" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Tournament History Table Skeleton */}
                                    <div className="space-y-2">
                                        <div className="border rounded-sm overflow-hidden p-2 space-y-3">
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <Skeleton className="h-3 w-24 rounded-sm" />
                                                <div className="flex gap-4">
                                                    <Skeleton className="h-3 w-4 rounded-sm" />
                                                    <Skeleton className="h-3 w-4 rounded-sm" />
                                                    <Skeleton className="h-3 w-4 rounded-sm" />
                                                </div>
                                            </div>
                                            {[...Array(2)].map((_, i) => (
                                                <div key={i} className="flex justify-between items-center py-1">
                                                    <div className="space-y-1">
                                                        <Skeleton className="h-3.5 w-32 rounded-sm" />
                                                        <Skeleton className="h-2.5 w-16 rounded-sm" />
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <Skeleton className="h-3.5 w-4 rounded-sm" />
                                                        <Skeleton className="h-3.5 w-4 rounded-sm" />
                                                        <Skeleton className="h-3.5 w-4 rounded-sm" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : stats ? (
                                <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
                                        <div className="p-2 rounded-sm border transition-all">
                                            <Label className="block">{t("goals")}</Label>
                                            <span className="text-base md:text-lg">{stats.goals}</span>
                                        </div>
                                        <div className="p-2 rounded-sm border transition-all">
                                            <Label className="block">{t("assists")}</Label>
                                            <span className="text-base md:text-lg">{stats.assists}</span>
                                        </div>
                                        <div className="p-2 rounded-sm border transition-all">
                                            <Label className="block">{t("saves")}</Label>
                                            <span className="text-base md:text-lg">{stats.saves}</span>
                                        </div>
                                        <div className="p-2 rounded-sm border transition-all">
                                            <Label className="block text-warning">{t("yellow")}</Label>
                                            <span className="text-base md:text-lg">{stats.yellowCards}</span>
                                        </div>
                                        <div className="p-2 rounded-sm border transition-all">
                                            <Label className="block text-destructive">{t("red")}</Label>
                                            <span className="text-base md:text-lg">{stats.redCards}</span>
                                        </div>
                                        <div className="p-2 rounded-sm border transition-all">
                                            <Label className="block">{t("injuries")}</Label>
                                            <span className="text-base md:text-lg">{stats.injuries}</span>
                                        </div>
                                    </div>

                                    {/* Tournament History Table */}
                                    <div className="space-y-2">
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
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-muted-foreground">{t("unable_load_stats")}</div>
                            )}
                        </div>
                    )}
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
