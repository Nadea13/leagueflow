"use client";

import { useState, useEffect, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createMasterPlayer, getMasterPlayerStats } from "@/actions/common/user";
import { Link } from "@/i18n/routing";
import {
    Trophy, User, Calendar, Phone, Search,
    AlertCircle, Loader2, UserCheck, UserPlus, Activity, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Tournament } from "@/types";
import { EditVerifyProfileDialog } from "@/features/teams/edit-verify-profile-dialog";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [masterPlayer, setMasterPlayer] = useState(initialMasterPlayer);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        let active = true;
        if (masterPlayer?.id) {
            Promise.resolve().then(() => {
                if (active) setLoadingStats(true);
            });
            getMasterPlayerStats(masterPlayer.id).then((res) => {
                if (active) {
                    if (res.success && res.data) {
                        setStats(res.data);
                    }
                    setLoadingStats(false);
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

    // Edit profile state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleOpenEdit = () => {
        setIsEditDialogOpen(true);
    };

    const locale = useLocale();
    const isThai = locale === 'th';
    const t = useTranslations("Dashboard");
    const tCommon = useTranslations("Common");

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
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter">{t("all_tournaments")}</h1>

                        {/* Search input */}
                        <div className="relative w-full md:w-1/2">
                            <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
                            <Input
                                type="search"
                                name="q"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tournaments Grid */}
                    {filteredTournaments.length === 0 ? (
                        <EmptyState
                            title={t("no_tournaments_found")}
                            description={t("no_tournaments_found_desc")}
                            icon={Trophy}
                            className="bg-card"
                        />
                    ) : (
                        <div className="flex flex-col gap-4 md:gap-6 group">
                            {filteredTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/dashboard/registration/${tournament.id}`} className="block">
                                    <Card
                                        className="flex flex-col h-full bg-card border rounded-lg transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer"
                                    >
                                        <CardContent className="flex py-2 md:py-4 relative z-10 gap-2 md:gap-4">
                                            <div className="flex gap-2 md:gap-4 overflow-hidden">
                                                <Avatar className="h-14 w-14 border rounded-full group-hover:border-primary/30 transition-all shrink-0 p-1 bg-muted/30">
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
                                            <div className="flex gap-2 md:gap-4">
                                                <div className="flex gap-2">
                                                    <div className="h-8 w-8 bg-muted border border-border flex items-center justify-center rounded-sm text-primary">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">{t("schedule")}</p>
                                                        <p className="text-xs font-bold text-foreground truncate">
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
                    <div className="bg-card rounded-xl">
                        {masterPlayer ? (
                        /* Player ID Card */
                        <div className="relative overflow-hidden">
                            {/* License Header */}
                            <div className="flex items-center justify-between border-b p-2 md:p-4">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <span className="font-black text-foreground leading-tight">{t("player_verify")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={handleOpenEdit}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Badge className={`px-2.5 h-6 rounded-full text-[10px] font-black ${masterPlayer.verified
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        }`}>
                                        {masterPlayer.verified ? (
                                            <>
                                                <UserCheck className="h-3 w-3 mr-1" />
                                                {t("verified")}
                                            </>
                                        ) : (
                                            <>
                                                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                                                {t("pending")}
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </div>

                            {/* Main Body */}
                            <div className="flex flex-col items-center text-center space-y-2 md:space-y-4 p-2 md:p-4 relative z-10">
                                <div className="relative">
                                    <Avatar className="h-20 w-20 border-2 bg-background relative z-10 rounded-full">
                                        {masterPlayer.profile_img && <AvatarImage src={masterPlayer.profile_img} alt="Avatar" className="object-cover" />}
                                        <AvatarFallback className="font-black text-foreground text-xl">
                                            {`${(masterPlayer.first_name_en || masterPlayer.first_name_th || "?")[0]}${(masterPlayer.last_name_en || masterPlayer.last_name_th || "?")[0]}`}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-foreground leading-tight">
                                        {isThai 
                                            ? `${masterPlayer.first_name_th || masterPlayer.first_name_en || ""} ${masterPlayer.last_name_th || masterPlayer.last_name_en || ""}`
                                            : `${masterPlayer.first_name_en || masterPlayer.first_name_th || ""} ${masterPlayer.last_name_en || masterPlayer.last_name_th || ""}`}
                                    </h3>
                                    <p className="text-xs text-primary mt-1 tracking-widest font-bold">
                                        {t("status")} : {masterPlayer.status}
                                    </p>
                                </div>
                            </div>

                            {/* Details list */}
                            <div className="border-t relative z-10">
                                <div className="flex items-center justify-between text-xs border-b p-2 md:p-4">
                                    <span className="flex items-center gap-2 md:gap-4">
                                        <User className="h-4 w-4 text-primary" />
                                        {t("gender")}
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {t(masterPlayer.gender || 'other')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs border-b border-border p-2 md:p-4">
                                    <span className="flex items-center gap-2 md:gap-4 text-muted-foreground">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        {t("birthday")}
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {masterPlayer.birthday ? new Date(masterPlayer.birthday).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "-"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs p-2 md:p-4">
                                    <span className="flex items-center gap-2 md:gap-4 text-muted-foreground">
                                        <Phone className="h-4 w-4 text-primary" />
                                        {t("phone")}
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {masterPlayer.tel || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Create Master Player Card / Form */
                        <div className="border relative overflow-hidden rounded-xl">
                            <div className="flex flex-row items-center gap-2 md:gap-4 p-2 md:p-4 border-b">
                                <UserPlus className="h-5 w-5 text-primary" />
                                <span className="font-black text-foreground leading-tight">{t("create_profile")}</span>
                            </div>

                            <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                                {error && (
                                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-shake">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-xl text-xs flex items-start gap-2 mb-4">
                                        <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{t("profile_created_success")}</span>
                                    </div>
                                )}

                                <form onSubmit={handleCreateProfile} className="space-y-4">
                                    {/* Thai Name */}
                                    <div className="space-y-2 border-b pb-3">
                                        <h4 className="text-xs font-bold text-primary tracking-wider uppercase">{t("thai_name")}</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">{t("first_name_th")} {isThai && <span className="text-destructive">*</span>}</Label>
                                                <Input
                                                    id="firstNameTh"
                                                    type="text"
                                                    value={firstNameTh}
                                                    onChange={(e) => setFirstNameTh(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">{t("middle_name_th")}</Label>
                                                <Input
                                                    id="middleNameTh"
                                                    type="text"
                                                    value={middleNameTh}
                                                    onChange={(e) => setMiddleNameTh(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">{t("last_name_th")} {isThai && <span className="text-destructive">*</span>}</Label>
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
                                    <div className="space-y-2 border-b pb-3">
                                        <h4 className="text-xs font-bold text-primary tracking-wider uppercase">{t("english_name")}</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">{t("first_name_en")} {!isThai && <span className="text-destructive">*</span>}</Label>
                                                <Input
                                                    id="firstNameEn"
                                                    type="text"
                                                    value={firstNameEn}
                                                    onChange={(e) => setFirstNameEn(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">{t("middle_name_en")}</Label>
                                                <Input
                                                    id="middleNameEn"
                                                    type="text"
                                                    value={middleNameEn}
                                                    onChange={(e) => setMiddleNameEn(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground">{t("last_name_en")} {!isThai && <span className="text-destructive">*</span>}</Label>
                                                <Input
                                                    id="lastNameEn"
                                                    type="text"
                                                    value={lastNameEn}
                                                    onChange={(e) => setLastNameEn(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
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

                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t("registering")}
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="h-4 w-4" />
                                                {t("create_card")}
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                    </div>

                    {masterPlayer && (
                        <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col animate-in fade-in duration-200">
                            <div className="p-2 md:p-4 border-b flex items-center justify-between">
                                <span className="font-black text-foreground leading-tight flex items-center gap-2">
                                    {t("player_statistics")}
                                </span>
                            </div>
                            
                            {loadingStats ? (
                                <div className="flex items-center justify-center p-8 text-xs text-muted-foreground/60 gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span>{t("loading_stats")}</span>
                                </div>
                            ) : stats ? (
                                <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
                                        <div className="p-2 rounded-lg border bg-card hover:bg-muted/5 transition-all">
                                            <span className="text-[10px] font-bold text-muted-foreground block">{t("goals")}</span>
                                            <span className="text-base md:text-lg text-foreground">{stats.goals}</span>
                                        </div>
                                        <div className="p-2 rounded-lg border bg-card hover:bg-muted/5 transition-all">
                                            <span className="text-[10px] font-bold text-muted-foreground block">{t("assists")}</span>
                                            <span className="text-base md:text-lg text-foreground">{stats.assists}</span>
                                        </div>
                                        <div className="p-2 rounded-lg border bg-card hover:bg-muted/5 transition-all">
                                            <span className="text-[10px] font-bold text-muted-foreground block">{t("saves")}</span>
                                            <span className="text-base md:text-lg text-foreground">{stats.saves}</span>
                                        </div>
                                        <div className="p-2 rounded-lg border bg-card hover:bg-muted/5 transition-all">
                                            <span className="text-[10px] font-bold text-muted-foreground block">{t("yellow")}</span>
                                            <span className="text-base md:text-lg text-amber-500">{stats.yellowCards}</span>
                                        </div>
                                        <div className="p-2 rounded-lg border bg-card hover:bg-muted/5 transition-all">
                                            <span className="text-[10px] font-bold text-muted-foreground block">{t("red")}</span>
                                            <span className="text-base md:text-lg text-rose-500">{stats.redCards}</span>
                                        </div>
                                        <div className="p-2 rounded-lg border bg-card hover:bg-muted/5 transition-all">
                                            <span className="text-[10px] font-bold text-muted-foreground block">{t("injuries")}</span>
                                            <span className="text-base md:text-lg text-foreground">{stats.injuries}</span>
                                        </div>
                                    </div>

                                    {/* Tournament History Table */}
                                    <div className="space-y-2">
                                        {stats.history.length === 0 ? (
                                            <div className="text-center p-4 border border-dashed rounded-lg text-xs text-muted-foreground/60">
                                                {t("no_history")}
                                            </div>
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
                                                                    <div className="font-bold text-foreground line-clamp-1">{h.tournamentName}</div>
                                                                    <div className="text-muted-foreground text-[9px]">{h.teamName}</div>
                                                                </td>
                                                                <td className="p-2 text-center text-foreground">{h.goals}</td>
                                                                <td className="p-2 text-center text-foreground">{h.assists}</td>
                                                                <td className="p-2 text-center text-foreground">{h.saves}</td>
                                                                <td className="p-2 text-center text-amber-500">{h.yellowCards}</td>
                                                                <td className="p-2 text-center text-rose-500">{h.redCards}</td>
                                                                <td className="p-2 text-center text-foreground">{h.injuries}</td>
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
