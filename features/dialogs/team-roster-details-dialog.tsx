"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Registration } from "@/types/index";
import { getTournamentPlayersDirect } from "@/actions/tournaments/player";
import { getTournamentTeamRoster } from "@/actions/tournaments/staff";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Header } from "@/components/ui/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tab } from "@/components/ui/tab";
import { Loader2, Phone, User, Users, Clock, LayoutGrid, List } from "lucide-react";

export interface TeamPlayerItem {
    id: string;
    name: string;
    shirt_number?: number | string | null;
    position?: string | null;
    tel?: string | null;
    photo_url?: string | null;
    status?: string | null;
}

interface TeamRosterDetailsDialogProps {
    team: Registration | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TeamRosterDetailsDialog({
    team,
    open,
    onOpenChange,
}: TeamRosterDetailsDialogProps) {
    const locale = useLocale();
    const [players, setPlayers] = useState<TeamPlayerItem[]>([]);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
    const [rosterViewMode, setRosterViewMode] = useState<"list" | "grid">("list");

    const getInitials = (name?: string | null) => {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    useEffect(() => {
        if (!team || !open) {
            setPlayers([]);
            return;
        }

        const teamId = team.tournament_team_id || team.id;
        if (!teamId) return;

        let isMounted = true;
        setIsLoadingPlayers(true);

        const loadPlayers = async () => {
            try {
                const [directRes, rosterRes] = await Promise.all([
                    getTournamentPlayersDirect(teamId),
                    getTournamentTeamRoster(teamId)
                ]);

                if (!isMounted) return;

                const playerMap = new Map<string, TeamPlayerItem>();

                if (directRes.success && directRes.data) {
                    for (const p of directRes.data) {
                        const key = (p.name || '').trim().toLowerCase();
                        if (!key) continue;
                        playerMap.set(key, {
                            id: p.id,
                            name: p.name,
                            shirt_number: p.number,
                            position: p.position,
                            photo_url: p.photo_url,
                            tel: p.tel,
                            status: p.status || 'approved'
                        });
                    }
                }

                if (rosterRes.success && rosterRes.data) {
                    for (const r of rosterRes.data) {
                        const key = (r.name || '').trim().toLowerCase();
                        if (!key) continue;
                        if (!playerMap.has(key)) {
                            playerMap.set(key, {
                                id: r.id,
                                name: r.name,
                                shirt_number: r.shirt_number,
                                position: r.position,
                                photo_url: r.photo_url,
                                tel: r.tel,
                                status: r.status
                            });
                        }
                    }
                }

                setPlayers(Array.from(playerMap.values()));
            } catch (e) {
                console.error("Error loading team details players:", e);
            } finally {
                if (isMounted) {
                    setIsLoadingPlayers(false);
                }
            }
        };

        loadPlayers();

        const interval = setInterval(async () => {
            try {
                const [directRes, rosterRes] = await Promise.all([
                    getTournamentPlayersDirect(teamId),
                    getTournamentTeamRoster(teamId)
                ]);

                if (!isMounted) return;

                const playerMap = new Map<string, TeamPlayerItem>();

                if (directRes.success && directRes.data) {
                    for (const p of directRes.data) {
                        const key = (p.name || '').trim().toLowerCase();
                        if (!key) continue;
                        playerMap.set(key, {
                            id: p.id,
                            name: p.name,
                            shirt_number: p.number,
                            position: p.position,
                            photo_url: p.photo_url,
                            tel: p.tel,
                            status: p.status || 'approved'
                        });
                    }
                }

                if (rosterRes.success && rosterRes.data) {
                    for (const r of rosterRes.data) {
                        const key = (r.name || '').trim().toLowerCase();
                        if (!key) continue;
                        if (!playerMap.has(key)) {
                            playerMap.set(key, {
                                id: r.id,
                                name: r.name,
                                shirt_number: r.shirt_number,
                                position: r.position,
                                photo_url: r.photo_url,
                                tel: r.tel,
                                status: r.status
                            });
                        }
                    }
                }

                const newPlayers = Array.from(playerMap.values());
                setPlayers(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(newPlayers)) {
                        return newPlayers;
                    }
                    return prev;
                });
            } catch (e) {
                console.error("Error refreshing team details players:", e);
            }
        }, 2500);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [team, open]);

    if (!team) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-card p-0 rounded-none sm:rounded-sm shadow-2xl overflow-hidden border border-border flex flex-col">
                {/* Header - Strictly p-4, text-only, no header icons */}
                <DialogHeader className="p-4 border-b border-border bg-card shrink-0">
                    <DialogTitle className="text-lg md:text-xl font-black tracking-tighter text-foreground leading-none">
                        {locale === 'th' ? "ข้อมูลทีมและรายชื่อนักกีฬา" : "Team & Roster Details"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                        {(team as any).category_name
                            ? (locale === 'th' ? `รุ่นการแข่งขัน: ${(team as any).category_name}` : `Category: ${(team as any).category_name}`)
                            : (locale === 'th' ? "รายละเอียดทีมและรายชื่อนักกีฬาที่เข้าร่วมการแข่งขัน" : "Team information and registered athlete roster")}
                    </DialogDescription>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    {/* 1. TOP SECTION: Team Information */}
                    <div className="p-4 rounded-sm border border-border bg-transparent space-y-3">
                        <div className="flex items-start sm:items-center gap-3.5">
                            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-border bg-transparent shrink-0 p-1">
                                {team.logo_url && (
                                    <AvatarImage
                                        src={team.logo_url}
                                        alt={team.team_name}
                                        className="object-contain rounded-full"
                                    />
                                )}
                                <AvatarFallback className="text-base font-black bg-primary/10 text-primary rounded-full">
                                    {getInitials(team.team_name)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground truncate">
                                        {team.team_name}
                                    </h3>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] font-bold px-2 py-0.5",
                                            team.payment_status === 'PAID'
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                                : team.payment_status === 'REJECTED'
                                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                        )}
                                    >
                                        {team.payment_status === 'PAID'
                                            ? (locale === 'th' ? "อนุมัติแล้ว" : "Approved")
                                            : team.payment_status === 'REJECTED'
                                            ? (locale === 'th' ? "ปฏิเสธ" : "Rejected")
                                            : (locale === 'th' ? "รอตรวจสอบ" : "Pending")}
                                    </Badge>
                                </div>

