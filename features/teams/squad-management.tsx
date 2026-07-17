'use client';

import React, { useState, useCallback, useEffect } from "react";
import { Player, Team, Registration, Tournament } from "@/types/index";
import { cn } from "@/lib/utils";
import { getPlayers, deletePlayer, importRoster, toggleRosterLock } from "@/actions/manager/team";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Users, AlertCircle, Lock, Unlock, LayoutGrid, ArrowLeft, HelpCircle } from "lucide-react";
import { Tab } from "@/components/ui/tab";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddPlayerForm } from "@/features/teams/add-player-form";
import { AddPlayersDialog } from "@/features/teams/add-players-dialog";
import { EditTeamForm } from "@/features/teams/edit-team-form";
import { SquadList } from "@/features/teams/squad-list";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

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

interface SquadManagementProps {
    team: Team & {
        participations?: { tournament_id: string }[];
        registrations?: Registration[];
        is_roster_locked?: boolean;
        isParticipation?: boolean;
        tournament?: Tournament;
        team_id?: string | null;
        roster_status?: string | null;
        unlock_requested?: boolean;
    };
    initialPlayers: Player[];
}

export function SquadManagement({ team, initialPlayers }: SquadManagementProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const tSports = useTranslations("Sports");
    const { toast } = useToast();
    const router = useRouter();
    const [rosterStatus, setRosterStatus] = useState<string | null>(team.roster_status || null);
    const [unlockRequested, setUnlockRequested] = useState(team.unlock_requested || false);
    const [isRequestingUnlock, setIsRequestingUnlock] = useState(false);

    const handleRequestUnlock = async () => {
        setIsRequestingUnlock(true);
        const { requestRosterUnlock } = await import("@/actions/tournaments/registration");
        const result = await requestRosterUnlock(team.id);
        setIsRequestingUnlock(false);

        if (result.success) {
            setUnlockRequested(true);
            toast({
                title: tCommon("success"),
                description: "ส่งคำขอปลดล็อกรายชื่อไปยังผู้จัดแล้ว กรุณารอการอนุมัติ"
            });
            router.refresh();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const handleRequestRosterAddition = async () => {
        setIsRequestingUnlock(true);
        const { requestRosterUnlock } = await import("@/actions/tournaments/registration");
        const result = await requestRosterUnlock(team.id);
        setIsRequestingUnlock(false);

        if (result.success) {
            setUnlockRequested(true);
            toast({
                title: tCommon("success"),
                description: "ส่งคำขอเพิ่มรายชื่อนักกีฬาแล้วและรออนุมัติปลดล็อกชั่วคราวจาก Organizer"
            });
            router.refresh();
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    const startTour = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#tour-squad-header",
                    popover: {
                        title: t("tour_squad_welcome_title"),
                        description: t("tour_squad_welcome_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-lock-roster-btn",
                    popover: {
                        title: t("tour_squad_lock_title"),
                        description: t("tour_squad_lock_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-add-player-form",
                    popover: {
                        title: t("tour_squad_add_title"),
                        description: t("tour_squad_add_desc"),
                        side: "bottom" as const,
                        align: "start" as const
                    }
                },
                {
                    element: "#tour-squad-list",
                    popover: {
                        title: t("tour_squad_list_title"),
                        description: t("tour_squad_list_desc"),
                        side: "top" as const,
                        align: "start" as const
                    }
                },
                ...(document.getElementById("tour-edit-team-form") ? [{
                    element: "#tour-edit-team-form",
                    popover: {
                        title: t("tour_squad_edit_title"),
                        description: t("tour_squad_edit_desc"),
                        side: "left" as const,
                        align: "start" as const
                    }
                }] : [])
            ]
        });
        driverObj.drive();
    }, [t]);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem("has_seen_squad_tour");
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                startTour();
                localStorage.setItem("has_seen_squad_tour", "true");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour]);

    const [players, setPlayers] = useState<Player[]>(initialPlayers);

    const refreshPlayers = useCallback(async () => {
        const { getPlayers } = await import("@/actions/manager/team");
        const res = await getPlayers(team.id);
        if (res.success && res.data) setPlayers(res.data);
    }, [team.id]);

    // Team Edit State
    const [teamName, setTeamName] = useState(team.name);

    // Import Roster State
    const [isImporting, setIsImporting] = useState(false);
    const [mobileTab, setMobileTab] = useState<'roster' | 'team'>('roster');

    // Synergy State
    const [isLocked, setIsLocked] = useState(team.is_roster_locked || false);
    const [isLocking, setIsLocking] = useState(false);

    // Deadline check
    const documentDeadline = team.tournament?.document_deadline;
    const isDeadlinePassed = documentDeadline ? new Date() > new Date(documentDeadline) : false;
    const effectivelyLocked = isLocked || isDeadlinePassed;

    // Delete confirmation state
    const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);



    const handleImportRoster = useCallback(async (sourceId: string) => {
        setIsImporting(true);
        const result = await importRoster(team.id, sourceId);
        setIsImporting(false);

        if (result.success) {
            toast({
                title: tCommon("success"),
                description: "Roster automatically imported from My Team"
            });
            // Refresh players list
            const res = await getPlayers(team.id);
            if (res.success && res.data) setPlayers(res.data);
        }
    }, [team.id, toast, tCommon]);

    // Auto-import roster if participation is empty and has linked team
    useEffect(() => {
        if (team.isParticipation && players.length === 0 && team.team_id && !isImporting) {
            handleImportRoster(team.team_id);
        }
    }, [team.isParticipation, team.team_id, players.length, isImporting, handleImportRoster]);

    const handleToggleLock = async () => {
        setIsLocking(true);
        const result = await toggleRosterLock(team.id, !isLocked);
        setIsLocking(false);

        if (result.success) {
            setIsLocked(!isLocked);
            toast({
                title: tCommon("success"),
                description: !isLocked ? "Roster locked. Only Organizer can unlock now." : "Roster unlocked."
            });
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };


    const confirmDeletePlayer = async () => {
        if (!playerToDelete) return;
        const playerId = playerToDelete;
        setPlayerToDelete(null);

        const result = await deletePlayer(playerId, team.id);
        if (result.success) {
            toast({ title: tCommon("success"), description: t("deleted_success") });
            setPlayers(players.filter(p => p.id !== playerId));
        } else {
            toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-2 md:space-y-4">
            {/* Top Navigation & Action Bar */}
            <div className="flex md:items-start justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                        <Link href="/dashboard/teams">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 md:gap-4" id="tour-squad-header">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                                {teamName}
                            </h1>
                            <div className="flex items-center gap-2 md:gap-3">
                                <Badge variant="default" className="text-[10px] font-black tracking-wider rounded-full px-2">
                                    {tSports(team.sport)}
                                </Badge>
                                <span className="text-[10px] font-black tracking-wider text-primary/60">
                                    {players.length} {tCommon("players") || "Players"}
                                </span>
                                {isLocked && (
                                    <div>
                                        <Badge variant="destructive" className="text-[10px] font-black tracking-wider">
                                            <Lock className="h-3 w-3 mr-1.5" />
                                            {tCommon("secured")}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={startTour} 
                            className="flex items-center gap-1.5 h-8 text-xs font-bold border-dashed border-primary hover:bg-primary/5 transition-all cursor-pointer"
                        >
                            <HelpCircle className="h-3.5 w-3.5" />
                            {t("tour_button")}
                        </Button>
                    </div>
                </div>
                <div className="flex items-start gap-2" id="tour-lock-roster-btn">
                    <AddPlayersDialog 
                        teamId={team.id} 
                        onSuccess={refreshPlayers} 
                        effectivelyLocked={effectivelyLocked} 
                    />
                    <Button
                        variant={effectivelyLocked ? "outline" : "warning"}
                        onClick={effectivelyLocked ? (isDeadlinePassed ? handleRequestUnlock : handleToggleLock) : handleToggleLock}
                        disabled={isLocking || isRequestingUnlock || (effectivelyLocked && isDeadlinePassed && unlockRequested)}
                        title={effectivelyLocked ? (isDeadlinePassed && unlockRequested ? "กำลังรอการปลดล็อก" : t("unlock_roster")) : t("submit_lock")}
                    >
                        {isLocking || isRequestingUnlock ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : effectivelyLocked ? (
                            <Unlock className="h-4 w-4" />
                        ) : (
                            <Lock className="h-4 w-4" />
                        )}
                        <span className="hidden md:inline">
                            {effectivelyLocked ? (isDeadlinePassed && unlockRequested ? "รออนุมัติปลดล็อก" : t("unlock_roster")) : t("submit_lock")}
                        </span>
                    </Button>
                </div>
            </div>

            {isDeadlinePassed && (
                <div className="bg-destructive/10 border border-destructive p-4 flex items-start gap-3 text-destructive animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm tracking-tight">{t("deadline_passed")}</h4>
                        <p className="text-xs opacity-90">
                            {t("deadline_locked_desc", { date: new Date(documentDeadline!).toLocaleString() })}
                        </p>
                    </div>
                </div>
            )}

            {unlockRequested && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-amber-600 rounded-lg animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-bold">ส่งคำขอปลดล็อกข้อมูลและรายชื่อแล้ว กำลังรอการอนุมัติจาก Organizer</p>
                    </div>
                </div>
            )}

            {rosterStatus === 'pending' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-amber-600 rounded-lg animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-bold">ส่งรายชื่อนักกีฬาแล้วและกำลังรอการตรวจสอบ/อนุมัติจาก Organizer</p>
                    </div>
                </div>
            )}

            {rosterStatus === 'approved' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between gap-3 text-emerald-600 rounded-lg animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p className="text-xs font-bold">รายชื่อนักกีฬาได้รับการอนุมัติเรียบร้อยแล้ว</p>
                    </div>
                    {team.isParticipation && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={isDeadlinePassed ? handleRequestRosterAddition : async () => {
                                setIsLocking(true);
                                const { toggleRosterLock } = await import("@/actions/manager/team");
                                const result = await toggleRosterLock(team.id, false);
                                setIsLocking(false);
                                if (result.success) {
                                    setIsLocked(false);
                                    toast({ title: tCommon("success"), description: "ปลดล็อกรายชื่อแล้ว" });
                                    router.refresh();
                                } else {
                                    toast({ title: tCommon("error"), description: result.error, variant: "destructive" });
                                }
                            }}
                            disabled={isRequestingUnlock || isLocking || (isDeadlinePassed && unlockRequested)}
                            className="h-8 text-xs border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                        >
                            {isRequestingUnlock || isLocking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {isDeadlinePassed ? (unlockRequested ? "รออนุมัติปลดล็อก" : "ขอส่งรายชื่อเพิ่ม") : "แก้ไขรายชื่อ"}
                        </Button>
                    )}
                </div>
            )}

            {rosterStatus === 'rejected' && (
                <div className="bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3 text-destructive rounded-lg animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-bold">รายชื่อนักกีฬาถูกปฏิเสธกรุณาตรวจสอบและแก้ไขส่งใหม่</p>
                    </div>
                </div>
            )}

            {/* Custom Mobile Tab Switcher */}
            <div className="lg:hidden">
                <Tab
                    value={mobileTab}
                    onChange={(val) => setMobileTab(val as 'roster' | 'team')}
                    className="w-full bg-card"
                    fullWidth={true}
                    options={[
                        { label: tCommon("players"), value: 'roster', icon: Users },
                        { label: tCommon("team"), value: 'team', icon: LayoutGrid }
                    ]}
                />
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className={cn(
                    "flex-1 w-full min-w-0 space-y-2 md:space-y-4",
                    mobileTab !== 'roster' && "hidden lg:block"
                )}>
                    <div id="tour-add-player-form">
                        <AddPlayerForm
                            teamId={team.id}
                            onSuccess={refreshPlayers}
                            effectivelyLocked={effectivelyLocked}
                        />
                    </div>
                    <div id="tour-squad-list">
                        <SquadList
                            players={players}
                            team={team}
                            effectivelyLocked={effectivelyLocked}
                            refreshPlayers={refreshPlayers}
                            onDeletePlayer={setPlayerToDelete}
                            t={t}
                            tCommon={tCommon}
                        />
                    </div>
                </div>

                <div className={cn(
                    "w-full lg:w-[380px] shrink-0 space-y-6 lg:sticky lg:top-6",
                    mobileTab !== 'team' && "hidden lg:block"
                )}>
                    <div id="tour-edit-team-form">
                        <EditTeamForm
                            team={team}
                            onNameChange={setTeamName}
                            isLocked={effectivelyLocked}
                        />
                    </div>
                </div>
            </div>

            <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                <AlertDialogContent className="bg-card border rounded-xl shadow-2xl max-w-md p-0">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl p-2 md:p-4 mb-0 border-b font-black tracking-tighter leading-none flex items-center">
                            {t("remove_player") || "Remove Player"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="p-2 md:p-4 text-sm font-medium text-muted-foreground/80">
                            {t("delete_confirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="p-2 md:p-4 border-t grid grid-cols-2 gap-1 md:gap-2">
                        <AlertDialogCancel className="mt-0">
                            {tCommon("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDeletePlayer();
                            }}
                            className="bg-destructive hover:bg-destructive/90 transition-all flex items-center justify-center"
                        >
                            <Trash2 className="h-4 w-4" />
                            {tCommon("delete") || "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