                                {team.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {team.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                                    {team.contact_name && (
                                        <div className="flex items-center gap-1.5 border border-border px-2 py-0.5 rounded-sm text-[11px]">
                                            <User className="h-4 w-4 text-primary shrink-0" />
                                            <span className="font-semibold text-foreground">{team.contact_name}</span>
                                        </div>
                                    )}
                                    {team.contact_phone && (
                                        <a
                                            href={`tel:${team.contact_phone}`}
                                            className="flex items-center gap-1.5 border border-border px-2 py-0.5 rounded-sm text-[11px] hover:border-primary/40 hover:text-primary transition-colors"
                                        >
                                            <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                                            <span className="font-bold tabular-nums">{team.contact_phone}</span>
                                        </a>
                                    )}
                                    {team.created_at && (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                                            <Clock className="h-4 w-4 shrink-0" />
                                            <span>
                                                {new Date(team.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. BOTTOM SECTION: Athletes Roster */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Header level={4}>
                                    {locale === 'th' ? "รายชื่อนักกีฬา" : "Roster"}
                                </Header>
                                {!isLoadingPlayers && (
                                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                                        {players.length} {locale === 'th' ? "คน" : "players"}
                                    </Badge>
                                )}
                            </div>

                            {players.length > 0 && !isLoadingPlayers && (
                                <Tab<"list" | "grid">
                                    options={[
                                        { value: "list", label: locale === 'th' ? "รายการ" : "List", icon: List },
                                        { value: "grid", label: locale === 'th' ? "การ์ด" : "Grid", icon: LayoutGrid },
                                    ]}
                                    value={rosterViewMode}
                                    onChange={setRosterViewMode}
                                    showLabels={false}
                                    size="sm"
                                />
                            )}
                        </div>

                        {isLoadingPlayers ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-2 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-xs">{locale === 'th' ? "กำลังโหลดรายชื่อนักกีฬา..." : "Loading roster..."}</span>
                            </div>
                        ) : players.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-sm bg-transparent text-center p-4">
                                <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                <p className="text-xs font-bold text-muted-foreground">
                                    {locale === 'th' ? "ยังไม่มีรายชื่อนักกีฬาในทีมนี้" : "No players registered in this team yet"}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                    {locale === 'th' ? "ทีมยังไม่ได้ส่งรายชื่อหรือเพิ่มนักกีฬา" : "The team has not submitted any players."}
                                </p>
                            </div>
                        ) : rosterViewMode === "grid" ? (
                            /* GRID VIEW */
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {players.map((player, idx) => (
                                    <div
                                        key={player.id || idx}
                                        className="p-3 border border-border rounded-sm bg-transparent flex flex-col items-center text-center gap-2 hover:border-primary/40 transition-colors relative"
                                    >
                                        {player.status && (
                                            <div className="absolute top-2 right-2">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[9px] font-semibold px-1.5 py-0",
                                                        player.status === 'approved' ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" :
                                                        player.status === 'rejected' ? "text-destructive border-destructive/30 bg-destructive/10" :
                                                        "text-amber-600 border-amber-500/30 bg-amber-500/10"
                                                    )}
                                                >
                                                    {player.status === 'approved' ? (locale === 'th' ? "อนุมัติ" : "Approved") :
                                                     player.status === 'rejected' ? (locale === 'th' ? "ปฏิเสธ" : "Rejected") :
                                                     (locale === 'th' ? "รอตรวจ" : "Pending")}
                                                </Badge>
                                            </div>
                                        )}

                                        <div className="relative mt-1">
                                            <Avatar className="h-14 w-14 rounded-full border border-border shrink-0 bg-transparent">
                                                {player.photo_url && (
                                                    <AvatarImage src={player.photo_url} alt={player.name} className="object-cover rounded-full" />
                                                )}
                                                <AvatarFallback className="text-xs font-bold bg-transparent">
                                                    {getInitials(player.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 rounded-sm bg-transparent border border-border flex items-center justify-center font-black text-[10px] text-foreground tabular-nums">
                                                {player.shirt_number !== null && player.shirt_number !== undefined && player.shirt_number !== ""
                                                    ? `#${player.shirt_number}`
                                                    : (idx + 1)}
                                            </div>
                                        </div>

                                        <div className="space-y-0.5 w-full min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate" title={player.name}>
                                                {player.name}
                                            </p>
                                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                                                {player.position && (
                                                    <span className="font-semibold text-primary">
                                                        {player.position}
                                                    </span>
                                                )}
                                                {player.tel && (
                                                    <>
                                                        {player.position && <span>•</span>}
                                                        <span className="tabular-nums">{player.tel}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* LIST VIEW */
                            <div className="border border-border rounded-sm divide-y divide-border bg-transparent overflow-hidden">
                                {players.map((player, idx) => (
                                    <div
                                        key={player.id || idx}
                                        className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-8 w-8 rounded-sm bg-transparent border border-border flex items-center justify-center font-black text-xs shrink-0">
                                                {player.shirt_number !== null && player.shirt_number !== undefined && player.shirt_number !== ""
                                                    ? `#${player.shirt_number}`
                                                    : (idx + 1)}
                                            </div>

                                            <Avatar className="h-8 w-8 rounded-full border border-border shrink-0 bg-transparent">
                                                {player.photo_url && (
                                                    <AvatarImage src={player.photo_url} alt={player.name} className="object-cover" />
                                                )}
                                                <AvatarFallback className="text-[10px] font-bold bg-transparent">
                                                    {getInitials(player.name)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">
                                                    {player.name}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    {player.position && (
                                                        <span className="font-semibold text-primary">
                                                            {player.position}
                                                        </span>
                                                    )}
                                                    {player.tel && (
                                                        <>
                                                            {player.position && <span>•</span>}
                                                            <span className="tabular-nums">{player.tel}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {player.status && (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-semibold shrink-0 px-2 py-0.5",
                                                    player.status === 'approved' ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" :
                                                    player.status === 'rejected' ? "text-destructive border-destructive/30 bg-destructive/10" :
                                                    "text-amber-600 border-amber-500/30 bg-amber-500/10"
                                                )}
                                            >
                                                {player.status === 'approved' ? (locale === 'th' ? "อนุมัติ" : "Approved") :
                                                 player.status === 'rejected' ? (locale === 'th' ? "ปฏิเสธ" : "Rejected") :
                                                 (locale === 'th' ? "รอตรวจ" : "Pending")}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
